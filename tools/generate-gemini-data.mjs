import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('.');
const DIR = path.join(ROOT, 'models/gemini-3.8-flash');
fs.mkdirSync(DIR, { recursive: true });
fs.mkdirSync(path.join(DIR, 'benchmarks'), { recursive: true });
fs.mkdirSync(path.join(DIR, 'channels'), { recursive: true });

// 1. model.json
const modelJson = {
  "$schema": "自描述。模型身份层。",
  "_meta": {
    "generatedAt": "2026-10-08",
    "sources": ["google-ai-doc", "aa-peers"]
  },
  "slug": "gemini-3.8-flash",
  "displayName": "Gemini 3.8 Flash (High)",
  "vendor": "google",
  "vendorDisplay": "Google DeepMind",
  "family": "Gemini",
  "tier": "轻量高速（flash）",
  "apiModelIds": {
    "official": "gemini-3.8-flash",
    "vertex": "gemini-3.8-flash@001"
  },
  "release": {
    "date": "2026-08-20",
    "knowledgeCutoff": "2026-03",
    "deprecated": false
  },
  "openness": {
    "openWeights": false,
    "license": "Proprietary",
    "opennessIndex": 0
  },
  "architecture": {
    "sizeClass": "fast-multimodal",
    "moe": true
  },
  "limits": {
    "contextTokens": 1048576,
    "maxOutputTokens": 65536,
    "concurrencyLimit": 2000
  },
  "capabilities": {
    "reasoning": { "supported": true, "default": true },
    "vision": true,
    "audio": true,
    "video": true,
    "toolCalls": true,
    "jsonOutput": true,
    "webSearch": { "supported": true, "note": "Google Search Grounding 原生内置" },
    "inputModalities": ["text", "image", "audio", "video"],
    "outputModalities": ["text"]
  },
  "speed": {
    "outputTokensPerSecond": 195.4,
    "timeToFirstChunkSeconds": 0.62
  },
  "baseline": {
    "providerId": "google-ai-studio",
    "currency": "USD",
    "unit": "per 1M tokens",
    "tiers": [
      {
        "id": "standard",
        "label": "标准按量",
        "usd": { "inputMiss": 0.75, "inputHit": 0.075, "output": 3.75 }
      },
      {
        "id": "batch",
        "label": "Batch API (50% 折扣)",
        "usd": { "inputMiss": 0.375, "inputHit": 0.0375, "output": 1.875 }
      }
    ]
  },
  "card": {
    "radar": {
      "shape": "hexagon",
      "axesCount": 6,
      "axes": [
        { "key": "financeAndAccounting", "label": "财会", "value": 46.76 },
        { "key": "strategyAndOps", "label": "战略与运营", "value": 48.40 },
        { "key": "legal", "label": "法律", "value": 51.63 },
        { "key": "healthcareAndMedical", "label": "医疗健康", "value": 41.78 },
        { "key": "engineering", "label": "工程", "value": 42.81 },
        { "key": "economics", "label": "经济", "value": 52.36 }
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
      "modelEntryName": "Gemini 3.8 Flash (High)",
      "intelligenceIndex": 40.9262321765904,
      "rankings": [
        { "key": "intelligence", "label": "Intelligence", "rank": 6, "of": 117, "note": "超越多数同尺寸模型" },
        { "key": "speed", "label": "Speed", "rank": 5, "of": 117, "note": "195 tok/s" },
        { "key": "cost", "label": "Cost", "rank": 18, "of": 117, "note": "$1.24/任务" }
      ],
      "capabilities": {
        "financeAndAccounting": 46.7567637414082,
        "strategyAndOps": 48.4011506829342,
        "legal": 51.6298811903287,
        "healthcareAndMedical": 41.7830626872104,
        "engineering": 42.8134112164944,
        "economics": 52.3615117778808
      },
      "costProfile": {
        "price1mInputTokens": 0.75,
        "price1mOutputTokens": 3.75,
        "cacheHitPrice": 0.075,
        "price1mBlended7To2To1": 0.5775,
        "costPerTaskUSD": 1.2428,
        "timePerTaskSec": 561.6
      }
    }
  }
};
fs.writeFileSync(path.join(DIR, 'benchmarks/aa.json'), JSON.stringify(aaJson, null, 2), 'utf8');

// 3. channels/api.json
const apiJson = {
  "$schema": "自描述。按量渠道列表。",
  "baseline": {
    "providerId": "google-ai-studio",
    "label": "Google AI Studio 官方（基准）",
    "tiers": [
      {
        "id": "standard",
        "label": "标准按量",
        "usd": { "inputMiss": 0.75, "inputHit": 0.075, "output": 3.75 }
      },
      {
        "id": "batch",
        "label": "Batch API (50% off)",
        "usd": { "inputMiss": 0.375, "inputHit": 0.0375, "output": 1.875 }
      }
    ]
  },
  "channels": [
    {
      "providerId": "google-ai-studio",
      "isOfficial": true,
      "displayName": "Google AI Studio 官方 API",
      "tiers": [
        { "id": "standard", "label": "标准按量", "usd": { "inputMiss": 0.75, "inputHit": 0.075, "output": 3.75 } },
        { "id": "batch", "label": "Batch API", "usd": { "inputMiss": 0.375, "inputHit": 0.0375, "output": 1.875 } }
      ],
      "peakValley": false,
      "limits": { "contextTokens": 1048576, "maxOutputTokens": 65536 },
      "notes": ["官方基准，支持上下文缓存（缓存读 $0.075/M，写 $0.0416/M/h）", "含免费额度层（RPM/RPD 限制）"]
    },
    {
      "providerId": "google-vertex",
      "isOfficial": true,
      "displayName": "Google Cloud Vertex AI",
      "tiers": [{ "id": "flat", "label": "企业标准", "usd": { "inputMiss": 0.75, "inputHit": 0.075, "output": 3.75 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1048576, "maxOutputTokens": 65536 },
      "notes": ["GCP 企业级合规与 SLA 保证，价格与官方一致 (1.00×)"]
    },
    {
      "providerId": "openrouter",
      "displayName": "OpenRouter",
      "tiers": [{ "id": "flat", "label": "直连/网关", "usd": { "inputMiss": 0.75, "inputHit": 0.075, "output": 3.75 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1048576, "maxOutputTokens": 65536 },
      "notes": ["聚合网关，支持隐式与显式缓存"]
    },
    {
      "providerId": "vercel-gateway",
      "displayName": "Vercel AI Gateway",
      "tiers": [{ "id": "flat", "label": "标准转发", "usd": { "inputMiss": 0.75, "inputHit": 0.075, "output": 3.75 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1000000, "maxOutputTokens": 65535 },
      "notes": ["转发官方接口，1.00×"]
    },
    {
      "providerId": "nano-gpt",
      "displayName": "Nano-GPT",
      "tiers": [{ "id": "flat", "label": "加密货币直付", "usd": { "inputMiss": 0.75, "inputHit": 0.075, "output": 3.75 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1048576, "maxOutputTokens": 65536 },
      "notes": ["免 KYC / 零日志，标价与官方一致 (1.00×)"]
    },
    {
      "providerId": "aihubmix",
      "displayName": "AIHubMix",
      "tiers": [{ "id": "flat", "label": "国内中继", "usd": { "inputMiss": 0.75, "inputHit": 0.075, "output": 3.75 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1048576, "maxOutputTokens": 65536 },
      "notes": ["国内直连通道，同价 1.00×"]
    },
    {
      "providerId": "302ai",
      "displayName": "302.AI",
      "tiers": [{ "id": "flat", "label": "标准转发", "usd": { "inputMiss": 0.75, "inputHit": null, "output": 3.75 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1048576, "maxOutputTokens": 65536 },
      "notes": ["缓存计价未单独列出"]
    },
    {
      "providerId": "github-copilot",
      "displayName": "GitHub Copilot API",
      "tiers": [{ "id": "flat", "label": "开发者通道", "usd": { "inputMiss": 0.75, "inputHit": 0.075, "output": 3.75 } }],
      "peakValley": false,
      "limits": { "contextTokens": 1000000, "maxOutputTokens": 64000 },
      "notes": ["集成至 VS Code / Copilot Chat 环境"]
    }
  ]
};
fs.writeFileSync(path.join(DIR, 'channels/api.json'), JSON.stringify(apiJson, null, 2), 'utf8');

// 4. channels/subscription.json
const BASE_GEMINI = { inputMiss: 0.75, inputHit: 0.075, output: 3.75 };
const PROFILE_CODING = { inputTokens: 71710, outputTokens: 310 };

function calcReqs(budgetUSD, cacheRate) {
  const miss = PROFILE_CODING.inputTokens * (1 - cacheRate);
  const hit = PROFILE_CODING.inputTokens * cacheRate;
  const cost = (miss * BASE_GEMINI.inputMiss + hit * BASE_GEMINI.inputHit + PROFILE_CODING.outputTokens * BASE_GEMINI.output) / 1e6;
  return Math.round(budgetUSD / cost);
}

const subPlans = [
  {
    providerId: "google-one-ai",
    planId: "premium",
    label: "Google One AI Premium",
    fee: { amount: 19.99, currency: "USD" },
    modelAllowance: { usd: 120, derivation: "含 Gemini Advanced + 2TB Google Drive + Workspace 插件支持" },
    limits: { fiveHourUSD: 24, weeklyUSD: 60, monthlyUSD: 120 },
    rollingWindow: false,
    softLimit: false,
    quotaConversion: { codingAgentAt874: calcReqs(120, 0.874) }
  },
  {
    providerId: "cline-pass",
    planId: "monthly",
    label: "ClinePass 月度",
    fee: { amount: 9.99, currency: "USD" },
    modelAllowance: { usd: 60, derivation: "支持 Gemini 3.8 Flash 高速代码生成" },
    limits: { fiveHourUSD: 12, weeklyUSD: 30, monthlyUSD: 60 },
    rollingWindow: false,
    softLimit: false,
    quotaConversion: { codingAgentAt874: calcReqs(60, 0.874) }
  },
  {
    providerId: "opencode-go",
    planId: "go",
    label: "OpenCode Go",
    fee: { amount: 10, currency: "USD" },
    modelAllowance: { usd: 50, derivation: "官方配置月限额" },
    limits: { fiveHourUSD: 10, weeklyUSD: 25, monthlyUSD: 50 },
    rollingWindow: false,
    softLimit: false,
    quotaConversion: { codingAgentAt874: calcReqs(50, 0.874) }
  },
  {
    providerId: "command-code",
    planId: "goat",
    label: "Command Code GOAT",
    fee: { amount: 10, currency: "USD" },
    modelAllowance: { usd: 55, derivation: "GOAT 套餐额度" },
    limits: { fiveHourUSD: 11, weeklyUSD: 27.5, monthlyUSD: 55 },
    rollingWindow: true,
    softLimit: false,
    quotaConversion: { codingAgentAt874: calcReqs(55, 0.874) }
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
  }
];

const subJson = {
  "$schema": "自描述。订阅制渠道列表。",
  "baselinePrice": "$0.75 / $0.075 / $3.75",
  "plans": subPlans
};
fs.writeFileSync(path.join(DIR, 'channels/subscription.json'), JSON.stringify(subJson, null, 2), 'utf8');

console.log('Successfully generated models/gemini-3.8-flash/ data layer!');
