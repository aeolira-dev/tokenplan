#!/usr/bin/env node
// 校验 Cloudflare Pages 的部署 manifest 与本地 site/ 是否一致。
//
// 为什么需要它：Pages 的 manifest 要求 BLAKE3 哈希，而部署 API 即使收到错误的哈希
// 也会返回 success，随后整站 HTTP 500。本工具能在不访问浏览器的情况下提前发现这类错误。
//
// 用法：
//   node tools/verify-manifest.mjs                     取当前生产部署的 manifest 与本地比对
//   node tools/verify-manifest.mjs <manifest.json>     比对指定的 manifest 快照
//   node tools/verify-manifest.mjs --vectors           只跑哈希算法回归向量
//
// 退出码：0 全部一致；1 有不一致；2 环境问题（缺依赖/凭据）。

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { getAccessToken } from './lib/cloudflare-auth.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE_DIR = path.join(ROOT, 'site');
const BLAKE3_DIR = path.join(ROOT, 'vendor', 'blake3-wasm');
const API = 'https://api.cloudflare.com/client/v4';
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || '652a9c243095d91b982ff5f4a97185a6';
const PROJECT = process.env.PAGES_PROJECT || 'tokenplan';

const args = process.argv.slice(2);
const vectorsOnly = args.includes('--vectors');
const snapshot = args.find((a) => !a.startsWith('--'));

// ---- BLAKE3（不可用 sha256 替代）----
if (!fs.existsSync(path.join(BLAKE3_DIR, 'dist', 'index.js'))) {
  console.error(`[error] 缺少 BLAKE3 依赖：${path.relative(ROOT, BLAKE3_DIR)}`);
  console.error('        Pages manifest 必须用 BLAKE3，sha256 会导致线上 HTTP 500。');
  process.exit(2);
}
const require = createRequire(import.meta.url);
const { createHash } = require(BLAKE3_DIR);

// 与 wrangler 的 hashFile（wrangler-dist/cli.js:162742）完全一致
const pagesHash = (buf, filePath) => {
  const ext = path.extname(filePath).substring(1);
  return createHash().update(buf.toString('base64') + ext).digest('hex').slice(0, 32);
};

// ---- 回归向量：确认算法没被改动 ----
function checkVectors() {
  const file = path.join(ROOT, 'tools', 'fixtures', 'pages-hash-vectors.json');
  if (!fs.existsSync(file)) {
    console.log('[vectors] 跳过（未找到 fixtures/pages-hash-vectors.json）');
    return true;
  }
  const { vectors } = JSON.parse(fs.readFileSync(file, 'utf8'));
  let ok = 0;
  const bad = [];
  for (const v of vectors) {
    const got = createHash().update(Buffer.from(v.content, 'utf8').toString('base64') + v.ext).digest('hex').slice(0, 32);
    if (got === v.hash) ok++;
    else bad.push(`${v.name}（期望 ${v.hash} / 实得 ${got}）`);
  }
  console.log(`[vectors] 哈希算法回归 一致 ${ok}/${vectors.length}${bad.length ? ' · 失败：' + bad.join('，') : ''}`);
  return bad.length === 0;
}

const vectorsOk = checkVectors();
if (vectorsOnly) process.exit(vectorsOk ? 0 : 1);

// ---- 取 manifest ----
async function loadLiveManifest() {
  // 用共享模块读取令牌：过期会自动续期。
  // 此前这里直接读缓存的 accessToken，令牌一过期就让整条发布流程中断（2026-10-13 实际发生）。
  let token;
  try {
    token = await getAccessToken();
  } catch (err) {
    console.error('[error] 无法获取 Cloudflare 凭据：', err.message);
    console.error('        诊断：node tools/check-cloudflare-auth.mjs');
    console.error('        修复：重新执行 wrangler login，或设置 CLOUDFLARE_API_TOKEN 环境变量（推荐，不会几小时就过期）。');
    process.exit(2);
  }
  const res = await fetch(`${API}/accounts/${ACCOUNT}/pages/projects/${PROJECT}`, {
    headers: { authorization: 'Bearer ' + token, 'user-agent': 'verify-manifest' },
  });
  const proj = await res.json();
  // canonical_deployment 是对象（不一定带 files），因此再取一次部署详情
  const cd = proj?.result?.canonical_deployment;
  const id = typeof cd === 'string' ? cd : cd?.id;
  if (!id) {
    console.error('[error] 无法取到当前生产部署 id：', JSON.stringify(proj.errors || proj.messages));
    process.exit(2);
  }
  const dres = await fetch(`${API}/accounts/${ACCOUNT}/pages/projects/${PROJECT}/deployments/${id}`, {
    headers: { authorization: 'Bearer ' + token, 'user-agent': 'verify-manifest' },
  });
  const dep = await dres.json();
  console.log(`[deploy] 当前生产部署 ${id.slice(0, 8)} · files=${Object.keys(dep.result?.files || {}).length}`);
  return dep.result?.files || {};
}

const manifest = snapshot ? JSON.parse(fs.readFileSync(path.resolve(ROOT, snapshot), 'utf8')) : await loadLiveManifest();

// ---- 比对 ----
let ok = 0;
const bad = [];
const missing = [];
for (const [manifestPath, storedHash] of Object.entries(manifest)) {
  const local = path.join(SITE_DIR, manifestPath.replace(/^\//, ''));
  if (!fs.existsSync(local)) {
    missing.push(manifestPath);
    continue;
  }
  const got = pagesHash(fs.readFileSync(local), local);
  if (got === storedHash) ok++;
  else bad.push(manifestPath);
}

const total = Object.keys(manifest).length;
console.log(`[manifest] 一致 ${ok}/${total}${bad.length ? ' · 不一致：' + bad.join('，') : ''}${missing.length ? ' · 本地缺失：' + missing.join('，') : ''}`);
if (bad.length === 0 && missing.length === 0) console.log('[result] 线上与本地内容一致 ✓');
else console.log('[result] 存在差异：请重新执行 node tools/deploy-pages.mjs --deploy');

process.exit(bad.length === 0 && missing.length === 0 && vectorsOk ? 0 : 1);
