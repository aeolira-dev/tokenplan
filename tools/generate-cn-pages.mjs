/**
 * 国内模型专用出页器。
 * 读取 models/<slug> 数据层，使用 unified-template 生成页面；不把海外 USD 订阅/渠道启发式套到国内模型。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePage, blend, money, tok, ratioTxt, ratioCls, esc, ROOT, SITE_DIR } from './unified-template.mjs';

const CN_SPECS = [
  {
    slug: 'glm-5.3-flash',
    vendor: 'zhipu',
    vendorName: '智谱 AI / Z.ai',
    title: 'GLM-5.3 Flash',
    endpointNote: '2026-10-08 工作区 models.dev 快照未列可核实的国内 GLM-5.3-Flash 计费端点，故不造行；官方人民币牌价见上方渠道表。',
  },
  {
    slug: 'kimi-k3',
    vendor: 'moonshot',
    vendorName: '月之暗面 / Moonshot AI',
    title: 'Kimi K3',
    endpointNote: '本批只核实到 Moonshot 官方 API 价格；聚合目录的端点价格未作为逐端点渠道行，故不造行。',
  },
  {
    slug: 'step-5-preview',
    vendor: 'stepfun',
    vendorName: '阶跃星辰 / StepFun',
    title: 'Step 5 Preview',
    endpointNote: '本批只核实到 StepFun 官方 API 价格；聚合目录未提供可单独核验的国内逐端点渠道，故不造行。',
  },
  {
    slug: 'mimo-v2.6-pro',
    vendor: 'xiaomi',
    vendorName: '小米 / Xiaomi MiMo',
    title: 'MiMo-V2.6-Pro',
    endpointNote: '本批只核实到小米 MiMo 官方国内 API；海外聚合价格仅作交叉证据，未据此造逐端点行。',
  },
];

const BRAND = {
  zhipu: {
    name: '智谱 AI / Z.ai',
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#3b6fd8"/><path d="M6 8.1h12M6 12h8M6 15.9h10" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  },
  moonshot: {
    name: '月之暗面 / Moonshot AI',
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#242936"/><path d="M15.8 5.3a7.3 7.3 0 1 0 2.9 10.8A6.3 6.3 0 1 1 15.8 5.3Z" fill="#fff"/></svg>`,
  },
  stepfun: {
    name: '阶跃星辰 / StepFun',
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#ef8a3b"/><path d="M7 7h10v3H10v2h7v3H7V7Zm0 9h5v2H7v-2Z" fill="#fff"/></svg>`,
  },
  xiaomi: {
    name: '小米 / Xiaomi MiMo',
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#ff6900"/><path d="M6.2 7.2h5.2c1.9 0 3 1 3 2.7V17h-2.5v-6.5c0-.5-.2-.8-.8-.8H8.7V17H6.2V7.2Zm9.8 0h2.5V17H16V7.2Z" fill="#fff"/></svg>`,
  },
};

const RADAR_ORDER = [
  { key: 'engineering', fallbackTxt: '工程', slot: 'top' },
  { key: 'legal', fallbackTxt: '法律', slot: 'tr' },
  { key: 'strategyAndOps', fallbackTxt: '战略与运营', slot: 'br' },
  { key: 'financeAndAccounting', fallbackTxt: '财会', slot: 'bot' },
  { key: 'economics', fallbackTxt: '经济', slot: 'bl' },
  { key: 'healthcareAndMedical', fallbackTxt: '医疗健康', slot: 'tl' },
];

function radarFromAxes(axes) {
  const byKey = Object.fromEntries((axes || []).map((a) => [a.key, a]));
  const values = RADAR_ORDER.map((o) => ({ ...o, value: byKey[o.key]?.value ?? null, label: byKey[o.key]?.label || o.fallbackTxt }));
  const present = values.map((v) => v.value).filter((v) => v != null);
  const mean = present.length ? present.reduce((a, b) => a + b, 0) / present.length : 0;
  const filled = values.map((v) => ({ ...v, value: v.value == null ? mean : v.value }));
  const points = filled.map((v, i) => {
    const angle = -Math.PI / 2 + i * Math.PI / 3;
    return `${(v.value * Math.cos(angle)).toFixed(1)},${(v.value * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
  const labels = Object.fromEntries(filled.map((v) => [v.slot, { val: String(Math.round(v.value)), txt: v.label }]));
  return { mean: String(Math.round(mean)), points, labels };
}

function inputMods(model) {
  const set = new Set(model.capabilities?.inputModalities || ['text']);
  return ['text', 'image', 'audio', 'video'].map((key, i) => ({ on: set.has(key), t: ['T', '图', '声', '影'][i] }));
}

function outputMods(model) {
  const set = new Set(model.capabilities?.outputModalities || ['text']);
  return ['text', 'image', 'audio', 'video'].map((key, i) => ({ on: set.has(key), t: ['T', '图', '声', '影'][i] }));
}

function radarAxisLabel(key) {
  return {
    financeAndAccounting: '财会',
    strategyAndOps: '战略与运营',
    legal: '法律',
    healthcareAndMedical: '医疗健康',
    engineering: '工程',
    economics: '经济',
  }[key] || key;
}

function fmtDate(iso) { return iso ? String(iso).replace(/-/g, '.').slice(0, 10) : '—'; }

function inferCurrency(tier, channel, fallback = 'USD') {
  if (channel?.priceCurrency) return channel.priceCurrency;
  if (tier?.cny) return 'CNY';
  if (tier?.usd) return 'USD';
  return fallback;
}

function priceFor(tier, currency) {
  if (!tier) return null;
  return currency === 'CNY' ? tier.cny : tier.usd;
}

function priceLabel(price, currency) {
  if (!price) return '未核实';
  return `${money(price.inputMiss, currency)} / ${money(price.inputHit, currency)} / ${money(price.output, currency)} /M`;
}

function renderApiRows(api, wantTier2, baselineTier1, baselineTier2, defaultCurrency) {
  const baseTier = wantTier2 ? (baselineTier2 || baselineTier1) : baselineTier1;
  return (api.channels || [])
    .filter((ch) => ch.available !== false && ch.tiers?.length)
    .map((ch) => {
      const t = ch.tiers[wantTier2 ? 1 : 0] || ch.tiers[0];
      const cur = inferCurrency(t, ch, defaultCurrency);
      const price = priceFor(t, cur);
      const basePrice = priceFor(baseTier, cur);
      const b = blend(price);
      const bb = blend(basePrice);
      const ratio = b != null && bb ? b / bb : null;
      const credits = t?.creditsPer1M;
      const notes = Array.isArray(ch.notes) ? ch.notes : ch.notes ? [ch.notes] : [];
      const publicNote = notes.find((n) => !String(n).includes('⚠️')) || notes[0] || '';
      const creditCell = (key) => credits?.[key] == null ? '—' : `${credits[key]} 分`;
      return `<tr data-id="${esc(ch.providerId)}">
        <td>${ch.isOfficial ? '<span class="badge">官方</span> ' : ''}${esc(ch.displayName || ch.providerId)}${ch.peakValley ? '<div class="sub">时段浮动</div>' : ''}</td>
        <td>${credits ? '积分' : cur}</td>
        <td class="num">${credits ? creditCell('inputMiss') : money(price?.inputMiss, cur)}</td>
        <td class="num">${credits ? creditCell('inputHit') : price?.inputHit == null ? '<span class="na">未单独公布</span>' : money(price.inputHit, cur)}</td>
        <td class="num">${credits ? creditCell('output') : money(price?.output, cur)}</td>
        <td class="num">${b == null ? '—' : money(b, cur)}</td>
        <td class="num"><span class="x ${ratioCls(ratio)}">${credits ? '积分口径' : ratioTxt(ratio)}</span></td>
        <td class="num">${tok(ch.limits?.contextTokens)}</td>
        <td class="num">${tok(ch.limits?.maxOutputTokens)}</td>
        <td class="note">${esc(publicNote)}</td>
      </tr>`;
    }).join('\n');
}

function renderSubRows(sub) {
  const plans = sub.plans || [];
  if (!plans.length) {
    return `<tr><td colspan="8" class="note">${esc(sub.note || '本批没有已核实的官方订阅套餐，故不造行；按量 API 价格见上表。')}</td></tr>`;
  }
  return plans.map((p) => {
    const fee = p.fee?.amount == null
      ? '动态'
      : p.fee?.verification === 'official-historical-reference'
        ? `历史参考 ${p.fee.currency === 'CNY' ? '¥' : '$'}${p.fee.amount}/月`
        : p.fee?.verification === 'official-doc-reference'
          ? `参考 ${p.fee.currency === 'CNY' ? '¥' : '$'}${p.fee.amount}/月`
          : `${p.fee.currency === 'CNY' ? '¥' : '$'}${p.fee.amount}/月`;
    const unit = p.modelAllowance?.unit === 'credits' ? 'credits' : (p.modelAllowance?.unit || '积分');
    const allow = p.modelAllowance?.credits != null ? `${p.modelAllowance.credits.toLocaleString('zh-CN')} ${unit}` : '未公布';
    const five = p.limits?.fiveHourCredits != null ? `${p.limits.fiveHourCredits.toLocaleString('zh-CN')} 积分` : p.limits?.fiveHourUSD != null ? `$${p.limits.fiveHourUSD}` : '—';
    const week = p.limits?.weeklyCredits != null ? `${p.limits.weeklyCredits.toLocaleString('zh-CN')} 积分` : p.limits?.weeklyUSD != null ? `$${p.limits.weeklyUSD}` : '—';
    const win = p.rollingWindow ? '滚动窗口' : p.softLimit ? '软限制' : '月度额度';
    const req = p.quotaConversion?.codingAgentAt874;
    const note = p.modelAllowance?.derivation || p.notes || '';
    return `<tr>
      <td>${esc(p.label || p.planId)}</td>
      <td class="num">${fee}</td>
      <td class="num">${allow}</td>
      <td class="num">${five}</td>
      <td class="num">${week}</td>
      <td>${esc(win)}</td>
      <td class="num">${req == null ? '未折算' : Number(req).toLocaleString('zh-CN') + ' 次'}</td>
      <td class="note">${esc(note)}</td>
    </tr>`;
  }).join('\n');
}

function capabilitySummary(model) {
  const caps = model.capabilities || {};
  const labels = [];
  if (caps.vision) labels.push('视觉');
  if ((caps.inputModalities || []).includes('audio')) labels.push('音频');
  if ((caps.inputModalities || []).includes('video')) labels.push('视频');
  if (caps.toolCalls) labels.push('工具调用');
  if (caps.reasoning?.supported) labels.push('推理');
  if (caps.jsonOutput) labels.push('JSON');
  return labels.join(' · ') || '文本生成';
}

function buildOne(spec) {
  const dir = path.join(ROOT, 'models', spec.slug);
  const model = JSON.parse(fs.readFileSync(path.join(dir, 'model.json'), 'utf8'));
  const aa = JSON.parse(fs.readFileSync(path.join(dir, 'benchmarks/aa.json'), 'utf8')).boards.artificialAnalysis;
  const lmarena = JSON.parse(fs.readFileSync(path.join(dir, 'benchmarks/lmarena.json'), 'utf8')).boards.text;
  const api = JSON.parse(fs.readFileSync(path.join(dir, 'channels/api.json'), 'utf8'));
  const sub = JSON.parse(fs.readFileSync(path.join(dir, 'channels/subscription.json'), 'utf8'));
  const baselineTier1 = api.baseline.tiers[0];
  const baselineTier2 = api.baseline.tiers[1] || null;
  const baselineCurrency = model.baseline?.currency || inferCurrency(baselineTier1, api.channels?.[0], 'USD');
  const baselinePrice1 = priceFor(baselineTier1, baselineCurrency);
  const baselinePrice2 = priceFor(baselineTier2, baselineCurrency);
  const officialBlend = blend(baselinePrice1);
  const radar = radarFromAxes(model.card?.radar?.axes);
  const ii = aa.intelligenceIndex;
  const aaCaps = aa.capabilities || {};
  const radarAxes = Object.entries(aaCaps)
    .filter(([key, value]) => !key.startsWith('_') && typeof value === 'number')
    .map(([key, value]) => ({ key, label: radarAxisLabel(key), value }));
  const radarFromAa = radarFromAxes(radarAxes);
  const effectiveRadar = radarAxes.length >= 6 ? radarFromAa : radar;
  const intelRank = aa.rankings?.find((r) => r.key === 'intelligence');
  const costTask = aa.costProfile?.costPerTaskUSD;
  const lOverall = lmarena.categories?.overall;
  const brand = BRAND[spec.vendor || model.vendor] || BRAND.zhipu;
  const metric1Source = model.page?.metric1 || {};
  const metric1 = {
    en: metric1Source.en || 'LMArena Overall',
    zh: metric1Source.zh || '盲投总榜',
    num: metric1Source.num || (lOverall ? `#${lOverall.rank}` : '—'),
    sub: metric1Source.sub || (lOverall ? `${lOverall.rating.toFixed(1)} · ${lOverall.votes.toLocaleString('zh-CN')} 票` : '快照未列'),
    rankNum: metric1Source.rankNum || (lOverall?.rank == null ? '—' : String(lOverall.rank)),
    rankTotal: metric1Source.rankTotal || '—',
    barPct: metric1Source.barPct || (lOverall ? '72%' : '—'),
  };
  const metric2 = {
    en: 'AA Intelligence Index',
    zh: 'AA 综合指数',
    num: ii == null ? '—' : ii.toFixed(1),
    sub: `对照集${intelRank?.of || '—'}模` + (costTask == null ? '' : ` · $${costTask.toFixed(2)}/任务`),
    rankNum: intelRank?.rank == null ? '—' : String(intelRank.rank),
    rankTotal: String(intelRank?.of || '—'),
    barPct: ii == null ? '—' : `${Math.min(100, ii).toFixed(1)}%`,
  };
  const context = model.limits?.contextTokens;
  const maxOutput = model.limits?.maxOutputTokens;
  const pagePrice = priceLabel(baselinePrice1, baselineCurrency);
  const officialBlendText = officialBlend == null ? '未核实' : `${money(officialBlend, baselineCurrency)} /M`;
  const hasPlans = (sub.plans || []).length > 0;
  const tier1Label = baselineTier1.label || '官方标准按量';
  const tier2Label = baselineTier2 ? (baselineTier2.label || '第二档') : '同档复核（无第二档）';
  const openText = model.openness?.openWeights
    ? `${model.openness.license || '开放权重'} · 权重公开`
    : `${model.openness?.license || '闭源'} · 权重未公开`;
  const sizeText = model.architecture?.totalParametersB == null
    ? '未公布'
    : `${model.architecture.totalParametersB}B 总 / ${model.architecture.activeParametersB ?? '—'}B 激活${model.architecture?.moe ? ' · MoE' : ''}`;
  const html = generatePage({
    currentFile: model.page.file,
    title: model.page.title,
    brandSvg: brand.svg,
    brandName: spec.vendorName || brand.name || model.vendorDisplay,
    coordText: '国内模型 · 图灵坐标',
    h1Title: model.page.title,
    pills: model.page.pills,
    metric1,
    metric2,
    radarMean: effectiveRadar.mean,
    radarPolygonPoints: effectiveRadar.points,
    radarLabels: effectiveRadar.labels,
    radarSource: 'Artificial Analysis · 2026-10-08 工作区对照快照',
    facts: [
      { k: '发布日期', v: fmtDate(model.release?.date) },
      { k: '输入模态', mods: inputMods(model) },
      { k: '输出模态', mods: outputMods(model) },
      { k: '上下文窗口', v: context == null ? '未公布' : tok(context) + ' token' },
      { k: '输出上限', v: maxOutput == null ? '未公布' : tok(maxOutput) + ' token' },
      { k: '官方综合价', v: officialBlendText },
    ],
    posterFooter: { left: '官方牌价与工作区榜单快照分开记账', date: '2026.10.08' },
    sideKv: [
      { k: '厂商', v: esc(model.vendorDisplay || spec.vendorName) },
      { k: '开源', v: esc(openText) },
      { k: '规模', v: esc(sizeText) },
      { k: '官方 ID', v: `<code>${esc(model.apiModelIds?.official)}</code>` },
      { k: '能力', v: esc(capabilitySummary(model)) },
      { k: '窗口', v: `${tok(context)} 上下文 / ${tok(maxOutput)} 最大输出` },
      { k: '速度', v: model.speed?.timePerTaskSec ? `AA 对照集 ${model.speed.timePerTaskSec.toFixed(0)} s/任务` : '本快照未给时延' },
    ],
    sideChips: [
      `AA 智能 <b>#${intelRank?.rank ?? '—'}/${intelRank?.of ?? '—'}</b> (${ii == null ? '—' : ii.toFixed(2)})`,
      `LMArena 总榜 <b>#${lOverall?.rank ?? '—'}</b>`,
      `官方 7:2:1 <b>${esc(officialBlendText)}</b>`,
      `上下文 <b>${tok(context)}</b>`,
      model.openness?.openWeights ? '开放权重' : '闭源 API',
      hasPlans ? '官方额度计划已登记' : '官方 API 按量',
    ],
    sideCalls: [
      `<b>定位</b>：${esc(model.page.specialty)}。AA 与 LMArena 数值来自工作区 2026-10-08 快照，不等同于当前实时全站排名。`,
      `<b>价格口径</b>：官方${esc(tier1Label)}为 ${esc(pagePrice)}；AA 的 $${aa.costProfile?.price1mInputTokens ?? '—'}/$${aa.costProfile?.cacheHitPrice ?? '—'}/$${aa.costProfile?.price1mOutputTokens ?? '—'} 仅作跨模型对照，不与官方 ${baselineCurrency} 渠道混算。`,
    ],
    toolbar: {
      btn1Text: tier1Label,
      btn2Text: tier2Label,
      hint: `官方基准 ${pagePrice}；${baselineTier2 ? `第二档为 ${priceLabel(baselinePrice2, baselineCurrency)}。` : '官方快照未核实第二时段，切换项仅用于复核同一档。'}`,
    },
    apiTable: {
      getTbody1: () => renderApiRows(api, false, baselineTier1, baselineTier2, baselineCurrency),
      getTbody2: () => renderApiRows(api, true, baselineTier1, baselineTier2, baselineCurrency),
    },
    endpointsTable: {
      title: '多供应商与网关端点（本批未列可核实逐端点渠道）',
      getTbody: () => `<tr><td colspan="8" class="note">${esc(spec.endpointNote)}</td></tr>`,
    },
    subTable: {
      hint: hasPlans
        ? `${model.displayName} 的计划/Token Plan 与按量 API 分开记账；历史参考或动态金额已在行内标记，不把额度直接换算成 token 价格。`
        : `${model.displayName} 本批没有已核实的官方订阅套餐；不能把会员、聚合平台或未核实 Step Plan 当成当前模型 API 额度。`,
      getTbody: () => renderSubRows(sub),
    },
    footerNote: `数据来源：${spec.vendorName || model.vendorDisplay} 官方模型/定价文档、Artificial Analysis 对照快照、LMArena 工作区快照及聚合目录交叉资料（均按 2026-10-08 记录）。本页不含个人实测；动态订阅金额与可用性以官方页面当前展示为准。`,
  });
  fs.writeFileSync(path.join(SITE_DIR, model.page.file), html, 'utf8');
  console.log(`Built site/${model.page.file} (国内) api ${api.channels?.length || 0}`);
}

export function buildAllCn() {
  for (const spec of CN_SPECS) buildOne(spec);
}

const isMain = process.argv[1] && path.normalize(path.resolve(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url));
if (isMain) buildAllCn();
