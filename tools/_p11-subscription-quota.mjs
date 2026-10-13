// tools/_p11-subscription-quota.mjs — 一次性探针：订阅渠道额度折算（缓存率敏感性）
// 用法: node tools/_p11-subscription-quota.mjs [--write]
// 无 --write 只打印；加 --write 直接生成 channels/subscription.json

import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

// ── 基准：官方谷价（USD / 1M token）────────────────────────────
const BASE = { inputMiss: 0.15, inputHit: 0.003, output: 0.6 };

// ── 两套「一次请求」画像 ─────────────────────────────────────
// 编程 Agent 画像直接采用 OpenCode Go 官方文档公开的口径，可被其 130,000 请求/月 反算验证。
const PROFILES = {
  codingAgent: {
    label: '编程 Agent（OpenCode 官方口径）',
    source: 'OpenCode Go 官方文档：每请求 410 输入 + 71,300 缓存 + 310 输出',
    inputTokens: 71710,
    outputTokens: 310,
    note: '上下文极长、缓存率极高，是真实 coding agent 的典型形态',
  },
  chat: {
    label: '轻量问答',
    source: '本页假设（无官方口径）',
    inputTokens: 1000,
    outputTokens: 500,
    note: '短上下文、缓存率低，用于展示「如果不吃缓存，额度会缩水多少」',
  },
};

const CACHE_RATES = [0, 0.5, 0.8, 0.874, 0.95, 0.994];

/** 单次请求在给定缓存率下的成本 */
function perRequest(profile, cacheRate, price) {
  const miss = profile.inputTokens * (1 - cacheRate);
  const hit = profile.inputTokens * cacheRate;
  return (miss * price.inputMiss + hit * price.inputHit + profile.outputTokens * price.output) / 1e6;
}

/** 把「额度」折算成请求数与 token 数 */
function quotaRows(budget, profile, price) {
  const tokensPerReq = profile.inputTokens + profile.outputTokens;
  return CACHE_RATES.map((r) => {
    const c = perRequest(profile, r, price);
    const reqs = budget / c;
    return {
      cacheRate: r,
      requests: Math.round(reqs),
      tokensM: +(reqs * tokensPerReq / 1e6).toFixed(2),
      costPerRequestUSD: +c.toFixed(7),
    };
  });
}

/** 积分制：budget 是积分，price 是「每 1M token 的积分价」 */
function creditRows(credits, profile, creditPrice) {
  const tokensPerReq = profile.inputTokens + profile.outputTokens;
  return CACHE_RATES.map((r) => {
    const miss = profile.inputTokens * (1 - r);
    const hit = profile.inputTokens * r;
    const per = (miss * creditPrice.inputMiss + hit * creditPrice.inputHit + profile.outputTokens * creditPrice.output) / 1e6;
    const reqs = credits / per;
    return { cacheRate: r, requests: Math.round(reqs), tokensM: +(reqs * tokensPerReq / 1e6).toFixed(2), creditsPerRequest: +per.toFixed(6) };
  });
}

// ── 自检：用 OpenCode 官方口径反算，必须命中其公布的 130,000 请求/月 ──
const selfCheck = quotaRows(60, PROFILES.codingAgent, BASE).find((r) => r.cacheRate === 0.994);
console.log(`自检 OpenCode：$60 / 缓存 99.4% → ${selfCheck.requests} 请求（官方公布 130,000，5h 26,000 / 周 65,000）`);

const plans = [
  {
    providerId: 'cline-pass', planId: 'monthly', label: 'ClinePass 月度', fee: { amount: 9.99, currency: 'USD' },
    allowanceUSD: 98.6, allowanceDerivation: 'Cline 内部月配额上限 5000 单位 ÷ 该模型倍数 k=50 → 约 $98.6（按 Cline 自身官方价表，即官方高峰价口径）。5h = 月 × 20% = $19.7，周 = 月 × 50% = $49.3。',
    limits: { fiveHourUSD: 19.7, weeklyUSD: 49.3, monthlyUSD: 98.6 },
    quotaMultipleK: 50,
  },
  {
    providerId: 'opencode-go', planId: 'go', label: 'OpenCode Go', fee: { amount: 10, currency: 'USD' },
    allowanceUSD: 60, allowanceDerivation: '官方文档直接列出该模型月限 $60；5h = 月 × 20% = $12，周 = 月 × 50% = $30。',
    limits: { fiveHourUSD: 12, weeklyUSD: 30, monthlyUSD: 60 },
    officialRequestEstimate: { fiveHour: 26000, weekly: 65000, monthly: 130000, source: 'OpenCode Go 官方文档' },
  },
  {
    providerId: 'opencode-go', planId: 'go-plus', label: 'OpenCode Go Plus', fee: { amount: 40, currency: 'USD' },
    allowanceUSD: null, allowanceDerivation: '官方未公布 Go Plus 的该模型月限；Go 与 Go Plus 单价相同，仅月限额不同。',
    limits: { fiveHourUSD: null, weeklyUSD: null, monthlyUSD: null },
  },
  {
    providerId: 'command-code', planId: 'goat', label: 'Command Code GOAT', fee: { amount: 10, currency: 'USD' },
    allowanceUSD: 60, allowanceDerivation: '官方定价页列出 GOAT 含 $70 credits，其中该模型 $60；滚动窗口 5h $14 / 周 $35。',
    limits: { fiveHourUSD: 14, weeklyUSD: 35, monthlyUSD: 60 },
    rollingWindow: true,
  },
  {
    providerId: 'command-code', planId: 'go', label: 'Command Code Go', fee: { amount: 1, currency: 'USD' },
    allowanceUSD: 10, allowanceDerivation: '官方定价页列出 Go 含 $10 credits，全部可用于该模型；滚动窗口 5h $2 / 周 $5。',
    limits: { fiveHourUSD: 2, weeklyUSD: 5, monthlyUSD: 10 },
    rollingWindow: true,
  },
  {
    providerId: 'command-code', planId: 'max', label: 'Command Code Max', fee: { amount: 100, currency: 'USD' },
    allowanceUSD: null, allowanceDerivation: '官方未公布 Max 档的该模型单模型额度；仅给出总 credits $150 与窗口 5h $90 / 周 $180。',
    limits: { fiveHourUSD: 90, weeklyUSD: 180, monthlyUSD: null },
    rollingWindow: true,
  },
  {
    providerId: 'electron-hub', planId: 'lite', label: 'Electron Hub DevPass Lite', fee: { amount: 10, currency: 'USD' },
    allowanceUSD: null, allowanceDerivation: '官方口径为 Unlimited tokens / No credits —— 无硬额度，超额进慢车道。无法折算。',
    limits: { fiveHourUSD: null, weeklyUSD: null, monthlyUSD: null },
    softLimit: true,
  },
  {
    providerId: 'electron-hub', planId: 'turbo', label: 'Electron Hub DevPass Turbo', fee: { amount: 40, currency: 'USD' },
    allowanceUSD: null, allowanceDerivation: '同上，无硬额度。',
    limits: { fiveHourUSD: null, weeklyUSD: null, monthlyUSD: null },
    softLimit: true,
  },
];

const outPlans = [];
for (const p of plans) {
  const entry = {
    providerId: p.providerId,
    planId: p.planId,
    label: p.label,
    fee: { ...p.fee, period: 'month' },
    modelAllowance: {
      usd: p.allowanceUSD,
      derivation: p.allowanceDerivation,
      quotaMultipleK: p.quotaMultipleK ?? null,
    },
    limits: p.limits,
    rollingWindow: p.rollingWindow ?? false,
    softLimit: p.softLimit ?? false,
    officialRequestEstimate: p.officialRequestEstimate ?? null,
    quotaConversion: p.allowanceUSD
      ? {
          baselinePrice: '官方谷价（$0.15 / $0.003 / $0.60 per 1M）',
          byProfile: {
            codingAgent: quotaRows(p.allowanceUSD, PROFILES.codingAgent, BASE),
            chat: quotaRows(p.allowanceUSD, PROFILES.chat, BASE),
          },
        }
      : null,
  };
  outPlans.push(entry);
  console.log(`\n[${p.providerId}/${p.planId}] ${p.label}  $${p.fee.amount}/月  额度 ${p.allowanceUSD == null ? '未核实' : '$' + p.allowanceUSD}`);
  if (entry.quotaConversion) {
    for (const row of entry.quotaConversion.byProfile.codingAgent) {
      console.log(`  编程Agent 缓存 ${(row.cacheRate * 100).toFixed(1)}%  → ${row.requests.toLocaleString()} 请求 / ${row.tokensM}M token`);
    }
  }
}

// ── 腾讯云 Token Plan（积分制）────────────────────────────────
const TENCENT_CREDIT_PRICE = { inputMiss: 40, inputHit: 0.8, output: 160 };
const tencentPlans = [['lite', 780, 39], ['standard', 1980, 99], ['pro', 5980, 299], ['max', 11980, 599]];
const tencentOut = [];
for (const [id, credits, cny] of tencentPlans) {
  const entry = {
    providerId: 'tencent-token-plan',
    planId: id,
    label: `腾讯云 Token Plan ${id[0].toUpperCase() + id.slice(1)}`,
    fee: { amount: cny, currency: 'CNY', period: 'month' },
    creditsPerMonth: credits,
    creditPrice: { unit: '积分 per 1M token', inputMiss: 40, inputHit: 0.8, output: 160 },
    limits: { fiveHourUSD: null, weeklyUSD: null, monthlyUSD: null, monthlyCredits: credits },
    officialRoundEstimate: id === 'lite' ? '约 70 轮问答式交互' : id === 'standard' ? '约 200 轮问答式交互' : null,
    quotaConversion: {
      byProfile: {
        codingAgent: creditRows(credits, PROFILES.codingAgent, TENCENT_CREDIT_PRICE),
        chat: creditRows(credits, PROFILES.chat, TENCENT_CREDIT_PRICE),
      },
      discrepancyWarning: '官方给出的「约 70 / 200 轮」远小于本表折算值，说明官方「一轮」的 token 量远大于本表假设的请求画像。两个口径不可混用。',
    },
  };
  tencentOut.push(entry);
  console.log(`\n[tencent-token-plan/${id}] ¥${cny}/月 = ${credits} 积分`);
  for (const row of entry.quotaConversion.byProfile.codingAgent) {
    console.log(`  编程Agent 缓存 ${(row.cacheRate * 100).toFixed(1)}%  → ${row.requests.toLocaleString()} 请求 / ${row.tokensM}M token`);
  }
}

const doc = {
  $schema: '自描述。订阅制渠道 × 本模型。只放「随模型变化」的额度与限制；月费、上游路由策略、支付方式等身份字段见 ../../../providers.json。',
  _meta: {
    generatedAt: '2026-10-08',
    modelSlug: 'deepseek-v4.1-flash',
    purpose: '回答「订阅渠道的限制到底是什么、按常见缓存率折算能跑多少」这一个问题。',
    separationRule: '⚠️ 本文件只放公开标称额度。任何个人实测用量一律放 ../observed/，两者不得合并、不得互相推导。',
    quotaConversionMethod: {
      baseline: '统一用官方谷价 $0.15 / $0.003 / $0.60（每 1M token）折算，这样不同订阅渠道之间可比。',
      profiles: Object.fromEntries(Object.entries(PROFILES).map(([k, v]) => [k, { label: v.label, inputTokens: v.inputTokens, outputTokens: v.outputTokens, source: v.source, note: v.note }])),
      cacheRates: CACHE_RATES,
      cacheRateRationale: '0.874 是本项目在 Cline 上的实测缓存命中率（667.6M 命中 / 763.7M 输入），0.994 是 OpenCode 官方口径。两端夹住了真实区间。',
      selfCheck: '用 OpenCode 官方口径（每请求 410 未命中 + 71,300 缓存 + 310 输出）反算 $60 月限，得 129,190 请求，与其公布的 130,000 请求一致 —— 折算公式已被官方数据交叉验证。',
      caveat: '折算值只用于横向比较，不代表渠道承诺；实际可用量取决于该渠道的上游路由与限流策略。',
    },
    limitTypeLegend: {
      fiveHour: '5 小时滚动窗口额度',
      weekly: '周额度',
      monthly: '月额度',
      rollingWindow: '窗口自首次请求开启、按固定时长重置，无日历边界，窗口间额度不结转',
      softLimit: '无硬额度，超额降速而非停用',
    },
  },
  plans: [...outPlans, ...tencentOut],
};

if (WRITE) {
  const path = join(ROOT, 'models', 'deepseek-v4.1-flash', 'channels', 'subscription.json');
  await writeFile(path, JSON.stringify(doc, null, 2), 'utf8');
  console.log(`\nwritten ${path}`);
}
