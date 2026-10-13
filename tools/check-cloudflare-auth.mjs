#!/usr/bin/env node
// 检查/续期 Cloudflare 授权令牌，不打印令牌内容。
// 用途：诊断「令牌是否还能自动续期」，以及在缓存丢失时用 Wrangler 全局配置里的 refresh token 兜底。
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(ROOT, '.cloudflare-auth.json');
const CLIENT_ID = '54d11594-84e4-41aa-b438-e81b8fa78ee7';

const tomlPath = path.join(process.env.APPDATA || os.homedir(), 'xdg.config', '.wrangler', 'config', 'default.toml');
const toml = fs.existsSync(tomlPath) ? fs.readFileSync(tomlPath, 'utf8') : '';
const grab = (k) => (toml.match(new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]+)"?`, 'm')) || [])[1] || null;

const readCache = () => {
  if (!fs.existsSync(CACHE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  } catch {
    return null;
  }
};

const cache = readCache();
const fresh = (exp) => {
  const ts = Date.parse(exp || '');
  return Number.isFinite(ts) && ts - 300000 > Date.now();
};

console.log('[cache]', cache ? `access 到期 ${cache.expiration} · refresh 长度 ${String(cache.refreshToken || '').length}` : '(不存在)');
console.log('[toml ]', `access 到期 ${grab('expiration_time')} · refresh 长度 ${String(grab('refresh_token') || '').length}`);

async function tryRefresh(token, label) {
  if (!token) {
    console.log(`[${label}] 无 refresh token`);
    return null;
  }
  const res = await fetch('https://dash.cloudflare.com/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token, client_id: CLIENT_ID }),
    signal: AbortSignal.timeout(30000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    console.log(`[${label}] 失败：${json.error_description || json.error || 'HTTP ' + res.status}`);
    return null;
  }
  const rec = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || token,
    expiration: new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString(),
    scopes: json.scope || null,
    refreshedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CACHE, JSON.stringify(rec, null, 2), { mode: 0o600 });
  console.log(`[${label}] 成功 · 新到期 ${rec.expiration} · refresh 长度 ${String(rec.refreshToken).length}`);
  return rec;
}

if (cache?.accessToken && fresh(cache.expiration)) {
  console.log('[result] 缓存中的 access token 仍然有效，无需续期');
} else {
  const rec = (await tryRefresh(cache?.refreshToken, 'cache')) || (await tryRefresh(grab('refresh_token'), 'toml'));
  console.log(rec ? '[result] 令牌可用（已写入缓存）' : '[result] 无法续期，需要重新 wrangler login');
  if (!rec) process.exit(1);
}

const final = readCache();
const me = await fetch('https://api.cloudflare.com/client/v4/user', {
  headers: { authorization: 'Bearer ' + final.accessToken, 'user-agent': 'probe' },
});
const u = await me.json().catch(() => ({}));
console.log('[verify] API 调用', me.status, me.status === 200 ? u.result?.email : JSON.stringify(u.errors));
