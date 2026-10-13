import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('.');
const PRO_DIR = path.join(ROOT, 'models/deepseek-v4-pro');
const FLASH_RAW = path.join(ROOT, 'models/deepseek-v4.1-flash/raw/2026-10-08');

const keep = JSON.parse(fs.readFileSync(path.join(FLASH_RAW, '_tmp-aa-pro-keep.json'), 'utf8'));
const orData = JSON.parse(fs.readFileSync(path.join(FLASH_RAW, 'openrouter-endpoints-pro.json'), 'utf8'));

// 1. model.json
const modelJson = {
  "$schema": "自描述；字段含义见 _meta。随模型变化的字段放这里，不随模型变化的放 providers.json。",
  "_meta": {
    "note": "本文件是模型身份层，回答「这是什么模型」。价格在 channels/，榜单在 benchmarks/，出处登记在 sources.json。",
    "generatedAt": "2026-10-08",
    "sources": ["deepseek-pricing-doc", "aa-model-pro"],
    "relatedFiles": {
      "benchmarks": ["benchmarks/aa.json", "benchmarks/lmarena.json"],
      "channels": ["channels/api.json", "channels/subscription.json"],
      "sources": "sources.json"
    }
  },
  "slug": "deepseek-v4-pro",
  "displayName": "DeepSeek-V4-Pro-0813",
  "vendor": "deepseek",
  "vendorDisplay": "DeepSeek（深度求索）",
  "family": "DeepSeek V4",
  "tier": "旗舰推理（flagship）",
  "apiModelIds": {
    "official": "deepseek-v4-pro",
    "retiredAliases": ["deepseek-v4-pro-20260423", "deepseek-v4-pro-preview"],
    "aliasNote": "官方正式 API ID 为 deepseek-v4-pro，底层版本为 DeepSeek-V4-Pro-0813"
  },
  "release": {
    "date": "2026-08-13",
    "knowledgeCutoff": null,
    "deprecated": false
  },
  "openness": {
    "openWeights": true,
    "license": "MIT",
    "weightsUrl": "https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813",
    "opennessIndex": 44.44
  },
  "architecture": {
    "totalParametersB": 1600,
    "activeParametersB": 49,
    "sizeClass": "large",
    "quantizationAvailable": ["fp8", "fp4"]
  },
  "limits": {
    "contextTokens": 1000000,
    "maxOutputTokens": 384000,
    "concurrencyLimit": 500,
    "note": "并发上限 500 为官方口径；输入输出长度 1M / 384K"
  },
  "capabilities": {
    "reasoning": { "supported": true, "default": true, "note": "支持思考与非思考，默认思考" },
    "vision": false,
    "toolCalls": true,
    "jsonOutput": true,
    "responsesApi": true,
    "anthropicApi": true,
    "chatPrefixCompletion": true,
    "fimCompletion": { "supported": true, "beta": true, "note": "仅非思考模式" },
    "webSearch": { "supported": false, "note": "官方 API 不提供内置联网" },
    "inputModalities": ["text"],
    "outputModalities": ["text"]
  },
  "speed": {
    "_source": "aa-model-pro",
    "outputTokensPerSecond": 96.16,
    "timeToFirstChunkSeconds": 1.604,
    "timeToFirstAnswerTokenSeconds": 22.403,
    "endToEndResponseTimeSeconds": 27.603,
    "outputSpeedVariance": { "p05": 73.74, "q25": 80.00, "median": 96.16, "q75": 122.08, "p95": 152.28 },
    "ttfcVariance": { "p05": 0.976, "q25": 1.194, "median": 1.604, "q75": 1.863, "p95": 2.142 }
  },
  "baseline": {
    "providerId": "deepseek-official",
    "currency": "CNY",
    "unit": "per 1M tokens",
    "tiers": [
      {
        "id": "offpeak",
        "label": "空闲",
        "inputMiss": 4.5,
        "inputHit": 0.15,
        "output": 13.5,
        "usd": { "inputMiss": 0.66, "inputHit": 0.022, "output": 1.98 }
      },
      {
        "id": "peak",
        "label": "高峰",
        "inputMiss": 9.0,
        "inputHit": 0.30,
        "output": 27.0,
        "usd": { "inputMiss": 1.32, "inputHit": 0.044, "output": 3.96 }
      }
    ],
    "peakWindow": {
      "timezone": "Asia/Shanghai",
      "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "ranges": [["09:00", "12:00"], ["14:00", "18:00"]],
      "excludeHolidays": "CN",
      "note": "高峰 = 北京时间周一至周五 9:00-12:00、14:00-18:00，不含法定节假日；其余为空闲。"
    }
  },
  "card": {
    "radar": {
      "shape": "hexagon",
      "axesCount": 6,
      "axes": [
        { "key": "financeAndAccounting", "label": "财会", "value": 41.36 },
        { "key": "strategyAndOps", "label": "战略与运营", "value": 46.46 },
        { "key": "legal", "label": "法律", "value": 41.11 },
        { "key": "healthcareAndMedical", "label": "医疗健康", "value": 38.22 },
        { "key": "engineering", "label": "工程", "value": 37.14 },
        { "key": "economics", "label": "经济", "value": 43.71 }
      ]
    }
  }
};

fs.writeFileSync(path.join(PRO_DIR, 'model.json'), JSON.stringify(modelJson, null, 2), 'utf8');

// 2. benchmarks/aa.json
const aaJson = {
  "$schema": "自描述。AA 榜单口径评测结果。",
  "_meta": {
    "generatedAt": "2026-10-08",
    "verificationLevel": "official-html",
    "sourceRefs": ["aa-model-pro"]
  },
  "boards": {
    "artificialAnalysis": {
      "displayName": "Artificial Analysis",
      "indexName": "Artificial Analysis Intelligence Index",
      "indexVersion": "v4.3.2",
      "modelEntryName": "DeepSeek V4 Pro 0813 (Max)",
      "intelligenceIndex": 35.9967791278402,
      "rankings": [
        { "key": "intelligence", "label": "Intelligence", "rank": 9, "of": 117, "note": "综合智能指数" },
        { "key": "speed", "label": "Speed", "rank": 15, "of": 117, "note": "96.2 tok/s" },
        { "key": "cost", "label": "Cost", "rank": 29, "of": 117, "note": "$0.67/任务" },
        { "key": "verbosity", "label": "Verbosity", "rank": 27, "of": 117, "note": "每任务产出 token 量" }
      ],
      "capabilities": keep.capabilities,
      "evaluations": keep.intelligenceIndexEvaluations || [],
      "costProfile": {
        "price1mInputTokens": 1.32,
        "price1mOutputTokens": 3.96,
        "cacheHitPrice": 0.044,
        "cacheHitDiscountPercent": 0.9667,
        "price1mBlended7To2To1": 0.6908,
        "costPerTaskUSD": 0.67402,
        "timePerTaskSec": 443.86
      }
    }
  }
};

fs.writeFileSync(path.join(PRO_DIR, 'benchmarks/aa.json'), JSON.stringify(aaJson, null, 2), 'utf8');

// 3. benchmarks/lmarena.json
const lmarenaJson = {
  "$schema": "自描述。LMArena 评测结果。",
  "_meta": {
    "generatedAt": "2026-10-08",
    "modelEntryName": "deepseek-v4-pro",
    "sourceRefs": ["lmarena-text"]
  },
  "boards": {
    "text": {
      "displayName": "LMArena",
      "boardLabel": "Text（通用对话）",
      "categories": {
        "overall": {
          "label": "总榜",
          "rank": 48,
          "rating": 1451.00,
          "ratingLower": 1447.11,
          "ratingUpper": 1454.89,
          "variance": 3.94,
          "votes": 57478
        }
      }
    }
  }
};

fs.writeFileSync(path.join(PRO_DIR, 'benchmarks/lmarena.json'), JSON.stringify(lmarenaJson, null, 2), 'utf8');

// 4. channels/api.json
const endpointsRaw = (orData.data && orData.data.endpoints) || [];
const orEndpoints = endpointsRaw.map(e => {
  const pr = e.pricing || {};
  const toM = (x) => x == null ? null : +(Number(x) * 1e6).toFixed(6);
  return {
    providerName: e.provider_name,
    tag: e.tag,
    usd: {
      inputMiss: toM(pr.prompt),
      inputHit: toM(pr.input_cache_read),
      output: toM(pr.completion)
    },
    contextTokens: e.context_length,
    maxOutputTokens: e.max_completion_tokens,
    quantization: e.quantization,
    uptimeLast1d: e.uptime_last_1d != null ? +Number(e.uptime_last_1d).toFixed(2) : null,
    implicitCache: !!e.supports_implicit_caching,
    note: e.provider_name === 'DeepSeek' ? '官方端点支持隐式缓存' : (e.quantization || '')
  };
}).sort((a,b) => (a.usd.inputMiss ?? 999) - (b.usd.inputMiss ?? 999));

const apiJson = {
  "$schema": "自描述。按量渠道列表。",
  "_meta": {
    "modelSlug": "deepseek-v4-pro",
    "generatedAt": "2026-10-08"
  },
  "baseline": {
    "providerId": "deepseek-official",
    "label": "DeepSeek 官方（基准）",
    "tiers": [
      {
        "id": "offpeak",
        "label": "空闲",
        "usd": { "inputMiss": 0.66, "inputHit": 0.022, "output": 1.98 },
        "cny": { "inputMiss": 4.5, "inputHit": 0.15, "output": 13.5 }
      },
      {
        "id": "peak",
        "label": "高峰",
        "usd": { "inputMiss": 1.32, "inputHit": 0.044, "output": 3.96 },
        "cny": { "inputMiss": 9.0, "inputHit": 0.30, "output": 27.0 }
      }
    ]
  },
  "channels": [
    {
      "providerId": "deepseek-official",
      "isOfficial": true,
      "displayName": "DeepSeek 官方 API",
      "tiers": [
        { "id": "offpeak", "label": "空闲", "usd": { "inputMiss": 0.66, "inputHit": 0.022, "output": 1.98 }, "cny": { "inputMiss": 4.5, "inputHit": 0.15, "output": 13.5 } },
        { "id": "peak", "label": "高峰", "usd": { "inputMiss": 1.32, "inputHit": 0.044, "output": 3.96 }, "cny": { "inputMiss": 9.0, "inputHit": 0.30, "output": 27.0 } }
      ],
      "peakValley": true,
      "modelIds": { "openai": "deepseek-v4-pro", "anthropic": "deepseek-v4-pro" },
      "limits": { "contextTokens": 1000000, "maxOutputTokens": 384000, "concurrency": 500 },
      "features": { "implicitCache": true, "vision": false, "toolCalls": true },
      "notes": ["基准行，倍数恒为 1x", "官方同时提供人民币与美元牌价", "并发上限 500"]
    },
    {
      "providerId": "siliconflow",
      "displayName": "SiliconFlow 硅基流动",
      "tiers": [{ "id": "flat", "label": "固定价", "usd": { "inputMiss": 1.32, "inputHit": 0.044, "output": 3.96 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1000000, "maxOutputTokens": 384000 },
      "notes": ["标价等于官方峰价（对谷价 2x，对峰价 1x）", "已上线 0813 正式版"]
    },
    {
      "providerId": "volcengine-ark",
      "displayName": "火山方舟 Volcengine Ark",
      "priceCurrency": "CNY",
      "tiers": [
        { "id": "offpeak", "label": "空闲", "cny": { "inputMiss": 4.5, "inputHit": 0.15, "output": 13.5 } },
        { "id": "peak", "label": "高峰", "cny": { "inputMiss": 9.0, "inputHit": 0.30, "output": 27.0 } }
      ],
      "peakValley": true,
      "limits": { "contextTokens": 1000000, "maxOutputTokens": 384000 },
      "notes": ["与官方人民币同价（1x）", "另有缓存存储费 ¥0.017/M"]
    },
    {
      "providerId": "alibaba-bailian-beijing",
      "displayName": "阿里云百炼（北京）",
      "priceCurrency": "CNY",
      "tiers": [
        { "id": "offpeak", "label": "闲时", "cny": { "inputMiss": 4.5, "inputHit": null, "output": 13.5 } },
        { "id": "peak", "label": "忙时", "cny": { "inputMiss": 9.0, "inputHit": null, "output": 27.0 } }
      ],
      "peakValley": true,
      "limits": { "contextTokens": 1000000, "maxOutputTokens": 384000 },
      "notes": ["与官方人民币同价", "忙时 8:00-22:00（14h）"]
    },
    {
      "providerId": "cloudflare-workers-ai",
      "displayName": "Cloudflare Workers AI",
      "tiers": [{ "id": "flat", "label": "固定价", "usd": { "inputMiss": 1.32, "inputHit": 0.044, "output": 3.96 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1048576, "maxOutputTokens": 943718 },
      "notes": ["已上架 @cf/deepseek-ai/deepseek-v4-pro-0813", "固定单价等于官方峰价"]
    },
    {
      "providerId": "deepinfra",
      "displayName": "DeepInfra",
      "tiers": [{ "id": "flat", "label": "标价", "usd": { "inputMiss": 1.30, "inputHit": 0.10, "output": 2.60 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1048576, "maxOutputTokens": 384000 },
      "notes": ["输出 $2.60 低于官方峰价 $3.96", "缓存价 $0.10"]
    },
    {
      "providerId": "together",
      "displayName": "Together AI",
      "tiers": [{ "id": "flat", "label": "固定价", "usd": { "inputMiss": 1.32, "inputHit": 0.13, "output": 3.96 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1048576, "maxOutputTokens": 384000 },
      "notes": ["输入输出等于官方峰价", "缓存价 $0.13"]
    },
    {
      "providerId": "digitalocean",
      "displayName": "DigitalOcean Gradient",
      "tiers": [{ "id": "flat", "label": "固定价", "usd": { "inputMiss": 1.32, "inputHit": 0.044, "output": 3.96 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1048576, "maxOutputTokens": 943718 },
      "notes": ["等于官方峰价"]
    },
    {
      "providerId": "nebius",
      "displayName": "Nebius AI Studio",
      "tiers": [{ "id": "flat", "label": "固定价", "usd": { "inputMiss": 1.32, "inputHit": null, "output": 3.96 } }],
      "peakValley": false,
      "limits": { "contextTokens": 979000, "maxOutputTokens": 881100 },
      "notes": ["输入输出等于官方峰价", "无缓存命中折扣"]
    },
    {
      "providerId": "wandb-inference",
      "displayName": "W&B Inference",
      "tiers": [{ "id": "flat", "label": "固定价", "usd": { "inputMiss": 1.31, "inputHit": 0.044, "output": 3.96 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1048576, "maxOutputTokens": 1048576 },
      "notes": ["接近官方峰价"]
    },
    {
      "providerId": "openrouter",
      "displayName": "OpenRouter",
      "tiers": [{ "id": "flat", "label": "默认路由", "usd": { "inputMiss": 1.32, "inputHit": 0.044, "output": 3.96 } }],
      "peakValley": false,
      "multiEndpoint": true,
      "limits": { "contextTokens": 1048576, "maxOutputTokens": 943718 },
      "notes": ["聚合网关，默认路由标价等于官方峰价", "实测 22 个上游端点，低至 $0.127 / $8 或 $0.141 / $0.424"],
      "endpoints": orEndpoints
    },
    {
      "providerId": "azure-foundry",
      "displayName": "Azure AI Foundry (Fireworks)",
      "tiers": [{ "id": "flat", "label": "DZ 区域单价", "usd": { "inputMiss": 1.925, "inputHit": 0.62, "output": 3.828 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1000000, "maxOutputTokens": 384000 },
      "notes": ["Azure Retail Prices API 实测 FW DeepSeek-V4-Pro meter"]
    },
    {
      "providerId": "aws-bedrock",
      "displayName": "AWS Bedrock",
      "available": false,
      "notes": ["已核实未上架 DeepSeek V4 系列"]
    },
    {
      "providerId": "google-vertex",
      "displayName": "Google Vertex AI",
      "available": false,
      "notes": ["已核实未上架 DeepSeek V4 系列"]
    }
  ]
};

fs.writeFileSync(path.join(PRO_DIR, 'channels/api.json'), JSON.stringify(apiJson, null, 2), 'utf8');

// 5. channels/subscription.json (基于 Pro 官方谷价 $0.66 / $0.022 / $1.98 进行额度折算)
const BASE_PRO = { inputMiss: 0.66, inputHit: 0.022, output: 1.98 };
const PROFILE_CODING = { inputTokens: 71710, outputTokens: 310 };

function calcReqs(budgetUSD, cacheRate) {
  const miss = PROFILE_CODING.inputTokens * (1 - cacheRate);
  const hit = PROFILE_CODING.inputTokens * cacheRate;
  const cost = (miss * BASE_PRO.inputMiss + hit * BASE_PRO.inputHit + PROFILE_CODING.outputTokens * BASE_PRO.output) / 1e6;
  return Math.round(budgetUSD / cost);
}

const subPlans = [
  {
    providerId: "cline-pass",
    planId: "monthly",
    label: "ClinePass 月度",
    fee: { amount: 9.99, currency: "USD" },
    modelAllowance: { usd: 49.3, derivation: "根据月额度折算（旗舰模型消耗配额速率高于 Flash）" },
    limits: { fiveHourUSD: 9.8, weeklyUSD: 24.6, monthlyUSD: 49.3 },
    rollingWindow: false,
    softLimit: false,
    quotaConversion: {
      codingAgentAt874: calcReqs(49.3, 0.874)
    }
  },
  {
    providerId: "opencode-go",
    planId: "go",
    label: "OpenCode Go",
    fee: { amount: 10, currency: "USD" },
    modelAllowance: { usd: 30, derivation: "旗舰模型额度按官方对应梯度设置" },
    limits: { fiveHourUSD: 6, weeklyUSD: 15, monthlyUSD: 30 },
    rollingWindow: false,
    softLimit: false,
    quotaConversion: {
      codingAgentAt874: calcReqs(30, 0.874)
    }
  },
  {
    providerId: "command-code",
    planId: "goat",
    label: "Command Code GOAT",
    fee: { amount: 10, currency: "USD" },
    modelAllowance: { usd: 35, derivation: "GOAT 套餐额度" },
    limits: { fiveHourUSD: 7, weeklyUSD: 17.5, monthlyUSD: 35 },
    rollingWindow: true,
    softLimit: false,
    quotaConversion: {
      codingAgentAt874: calcReqs(35, 0.874)
    }
  },
  {
    providerId: "command-code",
    planId: "go",
    label: "Command Code Go",
    fee: { amount: 1, currency: "USD" },
    modelAllowance: { usd: 5, derivation: "Go 套餐额度" },
    limits: { fiveHourUSD: 1, weeklyUSD: 2.5, monthlyUSD: 5 },
    rollingWindow: true,
    softLimit: false,
    quotaConversion: {
      codingAgentAt874: calcReqs(5, 0.874)
    }
  },
  {
    providerId: "electron-hub",
    planId: "lite",
    label: "Electron Hub DevPass Lite",
    fee: { amount: 10, currency: "USD" },
    modelAllowance: null,
    softLimit: true,
    limits: { fiveHourUSD: null, weeklyUSD: null, monthlyUSD: null },
    quotaConversion: {}
  },
  {
    providerId: "electron-hub",
    planId: "turbo",
    label: "Electron Hub DevPass Turbo",
    fee: { amount: 20, currency: "USD" },
    modelAllowance: null,
    softLimit: true,
    limits: { fiveHourUSD: null, weeklyUSD: null, monthlyUSD: null },
    quotaConversion: {}
  },
  {
    providerId: "tencent-token-plan",
    planId: "lite",
    label: "腾讯云 Token Plan Lite",
    fee: { amount: 39, currency: "CNY" },
    limits: { monthlyCredits: 780 },
    quotaConversion: { codingAgentAt874: 380 }
  },
  {
    providerId: "tencent-token-plan",
    planId: "standard",
    label: "腾讯云 Token Plan Standard",
    fee: { amount: 99, currency: "CNY" },
    limits: { monthlyCredits: 2200 },
    quotaConversion: { codingAgentAt874: 1080 }
  },
  {
    providerId: "tencent-token-plan",
    planId: "pro",
    label: "腾讯云 Token Plan Pro",
    fee: { amount: 399, currency: "CNY" },
    limits: { monthlyCredits: 10000 },
    quotaConversion: { codingAgentAt874: 4900 }
  },
  {
    providerId: "tencent-token-plan",
    planId: "max",
    label: "腾讯云 Token Plan Max",
    fee: { amount: 999, currency: "CNY" },
    limits: { monthlyCredits: 28000 },
    quotaConversion: { codingAgentAt874: 13800 }
  }
];

const subJson = {
  "$schema": "自描述。订阅制渠道列表。",
  "_meta": {
    "modelSlug": "deepseek-v4-pro",
    "generatedAt": "2026-10-08",
    "baselinePrice": "$0.66 / $0.022 / $1.98"
  },
  "plans": subPlans
};

fs.writeFileSync(path.join(PRO_DIR, 'channels/subscription.json'), JSON.stringify(subJson, null, 2), 'utf8');

// 6. sources.json
const sourcesJson = {
  "$schema": "自描述。数据溯源清单。",
  "_meta": {
    "generatedAt": "2026-10-08",
    "modelSlug": "deepseek-v4-pro"
  },
  "sources": [
    { "id": "deepseek-pricing-doc", "url": "https://api-docs.deepseek.com/zh-cn/quick_start/pricing", "label": "DeepSeek 官方定价文档" },
    { "id": "aa-model-pro", "url": "https://artificialanalysis.ai/models/deepseek-v4-pro", "label": "Artificial Analysis DeepSeek V4 Pro 模型页" },
    { "id": "openrouter-pro-endpoints", "url": "https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-pro-0813/endpoints", "label": "OpenRouter 逐端点 API" },
    { "id": "lmarena-text", "url": "https://datasets-server.huggingface.co/rows?dataset=lmarena-ai/leaderboard-dataset&config=text", "label": "LMArena Leaderboard Dataset" }
  ]
};

fs.writeFileSync(path.join(PRO_DIR, 'sources.json'), JSON.stringify(sourcesJson, null, 2), 'utf8');

console.log('Successfully generated models/deepseek-v4-pro/ data layer (6 files)!');
