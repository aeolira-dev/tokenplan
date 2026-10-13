#!/usr/bin/env node
// 把 site/ 下的静态页面部署到 Cloudflare Pages 项目，并核对线上内容与本地一致。
//
// 用法：
//   node tools/deploy-pages.mjs            仅构建清单并打印将要部署的文件
//   node tools/deploy-pages.mjs --deploy   真正部署，并在完成后逐文件校验哈希
//   node tools/deploy-pages.mjs --deploy --verify-only   不部署，只校验线上与本地
//
// 说明：
// - 凭据取本机 Wrangler 登录留下的 OAuth 令牌（%APPDATA%\xdg.config\.wrangler\config\default.toml），
//   脚本只读取，不打印令牌本身。access token 过期时自动用 refresh token 续期。
// - 该 OAuth 授权含 pages:write，但不含 dns:write，因此自定义域名由 Worker 承接（见 --ensure-domain）。
// - 部署是幂等的：内容不变时上传会命中去重，仍会生成一次部署记录。
//
// ⚠️ manifest 哈希必须用 BLAKE3：
//   Cloudflare Pages 的部署 manifest 要求 blake3(base64(内容) + 扩展名).slice(0,32)，
//   与 wrangler 的 hashFile（wrangler-dist/cli.js:162742）一致。若误用 sha256，
//   部署 API 仍返回 success，但线上整体返回 HTTP 500 —— 曾于 2026-10-13 实际发生并回滚。
//   因此这里从 vendor/blake3-wasm 加载真实 BLAKE3；缺失时直接报错退出，绝不降级为 sha256。

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { getAccessToken } from './lib/cloudflare-auth.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE_DIR = path.join(ROOT, 'site');
const BLAKE3_DIR = path.join(ROOT, 'vendor', 'blake3-wasm');
const PROJECT = process.env.PAGES_PROJECT || 'tokenplan';
const WORKER_NAME = process.env.PAGES_WORKER || 'tokenplan-site';
const DOMAIN = process.env.PAGES_DOMAIN || 'tokenplan.040215390.xyz';
const API = 'https://api.cloudflare.com/client/v4';

const args = new Set(process.argv.slice(2));
const shouldDeploy = args.has('--deploy');
const verifyOnly = args.has('--verify-only');
const ensureDomain = args.has('--ensure-domain');

// ---- Pages manifest 哈希（BLAKE3，不可替换为 sha256）----
function loadPagesHasher() {
  if (!fs.existsSync(path.join(BLAKE3_DIR, 'dist', 'index.js'))) {
    throw new Error(
      `缺少 BLAKE3 依赖：${path.relative(ROOT, BLAKE3_DIR)}\n` +
        '        Pages manifest 必须使用 BLAKE3，用 sha256 会导致部署后整站 HTTP 500。\n' +
        "        恢复方式：从任意 wrangler 安装目录复制 node_modules/blake3-wasm 到 vendor/。"
    );
  }
  const require = createRequire(import.meta.url);
  const { createHash } = require(BLAKE3_DIR);
  // 与 wrangler 的 hashFile 完全一致
  return (buf, filePath) => {
    const ext = path.extname(filePath).substring(1);
    return createHash().update(buf.toString('base64') + ext).digest('hex').slice(0, 32);
  };
}

const pagesHash = shouldDeploy || verifyOnly ? loadPagesHasher() : null;

async function api(token, method, endpoint, body) {
  const res = await fetch(API + endpoint, {
    method,
    headers: {
      authorization: 'Bearer ' + token,
      ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
      'user-agent': 'tokenplan-deploy',
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function listSiteFiles() {
  return fs
    .readdirSync(SITE_DIR)
    .filter((f) => !f.startsWith('.') && fs.statSync(path.join(SITE_DIR, f)).isFile())
    .sort();
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

async function fetchRemoteHash(url) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
  if (!res.ok) return { status: res.status, hash: null };
  const buf = Buffer.from(await res.text(), 'utf8');
  return { status: res.status, hash: sha256(buf), bytes: buf.length };
}

async function verifyAgainst(files, baseUrl, label) {
  let same = 0;
  const diffs = [];
  let networkError = null;
  for (const file of files) {
    const local = sha256(fs.readFileSync(path.join(SITE_DIR, file)));
    let remote;
    try {
      remote = await fetchRemoteHash(new URL(file, baseUrl).href);
    } catch (err) {
      networkError = err.cause?.message || err.message;
      break;
    }
    if (remote.hash === local) same++;
    else diffs.push(`${file}(本地 ${local.slice(0, 12)} / 线上 ${(remote.hash || 'HTTP ' + remote.status).slice(0, 12)})`);
  }
  if (networkError) {
    console.log(`[verify ${label}] 跳过：本机网络不可达（${networkError}）`);
    return null;
  }
  console.log(`[verify ${label}] 一致 ${same}/${files.length}${diffs.length ? ' · 差异：' + diffs.join('，') : ''}`);
  return diffs.length === 0;
}

async function ensureWorkerDomain(token, accountId, zoneId) {
  const domains = await api(token, 'GET', `/accounts/${accountId}/workers/domains`);
  const existing = (domains.json.result || []).find((d) => d.hostname === DOMAIN);
  if (existing && existing.service === WORKER_NAME && existing.enabled) {
    console.log(`[domain] ${DOMAIN} 已由 Worker ${WORKER_NAME} 承接`);
    return true;
  }
  // OAuth 授权下该端点只接受 PUT（POST 返回 10405），沿用 PUT 覆盖绑定。
  const put = await api(token, 'PUT', `/accounts/${accountId}/workers/domains`, {
    zone_id: zoneId,
    hostname: DOMAIN,
    service: WORKER_NAME,
    environment: 'production',
  });
  const ok = put.json.success === true;
  console.log(`[domain] ${DOMAIN} -> ${WORKER_NAME} · ${ok ? '绑定成功' : '失败：' + (put.json.errors || []).map((e) => e.code + ':' + e.message).join('; ')}`);
  return ok;
}

const files = listSiteFiles();
console.log(`[plan] 项目 ${PROJECT} · 待部署 ${files.length} 个文件：${files.join(', ')}`);

const token = await getAccessToken();
const accounts = await api(token, 'GET', '/accounts');
const accountId = (accounts.json.result || [])[0]?.id;
if (!accountId) throw new Error('无法读取 Cloudflare 账号，请检查 Wrangler 登录状态');
const zones = await api(token, 'GET', '/zones?per_page=50');
const zoneId = (zones.json.result || []).find((z) => DOMAIN.endsWith(z.name))?.id || null;

if (ensureDomain) {
  if (!zoneId) throw new Error(`未找到 ${DOMAIN} 所在 zone，可能是 OAuth 缺少 zone:read`);
  await ensureWorkerDomain(token, accountId, zoneId);
}

if (!verifyOnly && shouldDeploy) {
  const form = new FormData();
  const manifest = {};
  for (const file of files) {
    const buf = fs.readFileSync(path.join(SITE_DIR, file));
    // 必须与 wrangler 一致使用 BLAKE3；用 sha256 会让线上整站 500
    manifest['/' + file] = pagesHash(buf, file);
    form.set(file, new Blob([buf], { type: 'text/html; charset=utf-8' }), file);
  }
  form.set('manifest', JSON.stringify(manifest));
  form.set('branch', 'main');
  const dep = await api(token, 'POST', `/accounts/${accountId}/pages/projects/${PROJECT}/deployments`, form);
  if (dep.json.success !== true) {
    console.error('[deploy] 失败：', JSON.stringify(dep.json.errors));
    process.exit(1);
  }
  const r = dep.json.result || {};
  console.log(`[deploy] 完成 · id=${r.id} · url=${r.url} · env=${r.environment}`);

  // 轮询部署阶段，等待生效
  for (let i = 0; i < 20; i++) {
    await new Promise((res) => setTimeout(res, 3000));
    const list = await api(token, 'GET', `/accounts/${accountId}/pages/projects/${PROJECT}/deployments?per_page=1`);
    const latest = (list.json.result || [])[0];
    const stage = latest?.latest_stage;
    if (stage && /success|failure/.test(stage.status)) {
      console.log(`[deploy] ${stage.name}:${stage.status}`);
      if (stage.status === 'failure') process.exit(1);
      break;
    }
  }
}

const pagesOk = await verifyAgainst(files, `https://${PROJECT}.pages.dev/`, 'pages.dev');
const domainOk = await verifyAgainst(files, `https://${DOMAIN}/`, DOMAIN);
if (domainOk === false) {
  console.log('[hint] 自定义域名若本机不可达，可从外部主机复核；本机对该主机名可能被本地分流规则重置。');
}
process.exit(pagesOk === false ? 1 : 0);
