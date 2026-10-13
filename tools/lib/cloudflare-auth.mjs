// 共享的 Cloudflare 凭据读取与自动续期。
//
// 为什么需要这个模块：Wrangler 的 OAuth 授权是「短期 access token（数小时）+ 长期 refresh token」。
// 之前只有 tools/deploy-pages.mjs 实现了自动续期，而 tools/verify-manifest.mjs 直接读缓存里的
// access token；一旦令牌过期，release.mjs 的第 4 步（校验线上 manifest）就会以
// 「无法取到当前生产部署 id：[{code:10000,message:"Authentication error"}]」失败，
// 整条发布流程中断——而实际上只需刷新令牌即可。2026-10-13 实际发生过一次。
// 现把逻辑收敛到这里，所有需要 Cloudflare 凭据的工具共用。
//
// 安全：只读取用户已有的 Wrangler 登录态；refresh 结果缓存到工作区 .cloudflare-auth.json
// （已 gitignore），绝不改写用户的全局 Wrangler 配置，也不打印令牌内容。

// 说明：两种凭据来源
//   A) CLOUDFLARE_API_TOKEN 环境变量 —— 自动化首选，不会几小时就过期（本轮新增）。
//   B) Wrangler 的 OAuth 登录态 —— access token 仅数小时有效，需用 refresh token 续期。
//
// 关于 OAuth 续期的已知坑（2026-10-13 实际踩到，两个 refresh token 同时失效）：
// Cloudflare 的 OAuth refresh token 是**一次性轮换**的——每次刷新成功，旧 refresh token 立刻作废，
// 新票只返回给调用方。wrangler 会把新票写回全局配置 ${APPDATA}/xdg.config/.wrangler/config/default.toml，
// 而本模块**刻意不改写用户的全局配置**（受文件沙箱限制，也不应擅动），于是出现分叉：
// 我们刷新后，配置里那份就成了废票；wrangler 再刷新，我们缓存里那份又作废。
// 两个存储各自轮换、互不同步，就可能一起落到「已被使用/已撤销」的状态，此时只能重新 wrangler login。
//
// 关键：invalid_grant 之后**不要**拿另一份 refresh token 重试。
// 重放同一授权族里的废票会触发 RFC 6749 / OAuth 2.0 安全最佳实践建议的「重用检测」，
// 可能把整个授权族一并吊销——反而毁掉那份本来还有效的登录态。
// 正确做法是按「谁更新」挑一份（见 pickStaleAwareSource），失败即停并提示重新登录。

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

// client_id 取自 wrangler 4.148.0 源码 wrangler-dist/cli.js:129945 的默认值（OAuth 公开标识，非机密）
const OAUTH_CLIENT_ID = process.env.CLOUDFLARE_OAUTH_CLIENT_ID || '54d11594-84e4-41aa-b438-e81b8fa78ee7';
const OAUTH_TOKEN_URL = process.env.CLOUDFLARE_OAUTH_TOKEN_URL || 'https://dash.cloudflare.com/oauth2/token';

export const CACHE_PATH = path.join(ROOT, '.cloudflare-auth.json');

export function readWranglerToml() {
  const tomlPath = path.join(process.env.APPDATA || os.homedir(), 'xdg.config', '.wrangler', 'config', 'default.toml');
  if (!fs.existsSync(tomlPath)) throw new Error(`未找到 Wrangler 配置：${tomlPath}`);
  const text = fs.readFileSync(tomlPath, 'utf8');
  const grab = (key) => {
    const m = text.match(new RegExp(`^\\s*${key}\\s*=\\s*"?([^"\\n]+)"?`, 'm'));
    return m ? m[1].trim() : null;
  };
  return {
    accessToken: grab('oauth_token'),
    expiration: grab('expiration_time'),
    refreshToken: grab('refresh_token'),
  };
}

export const isFresh = (expiration, skewMs = 5 * 60 * 1000) => {
  if (!expiration) return false;
  const ts = Date.parse(expiration);
  return Number.isFinite(ts) && ts - skewMs > Date.now();
};

// 在两个 refresh token 存储里挑一个「更可能还有效」的，只挑一个，不做失败重试。
// 依据：谁是最近一次成功刷新的产物。access token 的到期时间与刷新时刻一一对应，
// 到期时间更晚的那份就是更晚刷出来的新票，另一份（更早的）已因轮换作废。
export function pickRefreshSource(cached, creds) {
  const fromCache = cached?.refreshToken
    ? { token: cached.refreshToken, source: '工作区缓存 .cloudflare-auth.json', expiration: cached.expiration }
    : null;
  const fromToml = creds?.refreshToken
    ? { token: creds.refreshToken, source: 'Wrangler 配置 default.toml', expiration: creds.expiration }
    : null;

  if (!fromCache) return fromToml;
  if (!fromToml) return fromCache;
  if (fromCache.token === fromToml.token) return fromCache;

  const tc = Date.parse(fromCache.expiration || '');
  const tt = Date.parse(fromToml.expiration || '');
  const winner = Number.isFinite(tc) && Number.isFinite(tt) ? (tc >= tt ? fromCache : fromToml) : fromCache;
  const loser = winner === fromCache ? fromToml : fromCache;
  console.log(
    `[auth] 检测到两处 refresh token 不同步：选「${winner.source}」（到期 ${winner.expiration}），` +
      `放弃已轮换作废的「${loser.source}」（到期 ${loser.expiration}）`,
  );
  return winner;
}

function readCache() {
  if (!fs.existsSync(CACHE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return null; // 缓存损坏则忽略，走后续路径
  }
}

export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: OAUTH_CLIENT_ID,
  });
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(30000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    return { ok: false, error: json.error_description || json.error || `HTTP ${res.status}` };
  }
  const record = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || refreshToken,
    expiration: new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString(),
    scopes: json.scope || null,
    refreshedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(record, null, 2), { mode: 0o600 });
  return { ok: true, record };
}

// 返回一个当前有效的 access token。
// 优先级：CLOUDFLARE_API_TOKEN 环境变量 > 工作区缓存 > Wrangler 登录态（过期则续期）。
// 失败时抛出带中文说明的错误（调用方决定退出码）。
export async function getAccessToken() {
  // A) 环境变量里的 API Token：自动化与 CI 的正路，不存在续期问题
  const envToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
  if (envToken) {
    console.log('[auth] 使用 CLOUDFLARE_API_TOKEN 环境变量');
    return envToken;
  }

  const cached = readCache();
  if (cached?.accessToken && isFresh(cached.expiration)) {
    console.log(`[auth] 使用工作区缓存令牌，到期 ${cached.expiration}`);
    return cached.accessToken;
  }

  let creds = null;
  try {
    creds = readWranglerToml();
  } catch (err) {
    // Wrangler 配置不存在时，只要缓存里有 refresh token 仍可续期
    if (!cached?.refreshToken) throw err;
  }

  // Wrangler 配置里的 access token 仍有效时直接用它（早于任何刷新，避免无谓地消耗 refresh token）
  if (creds?.accessToken && isFresh(creds.expiration)) {
    console.log(`[auth] 使用 Wrangler 配置中的令牌，到期 ${creds.expiration}`);
    return creds.accessToken;
  }

  // 续期：用 pickRefreshSource 只挑一个更可能有效的 refresh token，失败即停（不做重放重试）。
  const picked = pickRefreshSource(cached, creds);
  if (picked) {
    const reason = creds?.expiration ? `access token 已于 ${creds.expiration} 过期` : 'access token 已过期或缺失';
    console.log(`[auth] ${reason}，尝试用 refresh token 自动续期（来源：${picked.source}）`);
    const out = await refreshAccessToken(picked.token);
    if (out.ok) {
      console.log(`[auth] 续期成功，新到期时间 ${out.record.expiration}（已缓存到 .cloudflare-auth.json）`);
      return out.record.accessToken;
    }
    throw new Error(
      `Wrangler 授权已过期且自动续期失败：${out.error}\n` +
        `该 refresh token 已失效（可能被 wrangler 或其他工具先行轮换）。两种解法，任选其一：\n` +
        `  【推荐 · 一次搞定】在 https://dash.cloudflare.com/profile/api-tokens 创建 API Token\n` +
        `    （模板选 Edit Cloudflare Workers；本项目要 pages:write，账号 ID 可用 tools/print-account.mjs 查）\n` +
        `    然后：$env:CLOUDFLARE_API_TOKEN='<令牌>'; node tools/deploy-pages.mjs\n` +
        `  【沿用 OAuth】重新执行 wrangler login，再跑 node tools/deploy-pages.mjs`,
    );
  }

  if (creds?.accessToken) {
    throw new Error(
      `Wrangler access token 已过期（${creds.expiration}）且缓存中无 refresh token，请重新执行 wrangler login，` +
        `或设置 CLOUDFLARE_API_TOKEN 环境变量。`,
    );
  }
  throw new Error('Wrangler 配置中没有 oauth_token，请先执行 wrangler login，或设置 CLOUDFLARE_API_TOKEN 环境变量。');
}
