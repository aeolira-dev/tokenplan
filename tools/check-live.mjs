#!/usr/bin/env node
// 端到端校验线上站点：页面可达性、站内链接、锚点、以及与本地内容是否逐字节一致。
//
// 与 verify-manifest.mjs 的分工：
//   verify-manifest.mjs  查「部署清单里的哈希对不对」——能在浏览器访问前发现 manifest 错误
//   check-live.mjs       查「真实 HTTP 访问是否正常」——页面、链接、锚点、内容一致性
//   两个都跑过，才算这次上线是干净的。
//
// 用法：
//   node tools/check-live.mjs                       默认校验自定义域名
//   node tools/check-live.mjs --host <host>         校验指定主机
//   node tools/check-live.mjs --local               校验本地 site/（不联网，只查链接与锚点）
//
// 退出码：0 全部通过；1 有失败项。

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE_DIR = path.join(ROOT, 'site');
const args = process.argv.slice(2);
const localOnly = args.includes('--local');
const hostArg = args.indexOf('--host');
const HOST = hostArg >= 0 ? args[hostArg + 1] : 'tokenplan.040215390.xyz';
const BASE = localOnly ? null : `https://${HOST}`;

const pages = fs.readdirSync(SITE_DIR).filter((f) => f.endsWith('.html')).sort();
const exists = (f) => fs.existsSync(path.join(SITE_DIR, f));
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const B = (n) => `${(n / 1024).toFixed(1)} KB`;

const fail = [];
const warn = [];
let checks = 0;

// ---- 1. 站内链接与锚点 ----
const anchorsOf = (html) => new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
const linksOf = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

function checkLinks() {
  console.log('\n[1/3] 站内链接与锚点');
  let bad = 0;
  for (const page of pages) {
    const html = fs.readFileSync(path.join(SITE_DIR, page), 'utf8');
    for (const href of linksOf(html)) {
      if (/^(https?:|mailto:|data:|javascript:)/.test(href)) continue; // 外链单独看
      checks++;
      const [file, frag] = href.split('#');
      const target = file || page;
      if (!exists(target)) {
        fail.push(`${page} → ${href}（页面不存在）`);
        bad++;
        continue;
      }
      if (frag && !anchorsOf(fs.readFileSync(path.join(SITE_DIR, target), 'utf8')).has(frag)) {
        fail.push(`${page} → ${href}（锚点 #${frag} 不存在）`);
        bad++;
      }
    }
  }
  console.log(`  页面 ${pages.length} 个 · 站内链接 ${checks} 条 · 问题 ${bad} 条`);
}

// ---- 2. 外部链接格式检查（只查格式，不联网避免超时）----
function checkExternal() {
  console.log('\n[2/3] 外部链接格式');
  const urls = new Set();
  for (const page of pages) {
    for (const href of linksOf(fs.readFileSync(path.join(SITE_DIR, page), 'utf8'))) {
      if (/^https?:/.test(href)) urls.add(href);
    }
  }
  let bad = 0;
  for (const u of urls) {
    checks++;
    try {
      new URL(u);
    } catch {
      fail.push(`非法外链 URL：${u}`);
      bad++;
    }
  }
  console.log(`  外链 ${urls.size} 条 · 格式问题 ${bad} 条（仅查格式，未联网）`);
}

// ---- 3. 线上可达性与内容一致性 ----
async function checkLive() {
  if (localOnly) {
    console.log('\n[3/3] 线上校验：已用 --local 跳过');
    return;
  }
  console.log(`\n[3/3] 线上校验 · ${HOST}`);
  // Cloudflare 对中国大陆出口可能拦截，走外部读取服务更稳；直连优先
  let reachable = 0;
  for (const page of pages) {
    checks++;
    const local = fs.readFileSync(path.join(SITE_DIR, page));
    let res;
    try {
      res = await fetch(`${BASE}/${page}`, { redirect: 'follow' });
    } catch (err) {
      fail.push(`${page} 请求失败：${err.message}`);
      continue;
    }
    if (res.status !== 200) {
      fail.push(`${page} HTTP ${res.status}`);
      continue;
    }
    reachable++;
    const live = Buffer.from(await res.arrayBuffer());
    if (sha(live) !== sha(local)) {
      fail.push(`${page} 内容与本地不一致（本地 ${B(local.length)} / 线上 ${B(live.length)}）`);
    }
  }
  console.log(`  ${HOST} 可达 ${reachable}/${pages.length} · 内容一致 ${reachable - fail.filter((f) => f.includes('不一致')).length}/${pages.length}`);

  // 目录页必须是入口且标题正确
  checks++;
  try {
    const r = await fetch(`${BASE}/`, { redirect: 'follow' });
    const t = await r.text();
    const m = t.match(/<title>([^<]*)<\/title>/);
    if (r.status === 200 && m) console.log(`  首页：HTTP ${r.status} · 标题「${m[1]}」`);
    else fail.push(`首页异常：HTTP ${r.status}`);
  } catch (err) {
    fail.push(`首页请求失败：${err.message}`);
  }
}

// ---- 汇总 ----
checkLinks();
checkExternal();
await checkLive();

console.log(`\n===== 共 ${checks} 项检查 · 失败 ${fail.length} · 警告 ${warn.length} =====`);
if (fail.length) {
  for (const f of fail) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log(localOnly ? '本地站点结构检查通过 ✓' : `${HOST} 线上校验通过 ✓（页面可达且与本地逐字节一致）`);
