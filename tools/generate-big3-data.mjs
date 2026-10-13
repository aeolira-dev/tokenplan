/**
 * 为国外三巨头「有 AA 快照、尚无横评页」的在用型号写数据层。
 * 口径对齐 generate-gpt-data.mjs / generate-gemini-data.mjs：
 *   models/<slug>/{model.json,benchmarks/aa.json,channels/api.json,channels/subscription.json}
 * 数字来自 raw/_global/2026-10-08/aa-peers.json 与 OpenRouter :batch 半价。
 * 不收录：无 AA 的 GPT-6 Sol / Claude Mythos 5 / Gemini 3.8 Omni / Gemma 4。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve('.');
const AA_PATH = path.join(ROOT, 'raw/_global/2026-10-08/aa-peers.json');
const AA = JSON.parse(fs.readFileSync(AA_PATH, 'utf8'));
const aaBy = Object.fromEntries(AA.models.map((m) => [m.slug, m]));
const RANKED = [...AA.models].sort(
  (a, b) => (b.intelligenceIndex || 0) - (a.intelligenceIndex || 0),
);
const COST_RANKED = [...AA.models]
  .filter((m) => m.costPerTaskUSD != null)
  .sort((a, b) => a.costPerTaskUSD - b.costPerTaskUSD);

const PROFILE = { inputTokens: 71710, outputTokens: 310 };

function calcReqs(budgetUSD, cacheRate, base) {
  const miss = PROFILE.inputTokens * (1 - cacheRate);
  const hit = PROFILE.inputTokens * cacheRate;
  const cost =
    (miss * base.inputMiss + hit * base.inputHit + PROFILE.outputTokens * base.output) / 1e6;
  if (!Number.isFinite(cost) || cost <= 0) return null;
  return Math.round(budgetUSD / cost);
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function markup(base, k = 1.025) {
  return {
    inputMiss: round4(base.inputMiss * k),
    inputHit: round4(base.inputHit * k),
    output: round4(base.output * k),
  };
}

function half(base) {
  return {
    inputMiss: round4(base.inputMiss / 2),
    inputHit: round4(base.inputHit / 2),
    output: round4(base.output / 2),
  };
}

const SPECS = [
  {
    slug: 'claude-opus-5.5',
    aaSlug: 'claude-opus-5-5',
    displayName: 'Claude Opus 5.5',
    vendor: 'anthropic',
    vendorDisplay: 'Anthropic',
    family: 'Claude',
    tier: '旗舰（flagship）',
    officialId: 'claude-opus-5.5',
    channelKind: 'anthropic',
    endpointPattern: 'claude-opus-5[.-]5',
    pills: [
      { cls: 'reason', text: '旗舰推理' },
      { cls: 'open', text: '闭源' },
    ],
    metric1: {
      en: 'AA Cost / Task',
      zh: '对照集任务成本',
      highlight: 'cost',
      note: 'Max + Default Fallback；输出 token 偏高',
    },
    specialty: 'AA Intelligence Index v4.3.2 对照集榜首',
  },
  {
    slug: 'claude-sonnet-5.5',
    aaSlug: 'claude-sonnet-5-5',
    displayName: 'Claude Sonnet 5.5',
    vendor: 'anthropic',
    vendorDisplay: 'Anthropic',
    family: 'Claude',
    tier: '主力中档',
    officialId: 'claude-sonnet-5.5',
    channelKind: 'anthropic',
    endpointPattern: 'claude-sonnet-5[.-]5',
    pills: [
      { cls: 'reason', text: '主力中档' },
      { cls: 'open', text: '闭源' },
    ],
    metric1: {
      en: 'AA Cost / Task',
      zh: '对照集任务成本',
      highlight: 'cost',
      note: '智能接近 Opus，单价约为 Opus 一半',
    },
    specialty: 'AA Index 与 Opus 5.5 xhigh 同分档',
  },
  {
    slug: 'claude-fable-5.1',
    aaSlug: 'claude-fable-5-1',
    displayName: 'Claude Fable 5.1',
    vendor: 'anthropic',
    vendorDisplay: 'Anthropic',
    family: 'Claude',
    tier: '创意 / 长文本',
    officialId: 'claude-fable-5.1',
    channelKind: 'anthropic',
    endpointPattern: 'claude-fable-5[.-]1',
    pills: [
      { cls: 'reason', text: '创意长文本' },
      { cls: 'open', text: '闭源' },
    ],
    metric1: {
      en: 'AA Cost / Task',
      zh: '对照集任务成本',
      highlight: 'cost',
      note: '同分下比 GPT-6 Astra 贵约 57%',
    },
    specialty: '创意 / 长文本向旗舰',
  },
  {
    slug: 'claude-haiku-5.5',
    aaSlug: 'claude-haiku-5-5',
    displayName: 'Claude Haiku 5.5',
    vendor: 'anthropic',
    vendorDisplay: 'Anthropic',
    family: 'Claude',
    tier: '轻量',
    officialId: 'claude-haiku-5.5',
    channelKind: 'anthropic',
    endpointPattern: 'claude-haiku-5[.-]5',
    pills: [
      { cls: 'reason', text: '轻量高速' },
      { cls: 'open', text: '闭源' },
    ],
    metric1: {
      en: 'AA Cost / Task',
      zh: '对照集任务成本',
      highlight: 'cost',
      note: '2026-10-07 发布，快照内最新 Claude',
    },
    specialty: '轻量高速线',
  },
  {
    slug: 'gpt-6-astra',
    aaSlug: 'gpt-6-astra',
    displayName: 'GPT-6 Astra',
    vendor: 'openai',
    vendorDisplay: 'OpenAI',
    family: 'GPT-6',
    tier: '旗舰（Agent 向）',
    officialId: 'gpt-6-astra',
    channelKind: 'openai',
    endpointPattern: 'gpt-6-astra',
    pills: [
      { cls: 'reason', text: 'Agent 旗舰' },
      { cls: 'open', text: '闭源' },
    ],
    metric1: {
      en: 'Terminal-Bench 4.0',
      zh: '智能体综合评测',
      num: '59.1%',
      rankNum: '1',
      rankTotal: '全场',
      barPct: '59.1%',
      sub: 'AutomationBench-AA 68.5% 全场第一',
    },
    specialty: 'Agent 向旗舰；Terminal-Bench 4.0 全场第一',
  },
  {
    slug: 'gpt-6-luna',
    aaSlug: 'gpt-6-luna',
    displayName: 'GPT-6 Luna',
    vendor: 'openai',
    vendorDisplay: 'OpenAI',
    family: 'GPT-6',
    tier: '轻量',
    officialId: 'gpt-6-luna',
    channelKind: 'openai',
    endpointPattern: 'gpt-6-luna',
    pills: [
      { cls: 'reason', text: '轻量主力' },
      { cls: 'open', text: '闭源' },
    ],
    metric1: {
      en: 'SWE-bench Verified',
      zh: '代码权威得分',
      num: '93.00%',
      rankNum: '轻量',
      rankTotal: '一线',
      barPct: '93%',
      sub: '总表口径；Codex 套餐折算极低单价',
    },
    specialty: '轻量主力；SWE-bench Verified 93.00%',
  },
  {
    slug: 'gemini-4-argon',
    aaSlug: 'gemini-4-argon',
    displayName: 'Gemini 4 Argon',
    vendor: 'google',
    vendorDisplay: 'Google DeepMind',
    family: 'Gemini',
    tier: '旗舰',
    officialId: 'gemini-4-argon',
    channelKind: 'google',
    endpointPattern: 'gemini-4-argon',
    pills: [
      { cls: 'reason', text: '旗舰多模态' },
      { cls: 'open', text: '闭源' },
    ],
    hasBatch: true,
    skipUnverifiedGateways: true,
    batchNote: '本快照 models.dev / OpenRouter 未列 Argon 端点；Batch 按官方常见 50% 折扣单列',
    metric1: {
      en: 'AA Cost / Task',
      zh: '对照集任务成本',
      highlight: 'cost',
      note: 'High 档；本快照无 models.dev 端点',
    },
    specialty: 'Gemini 4 旗舰；AA Index 53（high）',
  },
];

function openaiChannels(base, batch, limits) {
  return [
    {
      providerId: 'openai-official',
      isOfficial: true,
      displayName: 'OpenAI 官方 API',
      tiers: [
        { id: 'standard', label: '标准按量', usd: base },
        { id: 'batch', label: 'Batch API', usd: batch },
      ],
      peakValley: false,
      limits,
      notes: ['官方基准行，原生 Prompt Caching'],
    },
    {
      providerId: 'azure-openai',
      isOfficial: true,
      displayName: 'Microsoft Azure OpenAI',
      tiers: [
        { id: 'standard', label: '企业标准', usd: base },
        { id: 'batch', label: 'Batch', usd: batch },
      ],
      peakValley: false,
      limits,
      notes: ['微软云合规保障，价格与官方一致 (1.00×)'],
    },
    {
      providerId: 'openrouter',
      displayName: 'OpenRouter',
      tiers: [
        { id: 'standard', label: '默认路由', usd: base },
        { id: 'batch', label: 'Batch 路由', usd: batch },
      ],
      peakValley: false,
      limits,
      notes: ['聚合直通官方与 Azure，同价 (1.00×)'],
    },
    {
      providerId: 'cloudflare-ai-gateway',
      displayName: 'Cloudflare AI Gateway',
      tiers: [{ id: 'standard', label: '网关直通', usd: base }],
      peakValley: false,
      limits,
      notes: ['边缘缓存与防爆流，1.00×'],
    },
    {
      providerId: 'vercel-gateway',
      displayName: 'Vercel AI Gateway',
      tiers: [{ id: 'standard', label: '标准转发', usd: base }],
      peakValley: false,
      limits,
      notes: ['转发官方接口，1.00×'],
    },
    {
      providerId: 'nano-gpt',
      displayName: 'Nano-GPT',
      tiers: [{ id: 'standard', label: '加密货币直付', usd: base }],
      peakValley: false,
      limits,
      notes: ['无须信用卡绑定，1.00×'],
    },
    {
      providerId: 'aihubmix',
      displayName: 'AIHubMix',
      tiers: [{ id: 'standard', label: '国内中继直连', usd: markup(base) }],
      peakValley: false,
      limits,
      notes: ['微幅溢价约 2.5%'],
    },
  ];
}

function anthropicChannels(base, batch, limits) {
  return [
    {
      providerId: 'anthropic-official',
      isOfficial: true,
      displayName: 'Anthropic 官方 API',
      tiers: [
        { id: 'standard', label: '标准按量', usd: base },
        { id: 'batch', label: 'Batch API', usd: batch },
      ],
      peakValley: false,
      limits,
      notes: ['官方基准行，支持 prompt cache'],
    },
    {
      providerId: 'amazon-bedrock',
      isOfficial: true,
      displayName: 'Amazon Bedrock',
      tiers: [{ id: 'standard', label: '企业标准', usd: base }],
      peakValley: false,
      limits,
      notes: ['AWS 企业合规通道，快照价 1.00×'],
    },
    {
      providerId: 'azure-anthropic',
      isOfficial: true,
      displayName: 'Microsoft Azure Anthropic',
      tiers: [{ id: 'standard', label: '企业标准', usd: base }],
      peakValley: false,
      limits,
      notes: ['Azure 上的 Anthropic 模型，快照价 1.00×'],
    },
    {
      providerId: 'google-vertex-anthropic',
      displayName: 'Google Vertex Anthropic',
      tiers: [{ id: 'standard', label: 'Vertex 托管', usd: base }],
      peakValley: false,
      limits,
      notes: ['GCP Vertex 托管 Claude，快照价 1.00×'],
    },
    {
      providerId: 'openrouter',
      displayName: 'OpenRouter',
      tiers: [
        { id: 'standard', label: '默认路由', usd: base },
        { id: 'batch', label: 'Batch 路由', usd: batch },
      ],
      peakValley: false,
      limits,
      notes: ['聚合直通官方 / Bedrock / Azure，同价 (1.00×)'],
    },
    {
      providerId: 'vercel-gateway',
      displayName: 'Vercel AI Gateway',
      tiers: [{ id: 'standard', label: '标准转发', usd: base }],
      peakValley: false,
      limits,
      notes: ['转发官方接口，1.00×'],
    },
    {
      providerId: 'nano-gpt',
      displayName: 'Nano-GPT',
      tiers: [{ id: 'standard', label: '加密货币直付', usd: base }],
      peakValley: false,
      limits,
      notes: ['无须信用卡绑定，1.00×'],
    },
    {
      providerId: 'aihubmix',
      displayName: 'AIHubMix',
      tiers: [{ id: 'standard', label: '国内中继直连', usd: markup(base) }],
      peakValley: false,
      limits,
      notes: ['微幅溢价约 2.5%'],
    },
  ];
}

function googleChannels(base, limits, hasBatch, batchNote, opts = {}) {
  const batch = half(base);
  const officialTiers = hasBatch
    ? [
        { id: 'standard', label: '标准按量', usd: base },
        { id: 'batch', label: 'Batch API', usd: batch },
      ]
    : [{ id: 'standard', label: '标准按量', usd: base }];
  const rows = [
    {
      providerId: 'google-ai-studio',
      isOfficial: true,
      displayName: 'Google AI Studio 官方 API',
      tiers: officialTiers,
      peakValley: false,
      limits,
      notes: batchNote
        ? [batchNote]
        : hasBatch
          ? ['官方基准来自 AA 对照集牌价；Batch 按常见 50% 折扣单列']
          : ['官方基准来自 AA 对照集牌价；本快照 models.dev / OpenRouter 未列该型号端点'],
    },
    {
      providerId: 'google-vertex',
      isOfficial: true,
      displayName: 'Google Cloud Vertex AI',
      tiers: [{ id: 'flat', label: '企业标准', usd: base }],
      peakValley: false,
      limits,
      notes: ['GCP 企业级合规通道，按官方同价 1.00× 登记'],
    },
  ];
  if (!opts.skipUnverifiedGateways) {
    rows.push(
      {
        providerId: 'openrouter',
        displayName: 'OpenRouter',
        tiers: [{ id: 'flat', label: '直连/网关', usd: base }],
        peakValley: false,
        limits,
        notes: ['OpenRouter 官方价直通'],
      },
      {
        providerId: 'vercel-gateway',
        displayName: 'Vercel AI Gateway',
        tiers: [{ id: 'flat', label: '标准转发', usd: base }],
        peakValley: false,
        limits,
        notes: ['转发官方接口口径'],
      },
      {
        providerId: 'nano-gpt',
        displayName: 'Nano-GPT',
        tiers: [{ id: 'flat', label: '加密货币直付', usd: base }],
        peakValley: false,
        limits,
        notes: ['免 KYC 直付通道口径'],
      },
    );
  }
  rows.push({
    providerId: 'aihubmix',
    displayName: 'AIHubMix',
    tiers: [{ id: 'flat', label: '国内中继', usd: markup(base) }],
    peakValley: false,
    limits,
    notes: opts.skipUnverifiedGateways
      ? ['国内中继按约 2.5% 溢价启发式登记；该型号本快照无 OpenRouter 端点']
      : ['微幅溢价约 2.5%'],
  });
  return rows;
}

function openaiSubs(base) {
  return [
    {
      providerId: 'chatgpt-plus',
      planId: 'plus',
      label: 'ChatGPT Plus',
      fee: { amount: 20, currency: 'USD' },
      modelAllowance: { usd: 60, derivation: '每 3 小时旗舰调用配额，折算等效月额度' },
      limits: { fiveHourUSD: 10, weeklyUSD: 30, monthlyUSD: 60 },
      rollingWindow: true,
      softLimit: false,
      quotaConversion: { codingAgentAt874: calcReqs(60, 0.874, base) },
    },
    {
      providerId: 'chatgpt-pro',
      planId: 'pro',
      label: 'ChatGPT Pro',
      fee: { amount: 200, currency: 'USD' },
      modelAllowance: { usd: 800, derivation: '高额度完整思考模式访问' },
      limits: { fiveHourUSD: 160, weeklyUSD: 400, monthlyUSD: 800 },
      rollingWindow: false,
      softLimit: true,
      quotaConversion: { codingAgentAt874: calcReqs(800, 0.874, base) },
    },
    {
      providerId: 'cline-pass',
      planId: 'monthly',
      label: 'ClinePass 月度',
      fee: { amount: 9.99, currency: 'USD' },
      modelAllowance: { usd: 40, derivation: '旗舰模型高权重消耗' },
      limits: { fiveHourUSD: 8, weeklyUSD: 20, monthlyUSD: 40 },
      rollingWindow: false,
      softLimit: false,
      quotaConversion: { codingAgentAt874: calcReqs(40, 0.874, base) },
    },
    {
      providerId: 'opencode-go',
      planId: 'go',
      label: 'OpenCode Go',
      fee: { amount: 10, currency: 'USD' },
      modelAllowance: { usd: 35, derivation: 'OpenCode 标准旗舰额度' },
      limits: { fiveHourUSD: 7, weeklyUSD: 17.5, monthlyUSD: 35 },
      rollingWindow: false,
      softLimit: false,
      quotaConversion: { codingAgentAt874: calcReqs(35, 0.874, base) },
    },
    {
      providerId: 'command-code',
      planId: 'goat',
      label: 'Command Code GOAT',
      fee: { amount: 10, currency: 'USD' },
      modelAllowance: { usd: 45, derivation: 'GOAT 套餐额度' },
      limits: { fiveHourUSD: 9, weeklyUSD: 22.5, monthlyUSD: 45 },
      rollingWindow: true,
      softLimit: false,
      quotaConversion: { codingAgentAt874: calcReqs(45, 0.874, base) },
    },
  ];
}

function anthropicSubs(base) {
  return [
    {
      providerId: 'claude-pro',
      planId: 'pro',
      label: 'Claude Pro',
      fee: { amount: 20, currency: 'USD' },
      modelAllowance: { usd: 60, derivation: '总表套餐档：Claude Pro $20，额度按 3× 月费启发式折算' },
      limits: { fiveHourUSD: 10, weeklyUSD: 30, monthlyUSD: 60 },
      rollingWindow: true,
      softLimit: false,
      quotaConversion: { codingAgentAt874: calcReqs(60, 0.874, base) },
    },
    {
      providerId: 'claude-max-5x',
      planId: 'max5',
      label: 'Claude Max 5×',
      fee: { amount: 100, currency: 'USD' },
      modelAllowance: { usd: 400, derivation: '总表 Max 5x $100' },
      limits: { fiveHourUSD: 80, weeklyUSD: 200, monthlyUSD: 400 },
      rollingWindow: true,
      softLimit: false,
      quotaConversion: { codingAgentAt874: calcReqs(400, 0.874, base) },
    },
    {
      providerId: 'claude-max-20x',
      planId: 'max20',
      label: 'Claude Max 20×',
      fee: { amount: 200, currency: 'USD' },
      modelAllowance: { usd: 800, derivation: '总表 Max 20x $200；Opus 折算约 ¥0.2033/M' },
      limits: { fiveHourUSD: 160, weeklyUSD: 400, monthlyUSD: 800 },
      rollingWindow: true,
      softLimit: false,
      quotaConversion: { codingAgentAt874: calcReqs(800, 0.874, base) },
    },
    {
      providerId: 'cline-pass',
      planId: 'monthly',
      label: 'ClinePass 月度',
      fee: { amount: 9.99, currency: 'USD' },
      modelAllowance: { usd: 40, derivation: '编程 Agent 渠道' },
      limits: { fiveHourUSD: 8, weeklyUSD: 20, monthlyUSD: 40 },
      rollingWindow: false,
      softLimit: false,
      quotaConversion: { codingAgentAt874: calcReqs(40, 0.874, base) },
    },
    {
      providerId: 'opencode-go',
      planId: 'go',
      label: 'OpenCode Go',
      fee: { amount: 10, currency: 'USD' },
      modelAllowance: { usd: 35, derivation: 'OpenCode 标准额度' },
      limits: { fiveHourUSD: 7, weeklyUSD: 17.5, monthlyUSD: 35 },
      rollingWindow: false,
      softLimit: false,
      quotaConversion: { codingAgentAt874: calcReqs(35, 0.874, base) },
    },
  ];
}

function googleSubs(base) {
  return [
    {
      providerId: 'google-one-ai',
      planId: 'premium',
      label: 'Google One AI Premium',
      fee: { amount: 19.99, currency: 'USD' },
      modelAllowance: { usd: 120, derivation: '含 Gemini Advanced + Workspace 插件支持' },
      limits: { fiveHourUSD: 24, weeklyUSD: 60, monthlyUSD: 120 },
      rollingWindow: false,
      softLimit: false,
      quotaConversion: { codingAgentAt874: calcReqs(120, 0.874, base) },
    },
    {
      providerId: 'google-ai-ultra',
      planId: 'ultra',
      label: 'Google AI Ultra',
      fee: { amount: 249.99, currency: 'USD' },
      modelAllowance: { usd: 800, derivation: '总表 Google AI Ultra 高档；额度按启发式折算' },
      limits: { fiveHourUSD: 160, weeklyUSD: 400, monthlyUSD: 800 },
      rollingWindow: false,
      softLimit: true,
      quotaConversion: { codingAgentAt874: calcReqs(800, 0.874, base) },
    },
    {
      providerId: 'cline-pass',
      planId: 'monthly',
      label: 'ClinePass 月度',
      fee: { amount: 9.99, currency: 'USD' },
      modelAllowance: { usd: 60, derivation: '编程 Agent 渠道' },
      limits: { fiveHourUSD: 12, weeklyUSD: 30, monthlyUSD: 60 },
      rollingWindow: false,
      softLimit: false,
      quotaConversion: { codingAgentAt874: calcReqs(60, 0.874, base) },
    },
    {
      providerId: 'opencode-go',
      planId: 'go',
      label: 'OpenCode Go',
      fee: { amount: 10, currency: 'USD' },
      modelAllowance: { usd: 50, derivation: 'OpenCode 标准额度' },
      limits: { fiveHourUSD: 10, weeklyUSD: 25, monthlyUSD: 50 },
      rollingWindow: false,
      softLimit: false,
      quotaConversion: { codingAgentAt874: calcReqs(50, 0.874, base) },
    },
    {
      providerId: 'command-code',
      planId: 'goat',
      label: 'Command Code GOAT',
      fee: { amount: 10, currency: 'USD' },
      modelAllowance: { usd: 55, derivation: 'GOAT 套餐额度' },
      limits: { fiveHourUSD: 11, weeklyUSD: 27.5, monthlyUSD: 55 },
      rollingWindow: true,
      softLimit: false,
      quotaConversion: { codingAgentAt874: calcReqs(55, 0.874, base) },
    },
  ];
}

function radarAxes(cap) {
  const keys = [
    { key: 'engineering', label: '工程' },
    { key: 'legal', label: '法律' },
    { key: 'strategyAndOps', label: '战略与运营' },
    { key: 'financeAndAccounting', label: '财会' },
    { key: 'economics', label: '经济' },
    { key: 'healthcareAndMedical', label: '医疗健康' },
  ];
  const present = keys.map((k) => cap[k.key]).filter((v) => v != null);
  const mean = present.length ? present.reduce((a, b) => a + b, 0) / present.length : 0;
  return keys.map((k) => ({
    key: k.key,
    label: k.label,
    value: cap[k.key] == null ? mean : cap[k.key],
    estimated: cap[k.key] == null,
  }));
}

function writeOne(spec) {
  const aa = aaBy[spec.aaSlug];
  if (!aa) throw new Error('AA snapshot missing: ' + spec.aaSlug);

  const base = {
    inputMiss: aa.price1mInputTokens,
    inputHit: aa.cacheHitPrice,
    output: aa.price1mOutputTokens,
  };
  const batch = half(base);
  const limits = {
    contextTokens: aa.contextWindowTokens || 1000000,
    maxOutputTokens: 128000,
  };
  const intelRank = RANKED.findIndex((m) => m.slug === spec.aaSlug) + 1;
  const costRank =
    aa.costPerTaskUSD == null
      ? null
      : COST_RANKED.findIndex((m) => m.slug === spec.aaSlug) + 1;
  const cap = aa.capabilities || {};
  const hasBatch = spec.hasBatch !== false;

  const dir = path.join(ROOT, 'models', spec.slug);
  fs.mkdirSync(path.join(dir, 'benchmarks'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'channels'), { recursive: true });

  const vision = spec.vendor !== 'unknown';
  const modelJson = {
    $schema: '自描述。模型身份层。',
    _meta: {
      generatedAt: '2026-10-08',
      sources: ['aa-peers', 'openrouter-models', 'modelsdev'],
    },
    slug: spec.slug,
    displayName: aa.name,
    vendor: spec.vendor,
    vendorDisplay: spec.vendorDisplay,
    family: spec.family,
    tier: spec.tier,
    apiModelIds: { official: spec.officialId },
    release: {
      date: aa.releaseDate,
      knowledgeCutoff: null,
      deprecated: false,
    },
    openness: {
      openWeights: !!aa.isOpenWeights,
      license: aa.license || 'Proprietary',
      opennessIndex: 0,
    },
    architecture: { sizeClass: spec.vendor === 'google' ? 'frontier-multimodal' : 'frontier-multimodal' },
    limits,
    capabilities: {
      reasoning: { supported: true, default: true },
      vision,
      toolCalls: true,
      jsonOutput: true,
      inputModalities: spec.vendor === 'google' ? ['text', 'image', 'audio', 'video'] : ['text', 'image'],
      outputModalities: ['text'],
    },
    speed: {
      timePerTaskSec: aa.timePerTaskSec,
      outputTokensPerTask: aa.outputTokensPerTask,
    },
    baseline: {
      providerId:
        spec.channelKind === 'openai'
          ? 'openai-official'
          : spec.channelKind === 'google'
            ? 'google-ai-studio'
            : 'anthropic-official',
      currency: 'USD',
      unit: 'per 1M tokens',
      tiers: hasBatch
        ? [
            { id: 'standard', label: '标准按量', usd: base },
            { id: 'batch', label: 'Batch API (50%)', usd: batch },
          ]
        : [{ id: 'standard', label: '标准按量', usd: base }],
    },
    card: { radar: { shape: 'hexagon', axesCount: 6, axes: radarAxes(cap) } },
    page: {
      file: spec.slug + '.html',
      title: spec.displayName,
      pills: spec.pills,
      endpointPattern: spec.endpointPattern || null,
      metric1: spec.metric1 || null,
      specialty: spec.specialty || null,
    },
  };
  fs.writeFileSync(path.join(dir, 'model.json'), JSON.stringify(modelJson, null, 2), 'utf8');

  const aaJson = {
    $schema: '自描述。AA 榜单口径评测结果。',
    _meta: { generatedAt: '2026-10-08', sourceRefs: ['aa-peers'] },
    boards: {
      artificialAnalysis: {
        displayName: 'Artificial Analysis',
        indexName: 'Artificial Analysis Intelligence Index',
        indexVersion: 'v4.3.2',
        modelEntryName: aa.name,
        intelligenceIndex: aa.intelligenceIndex,
        snapshotPeerCount: AA.models.length,
        rankings: [
          {
            key: 'intelligence',
            label: 'Intelligence',
            rank: intelRank,
            of: AA.models.length,
            note: '本快照 25 个对照模型，不是全站 117 榜',
          },
          costRank
            ? {
                key: 'cost',
                label: 'Cost',
                rank: costRank,
                of: COST_RANKED.length,
                note: aa.costPerTaskUSD != null ? `$${aa.costPerTaskUSD.toFixed(3)}/任务` : '',
              }
            : null,
        ].filter(Boolean),
        capabilities: cap,
        costProfile: {
          price1mInputTokens: aa.price1mInputTokens,
          price1mOutputTokens: aa.price1mOutputTokens,
          cacheHitPrice: aa.cacheHitPrice,
          price1mBlended7To2To1: aa.price1mBlended7To2To1,
          costPerTaskUSD: aa.costPerTaskUSD,
          timePerTaskSec: aa.timePerTaskSec,
          outputTokensPerTask: aa.outputTokensPerTask,
        },
      },
    },
  };
  fs.writeFileSync(path.join(dir, 'benchmarks/aa.json'), JSON.stringify(aaJson, null, 2), 'utf8');

  const channels =
    spec.channelKind === 'openai'
      ? openaiChannels(base, batch, limits)
      : spec.channelKind === 'google'
        ? googleChannels(base, limits, hasBatch, spec.batchNote, {
            skipUnverifiedGateways: !!spec.skipUnverifiedGateways,
          })
        : anthropicChannels(base, batch, limits);

  const baselineId =
    spec.channelKind === 'openai'
      ? 'openai-official'
      : spec.channelKind === 'google'
        ? 'google-ai-studio'
        : 'anthropic-official';
  const baselineLabel =
    spec.channelKind === 'openai'
      ? 'OpenAI 官方（基准）'
      : spec.channelKind === 'google'
        ? 'Google AI Studio 官方（基准）'
        : 'Anthropic 官方（基准）';

  const apiJson = {
    $schema: '自描述。按量渠道列表。',
    baseline: {
      providerId: baselineId,
      label: baselineLabel,
      tiers: hasBatch
        ? [
            { id: 'standard', label: '标准按量', usd: base },
            { id: 'batch', label: 'Batch API (50%)', usd: batch },
          ]
        : [
            { id: 'standard', label: '标准按量', usd: base },
            { id: 'standard-dup', label: '同档（快照无第二价）', usd: base },
          ],
    },
    channels,
  };
  fs.writeFileSync(path.join(dir, 'channels/api.json'), JSON.stringify(apiJson, null, 2), 'utf8');

  const plans =
    spec.channelKind === 'openai'
      ? openaiSubs(base)
      : spec.channelKind === 'google'
        ? googleSubs(base)
        : anthropicSubs(base);
  const subJson = {
    $schema: '自描述。订阅制渠道列表。',
    baselinePrice: `$${base.inputMiss} / $${base.inputHit} / $${base.output}`,
    plans,
  };
  fs.writeFileSync(path.join(dir, 'channels/subscription.json'), JSON.stringify(subJson, null, 2), 'utf8');

  console.log('wrote', spec.slug, 'AA', aa.intelligenceIndex.toFixed(3), '#' + intelRank + '/' + AA.models.length);
}

export { SPECS, writeOne };

const isMain =
  process.argv[1] &&
  path.normalize(fileURLToPath(import.meta.url)) === path.normalize(path.resolve(process.argv[1]));
if (isMain) {
  for (const spec of SPECS) writeOne(spec);
  console.log('big3 data layer done:', SPECS.length, 'models');
}
