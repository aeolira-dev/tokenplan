import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('.');
const DIR = path.join(ROOT, 'models/gpt-6.1-sol');
fs.mkdirSync(DIR, { recursive: true });
fs.mkdirSync(path.join(DIR, 'benchmarks'), { recursive: true });
fs.mkdirSync(path.join(DIR, 'channels'), { recursive: true });

// 1. model.json
const modelJson = {
  "$schema": "自描述。模型身份层。",
  "_meta": {
    "generatedAt": "2026-10-08",
    "sources": ["openai-pricing-doc", "aa-peers"]
  },
  "slug": "gpt-6.1-sol",
  "displayName": "GPT-6.1 Sol (Max)",
  "vendor": "openai",
  "vendorDisplay": "OpenAI",
  "family": "GPT-6",
  "tier": "顶级旗舰（flagship）",
  "apiModelIds": {
    "official": "gpt-6.1-sol",
    "pro": "gpt-6.1-sol-pro",
    "fast": "gpt-6.1-sol-fast"
  },
  "release": {
    "date": "2026-09-02",
    "knowledgeCutoff": "2026-05",
    "deprecated": false
  },
  "openness": {
    "openWeights": false,
    "license": "Proprietary",
    "opennessIndex": 0
  },
  "architecture": {
    "sizeClass": "frontier-multimodal-moe"
  },
  "limits": {
    "contextTokens": 1050000,
    "maxOutputTokens": 128000,
    "concurrencyLimit": 1000
  },
  "capabilities": {
    "reasoning": { "supported": true, "default": true },
    "vision": true,
    "toolCalls": true,
    "jsonOutput": true,
    "responsesApi": true,
    "webSearch": { "supported": true, "note": "Responses API 原生支持搜索插件" },
    "inputModalities": ["text", "image"],
    "outputModalities": ["text"]
  },
  "speed": {
    "outputTokensPerSecond": 112.5,
    "timeToFirstChunkSeconds": 0.98
  },
  "baseline": {
    "providerId": "openai-official",
    "currency": "USD",
    "unit": "per 1M tokens",
    "tiers": [
      {
        "id": "standard",
        "label": "标准上下文 (≤272K)",
        "usd": { "inputMiss": 2.00, "inputHit": 0.10, "output": 10.00 }
      },
      {
        "id": "extended",
        "label": "超长窗口 (>272K)",
        "usd": { "inputMiss": 4.00, "inputHit": 0.20, "output": 15.00 }
      }
    ]
  },
  "card": {
    "radar": {
      "shape": "hexagon",
      "axesCount": 6,
      "axes": [
        { "key": "financeAndAccounting", "label": "财会", "value": 53.98 },
        { "key": "strategyAndOps", "label": "战略与运营", "value": 56.98 },
        { "key": "legal", "label": "法律", "value": 57.69 },
        { "key": "healthcareAndMedical", "label": "医疗健康", "value": 51.18 },
        { "key": "engineering", "label": "工程", "value": 53.90 },
        { "key": "economics", "label": "经济", "value": 59.28 }
      ]
    }
  }
};
fs.writeFileSync(path.join(DIR, 'model.json'), JSON.stringify(modelJson, null, 2), 'utf8');

// 2. benchmarks/aa.json
const aaJson = {
  "$schema": "自描述。AA 榜单口径评测结果。",
  "_meta": {
    "generatedAt": "2026-10-08",
    "sourceRefs": ["aa-peers"]
  },
  "boards": {
    "artificialAnalysis": {
      "displayName": "Artificial Analysis",
      "indexName": "Artificial Analysis Intelligence Index",
      "indexVersion": "v4.3.2",
      "modelEntryName": "GPT-6.1 Sol (Max)",
      "intelligenceIndex": 51.8332597011541,
      "rankings": [
        { "key": "intelligence", "label": "Intelligence", "rank": 3, "of": 117, "note": "仅次于 Opus 5.5 与 Astra" },
        { "key": "speed", "label": "Speed", "rank": 11, "of": 117, "note": "112 tok/s" },
        { "key": "cost", "label": "Cost", "rank": 32, "of": 117, "note": "$0.72/任务" }
      ],
      "capabilities": {
        "financeAndAccounting": 53.9844924520062,
        "strategyAndOps": 56.9785355034937,
        "legal": 57.6948991540986,
        "healthcareAndMedical": 51.1786037255156,
        "engineering": 53.9031392342597,
        "economics": 59.2824044253939
      },
      "costProfile": {
        "price1mInputTokens": 2.00,
        "price1mOutputTokens": 10.00,
        "cacheHitPrice": 0.10,
        "price1mBlended7To2To1": 1.47,
        "costPerTaskUSD": 0.72417,
        "timePerTaskSec": 686.7
      }
    }
  }
};
fs.writeFileSync(path.join(DIR, 'benchmarks/aa.json'), JSON.stringify(aaJson, null, 2), 'utf8');

// 3. channels/api.json
const apiJson = {
  "$schema": "自描述。按量渠道列表。",
  "baseline": {
    "providerId": "openai-official",
    "label": "OpenAI 官方（基准）",
    "tiers": [
      {
        "id": "standard",
        "label": "标准窗口 (≤272K)",
        "usd": { "inputMiss": 2.00, "inputHit": 0.10, "output": 10.00 }
      },
      {
        "id": "extended",
        "label": "长上下文 (>272K)",
        "usd": { "inputMiss": 4.00, "inputHit": 0.20, "output": 15.00 }
      }
    ]
  },
  "channels": [
    {
      "providerId": "openai-official",
      "isOfficial": true,
      "displayName": "OpenAI 官方 API",
      "tiers": [
        { "id": "standard", "label": "标准按量", "usd": { "inputMiss": 2.00, "inputHit": 0.10, "output": 10.00 } },
        { "id": "extended", "label": "超长窗口", "usd": { "inputMiss": 4.00, "inputHit": 0.20, "output": 15.00 } }
      ],
      "peakValley": false,
      "limits": { "contextTokens": 1050000, "maxOutputTokens": 128000 },
      "notes": ["官方基准行，原生支持自动 Prompt Caching（缓存读降至 $0.10/M）"]
    },
    {
      "providerId": "azure-openai",
      "isOfficial": true,
      "displayName": "Microsoft Azure OpenAI",
      "tiers": [
        { "id": "standard", "label": "企业标准", "usd": { "inputMiss": 2.00, "inputHit": 0.10, "output": 10.00 } },
        { "id": "extended", "label": "长窗口", "usd": { "inputMiss": 4.00, "inputHit": 0.20, "output": 15.00 } }
      ],
      "peakValley": false,
      "limits": { "contextTokens": 1050000, "maxOutputTokens": 128000 },
      "notes": ["微软云合规保障，价格与 OpenAI 官方完全一致 (1.00×)"]
    },
    {
      "providerId": "openrouter",
      "displayName": "OpenRouter",
      "tiers": [
        { "id": "standard", "label": "默认路由", "usd": { "inputMiss": 2.00, "inputHit": 0.10, "output": 10.00 } },
        { "id": "extended", "label": ">200K 阶梯", "usd": { "inputMiss": 4.00, "inputHit": 0.20, "output": 15.00 } }
      ],
      "peakValley": false,
      "limits": { "contextTokens": 1050000, "maxOutputTokens": 128000 },
      "notes": ["聚合直通 OpenAI 官方与 Azure 端点，同价 (1.00×)"]
    },
    {
      "providerId": "cloudflare-ai-gateway",
      "displayName": "Cloudflare AI Gateway",
      "tiers": [{ "id": "standard", "label": "网关直通", "usd": { "inputMiss": 2.00, "inputHit": 0.10, "output": 10.00 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1050000, "maxOutputTokens": 128000 },
      "notes": ["边缘缓存与防爆流控制，1.00×"]
    },
    {
      "providerId": "vercel-gateway",
      "displayName": "Vercel AI Gateway",
      "tiers": [
        { "id": "standard", "label": "标准通道", "usd": { "inputMiss": 2.00, "inputHit": 0.10, "output": 10.00 } },
        { "id": "fast", "label": "Fast 优先通道", "usd": { "inputMiss": 4.00, "inputHit": 0.20, "output": 20.00 } }
      ],
      "peakValley": false,
      "limits": { "contextTokens": 1050000, "maxOutputTokens": 128000 },
      "notes": ["标准档 1.00×，Fast 档为 2.00× 加急调度"]
    },
    {
      "providerId": "nano-gpt",
      "displayName": "Nano-GPT",
      "tiers": [{ "id": "standard", "label": "加密货币直付", "usd": { "inputMiss": 2.00, "inputHit": 0.10, "output": 10.00 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1050000, "maxOutputTokens": 128000 },
      "notes": ["无须信用卡绑定，1.00×"]
    },
    {
      "providerId": "aihubmix",
      "displayName": "AIHubMix",
      "tiers": [{ "id": "standard", "label": "国内中继直连", "usd": { "inputMiss": 2.05, "inputHit": 0.11, "output": 10.25 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1050000, "maxOutputTokens": 128000 },
      "notes": ["微幅溢价 2.5%"]
    }
  ]
};
fs.writeFileSync(path.join(DIR, 'channels/api.json'), JSON.stringify(apiJson, null, 2), 'utf8');

// 4. channels/subscription.json
const BASE_GPT = { inputMiss: 2.00, inputHit: 0.10, output: 10.00 };
const PROFILE_CODING = { inputTokens: 71710, outputTokens: 310 };

function calcReqs(budgetUSD, cacheRate) {
  const miss = PROFILE_CODING.inputTokens * (1 - cacheRate);
  const hit = PROFILE_CODING.inputTokens * cacheRate;
  const cost = (miss * BASE_GPT.inputMiss + hit * BASE_GPT.inputHit + PROFILE_CODING.outputTokens * BASE_GPT.output) / 1e6;
  return Math.round(budgetUSD / cost);
}

const subPlans = [
  {
    providerId: "chatgpt-plus",
    planId: "plus",
    label: "ChatGPT Plus",
    fee: { amount: 20, currency: "USD" },
    modelAllowance: { usd: 60, derivation: "每 3 小时 40-80 次旗舰调用配额，折算等效月额度" },
    limits: { fiveHourUSD: 10, weeklyUSD: 30, monthlyUSD: 60 },
    rollingWindow: true,
    softLimit: false,
    quotaConversion: { codingAgentAt874: calcReqs(60, 0.874) }
  },
  {
    providerId: "chatgpt-pro",
    planId: "pro",
    label: "ChatGPT Pro",
    fee: { amount: 200, currency: "USD" },
    modelAllowance: { usd: 800, derivation: "无限量 Sol/o系列完整思考模式访问" },
    limits: { fiveHourUSD: 160, weeklyUSD: 400, monthlyUSD: 800 },
    rollingWindow: false,
    softLimit: true,
    quotaConversion: { codingAgentAt874: calcReqs(800, 0.874) }
  },
  {
    providerId: "cline-pass",
    planId: "monthly",
    label: "ClinePass 月度",
    fee: { amount: 9.99, currency: "USD" },
    modelAllowance: { usd: 40, derivation: "旗舰模型高权重消耗" },
    limits: { fiveHourUSD: 8, weeklyUSD: 20, monthlyUSD: 40 },
    rollingWindow: false,
    softLimit: false,
    quotaConversion: { codingAgentAt874: calcReqs(40, 0.874) }
  },
  {
    providerId: "opencode-go",
    planId: "go",
    label: "OpenCode Go",
    fee: { amount: 10, currency: "USD" },
    modelAllowance: { usd: 35, derivation: "OpenCode 标准旗舰额度" },
    limits: { fiveHourUSD: 7, weeklyUSD: 17.5, monthlyUSD: 35 },
    rollingWindow: false,
    softLimit: false,
    quotaConversion: { codingAgentAt874: calcReqs(35, 0.874) }
  },
  {
    providerId: "command-code",
    planId: "goat",
    label: "Command Code GOAT",
    fee: { amount: 10, currency: "USD" },
    modelAllowance: { usd: 45, derivation: "包含 $45 GPT-6.1 Sol 额度" },
    limits: { fiveHourUSD: 9, weeklyUSD: 22.5, monthlyUSD: 45 },
    rollingWindow: true,
    softLimit: false,
    quotaConversion: { codingAgentAt874: calcReqs(45, 0.874) }
  }
];

const subJson = {
  "$schema": "自描述。订阅制渠道列表。",
  "baselinePrice": "$2.00 / $0.10 / $10.00",
  "plans": subPlans
};
fs.writeFileSync(path.join(DIR, 'channels/subscription.json'), JSON.stringify(subJson, null, 2), 'utf8');

console.log('Successfully generated models/gpt-6.1-sol/ data layer!');
