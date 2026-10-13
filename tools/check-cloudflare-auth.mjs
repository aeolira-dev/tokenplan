#!/usr/bin/env node
// 检查/续期 Cloudflare 授权令牌，不打印令牌内容。
// 用途：诊断「令牌是否还能自动续期」。
//
// 重要：不要在 invalid_grant 之后换另一份 refresh token 重试。
// Cloudflare 的 refresh token 一次性轮换，缓存与 Wrangler 全局配置会各自轮换而互不同步；
// 重放同一授权族里的废票可能触发重用检测、吊销整个授权族，反而破坏尚可用的登录态。
// 因此这里委托给共享模块：它只挑一份更可能有效的（pickRefreshSource），失败即停。
import { getAccessToken, pickRefreshSource, readWranglerToml, CACHE_PATH } from './lib/cloudflare-auth.mjs';
import fs from 'node:fs';

const fresh = (exp) => {
  const ts = Date.parse(exp || '');
  return Number.isFinite(ts) && ts - 300000 > Date.now();
};

const readCache = () => {
  if (!fs.existsSync(CACHE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return null;
  }
};

const cache = readCache();
let toml = null;
try {
  toml = readWranglerToml();
} catch {
  toml = null;
}

console.log('[cache]', cache ? `access 到期 ${cache.expiration} · refresh 长度 ${String(cache.refreshToken || '').length}` : '(不存在)');
console.log('[toml ]', toml ? `access 到期 ${toml.expiration} · refresh 长度 ${String(toml.refreshToken || '').length}` : '(不存在)');

let token = null;
try {
  token = await getAccessToken();
  console.log('[result] 令牌可用');
} catch (err) {
  console.log('[result] 无法取得令牌：', err.message.split('\n')[0]);
  console.log('[hint] 重新执行 wrangler login，或设置 CLOUDFLARE_API_TOKEN 环境变量（推荐，不会几小时就过期）。');
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    const picked = pickRefreshSource(cache, toml);
    if (picked) console.log(`[hint] 本次尝试的来源：${picked.source}（到期 ${picked.expiration}）`);
  }
  process.exit(1);
}

const me = await fetch('https://api.cloudflare.com/client/v4/user', {
  headers: { authorization: 'Bearer ' + token, 'user-agent': 'probe' },
});
const u = await me.json().catch(() => ({}));
console.log('[verify] API 调用', me.status, me.status === 200 ? u.result?.email : JSON.stringify(u.errors));
