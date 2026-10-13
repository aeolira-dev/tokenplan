/**
 * 按 unified-template.generatePage() 为国外三巨头缺页型号出 HTML。
 * 只读 models/<slug> 数据层 + models.dev 端点快照。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePage, blend, money, tok, ratioTxt, ratioCls, esc, ROOT, SITE_DIR } from './unified-template.mjs';
import { SPECS } from './generate-big3-data.mjs';

const mdData = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'raw/_global/2026-10-08/modelsdev.json'), 'utf8'),
);

function extractEndpointsFromModelsDev(pattern) {
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
  const list = [];
  for (const [prov, val] of Object.entries(mdData)) {
    const models = val?.models || val;
    if (!models || typeof models !== 'object') continue;
    for (const [mid, m] of Object.entries(models)) {
      if (re.test(mid) || re.test(m?.id || '') || re.test(m?.name || '')) {
        const cost = m.cost || m.pricing || {};
        const miss = cost.input ?? cost.prompt ?? null;
        const hit = cost.cache_read ?? cost.input_cache_read ?? null;
        const out = cost.output ?? cost.completion ?? null;
        if (miss == null || out == null) continue;
        list.push({
          providerName: prov,
          usd: { inputMiss: miss, inputHit: hit, output: out },
          contextTokens: m.limit?.context || m.limit?.input || 1048576,
          maxOutputTokens: m.limit?.output || 65536,
          note: m.name || prov,
        });
      }
    }
  }
  return list.sort((a, b) => (a.usd.inputMiss ?? 99) - (b.usd.inputMiss ?? 99));
}

function renderApiRows(api, wantTier2, baselineTier1, baselineTier2) {
  const offB = baselineTier1;
  const peakB = baselineTier2 || baselineTier1;
  return api.channels
    .filter((ch) => ch.available !== false && ch.tiers?.length)
    .map((ch) => {
      let t = ch.tiers[0];
      if (ch.peakValley || ch.tiers.length > 1) {
        t = wantTier2 ? ch.tiers[1] || ch.tiers[0] : ch.tiers[0];
      }
      const useCny = ch.priceCurrency === 'CNY';
      const cur = useCny ? 'CNY' : 'USD';
      const price = useCny ? t?.cny : t?.usd;
      const base = useCny ? (wantTier2 ? peakB.cny : offB.cny) : wantTier2 ? peakB.usd : offB.usd;
      const b = blend(price);
      const bb = blend(base);
      const ratio = b != null && bb ? b / bb : null;
      const credits = t?.creditsPer1M;
      const notes = ch.notes || [];
      const publicNote =
        notes.find((n) => !n.includes('⚠️')) || (notes[0] ? notes[0].replace(/^⚠️\s*/, '') : '');
      return `<tr data-id="${ch.providerId}">
        <td>${ch.isOfficial ? '<span class="badge">官方</span> ' : ''}${esc(ch.displayName)}${ch.peakValley ? '<div class="sub">时段浮动</div>' : ''}</td>
        <td>${credits ? '积分' : cur}</td>
        <td class="num">${credits ? credits.inputMiss + ' 分' : money(price?.inputMiss, cur)}</td>
        <td class="num">${credits ? credits.inputHit + ' 分' : price?.inputHit == null ? '<span class="na">未单独公布</span>' : money(price?.inputHit, cur)}</td>
        <td class="num">${credits ? credits.output + ' 分' : money(price?.output, cur)}</td>
        <td class="num">${b == null ? '—' : money(b, cur)}</td>
        <td class="num"><span class="x ${ratioCls(ratio)}">${credits ? '积分' : ratioTxt(ratio)}</span></td>
        <td class="num">${tok(ch.limits?.contextTokens)}</td>
        <td class="num">${tok(ch.limits?.maxOutputTokens)}</td>
        <td class="note">${esc(publicNote)}</td>
      </tr>`;
    })
    .join('\n');
}

function renderEndpointsRows(endpoints, baseUsd) {
  const bb = blend(baseUsd);
  return endpoints
    .map((e) => {
      const b = blend(e.usd);
      const ratio = b != null && bb ? b / bb : null;
      return `<tr>
      <td>${esc(e.providerName)}${e.implicitCache ? ' <span class="badge">隐式缓存</span>' : ''}</td>
      <td class="num">${money(e.usd.inputMiss, 'USD')}</td>
      <td class="num">${e.usd.inputHit == null ? '<span class="na">同输入</span>' : money(e.usd.inputHit, 'USD')}</td>
      <td class="num">${money(e.usd.output, 'USD')}</td>
      <td class="num">${b == null ? '—' : money(b, 'USD')}</td>
      <td class="num"><span class="x ${ratioCls(ratio)}">${ratioTxt(ratio)}</span></td>
      <td class="num">${tok(e.maxOutputTokens)}</td>
      <td class="note">${esc(e.note || e.quantization || '')}${e.uptimeLast1d != null ? ` · 1d ${e.uptimeLast1d}%` : ''}</td>
    </tr>`;
    })
    .join('\n');
}

function renderSubRows(sub) {
  return sub.plans
    .map((p) => {
      const fee = p.fee.currency === 'CNY' ? `¥${p.fee.amount}/月` : `$${p.fee.amount}/月`;
      const allow =
        p.modelAllowance?.usd != null
          ? `$${p.modelAllowance.usd}`
          : p.limits?.monthlyCredits != null
            ? `${p.limits.monthlyCredits} 积分`
            : p.softLimit
              ? '无硬额度'
              : '未公布';
      const r = p.quotaConversion?.codingAgentAt874;
      const win = p.rollingWindow ? '滚动窗口' : p.softLimit ? '软限制' : '日历月';
      const h5 = p.limits?.fiveHourUSD != null ? `$${p.limits.fiveHourUSD}` : '—';
      const wk = p.limits?.weeklyUSD != null ? `$${p.limits.weeklyUSD}` : '—';
      const req = r ? Number(r).toLocaleString('en-US') + ' 次' : '—';
      const note = p.modelAllowance?.derivation || p.notes || '';
      return `<tr>
      <td>${esc(p.label)}</td>
      <td class="num">${fee}</td>
      <td class="num">${allow}</td>
      <td class="num">${h5}</td>
      <td class="num">${wk}</td>
      <td>${win}</td>
      <td class="num">${req}</td>
      <td class="note">${esc(note)}</td>
    </tr>`;
    })
    .join('\n');
}

const BRAND = {
  anthropic: {
    name: 'Anthropic',
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#d97757"/>
      <path d="M12 5.2l6.2 13.6h-2.5l-1.15-2.7H9.45L8.3 18.8H5.8L12 5.2zm-1.35 8.4h2.7L12 10.1l-1.35 3.5z" fill="#fff"/>
    </svg>`,
  },
  openai: {
    name: 'OpenAI',
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#10a37f"/>
      <path d="M12 6V18M6 12H18" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  google: {
    name: 'Google DeepMind',
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#1a73e8"/>
    </svg>`,
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
  const vals = RADAR_ORDER.map((o) => {
    const a = byKey[o.key];
    const v = a?.value;
    return {
      slot: o.slot,
      txt: a?.label || o.fallbackTxt,
      val: v == null ? null : Number(v),
      estimated: !!a?.estimated,
    };
  });
  const present = vals.map((v) => v.val).filter((n) => n != null);
  const mean = present.length ? present.reduce((a, b) => a + b, 0) / present.length : 0;
  const filled = vals.map((v) => ({
    ...v,
    val: v.val == null ? mean : v.val,
  }));
  const pts = filled.map((v, i) => {
    const ang = -Math.PI / 2 + i * (Math.PI / 3);
    const r = v.val;
    return `${(r * Math.cos(ang)).toFixed(1)},${(r * Math.sin(ang)).toFixed(1)}`;
  });
  const labels = {};
  for (const v of filled) {
    labels[v.slot] = {
      val: String(Math.round(v.val)),
      txt: v.estimated ? v.txt + '（估）' : v.txt,
    };
  }
  return { mean: String(Math.round(mean)), points: pts.join(' '), labels };
}

function fmtDate(iso) {
  if (!iso) return '—';
  return String(iso).replace(/-/g, '.').slice(0, 10);
}

function inputMods(model) {
  const set = new Set(model.capabilities?.inputModalities || ['text']);
  return [
    { on: set.has('text'), t: 'T' },
    { on: set.has('image'), t: '图' },
    { on: set.has('audio'), t: '声' },
    { on: set.has('video'), t: '影' },
  ];
}

function outputMods(model) {
  const set = new Set(model.capabilities?.outputModalities || ['text']);
  return [
    { on: set.has('text'), t: 'T' },
    { on: set.has('image'), t: '图' },
    { on: set.has('audio'), t: '声' },
    { on: set.has('video'), t: '影' },
  ];
}

function buildOne(spec) {
  const dir = path.join(ROOT, 'models', spec.slug);
  const model = JSON.parse(fs.readFileSync(path.join(dir, 'model.json'), 'utf8'));
  const aaFile = JSON.parse(fs.readFileSync(path.join(dir, 'benchmarks/aa.json'), 'utf8'));
  const api = JSON.parse(fs.readFileSync(path.join(dir, 'channels/api.json'), 'utf8'));
  const sub = JSON.parse(fs.readFileSync(path.join(dir, 'channels/subscription.json'), 'utf8'));
  const aa = aaFile.boards.artificialAnalysis;
  const stdB = api.baseline.tiers[0];
  const altB = api.baseline.tiers[1] || api.baseline.tiers[0];
  const pattern = model.page?.endpointPattern || spec.endpointPattern;
  const endpoints = pattern ? extractEndpointsFromModelsDev(pattern) : [];
  const brand = BRAND[spec.vendor];
  const radar = radarFromAxes(model.card?.radar?.axes);
  const ii = aa.intelligenceIndex;
  const intelRank = aa.rankings.find((r) => r.key === 'intelligence');
  const costRank = aa.rankings.find((r) => r.key === 'cost');
  const cap = aa.capabilities || {};
  const blendUsd = blend(stdB.usd);
  const costTask = aa.costProfile?.costPerTaskUSD;
  const tps =
    aa.costProfile?.timePerTaskSec && aa.costProfile?.outputTokensPerTask
      ? aa.costProfile.outputTokensPerTask / aa.costProfile.timePerTaskSec
      : model.speed?.timePerTaskSec && model.speed?.outputTokensPerTask
        ? model.speed.outputTokensPerTask / model.speed.timePerTaskSec
        : null;
  const peerN = aa.snapshotPeerCount || intelRank?.of || 25;
  const m1spec = model.page?.metric1 || spec.metric1 || {};
  let metric1;
  if (m1spec.num) {
    metric1 = {
      en: m1spec.en,
      zh: m1spec.zh,
      num: m1spec.num,
      sub: m1spec.sub || '',
      rankNum: String(m1spec.rankNum),
      rankTotal: String(m1spec.rankTotal),
      barPct: m1spec.barPct,
    };
  } else {
    const of = costRank?.of || peerN;
    const rk = costRank?.rank;
    const bar = rk && of ? Math.max(8, 100 * (1 - (rk - 1) / of)) : 50;
    metric1 = {
      en: m1spec.en || 'AA Cost / Task',
      zh: m1spec.zh || '对照集任务成本',
      num: costTask == null ? '—' : '$' + costTask.toFixed(2),
      sub: m1spec.note || costRank?.note || '',
      rankNum: rk == null ? '—' : String(rk),
      rankTotal: String(of),
      barPct: bar.toFixed(1) + '%',
    };
  }
  const metric2 = {
    en: 'AA Intelligence Index',
    zh: 'AA综合指数',
    num: ii.toFixed(1),
    sub: `对照集 ${peerN} 模` + (costTask != null ? ` · $${costTask.toFixed(2)}/任务` : ''),
    rankNum: String(intelRank?.rank ?? '—'),
    rankTotal: String(peerN),
    barPct: Math.min(100, ii).toFixed(1) + '%',
  };
  const ctx = model.limits?.contextTokens || 1000000;
  const maxOut = model.limits?.maxOutputTokens || 128000;
  const miss = stdB.usd.inputMiss;
  const hit = stdB.usd.inputHit;
  const out = stdB.usd.output;
  const specialty = model.page?.specialty || spec.specialty || '';
  const file = model.page?.file || spec.slug + '.html';
  const title = model.page?.title || spec.displayName;
  const html = generatePage({
    currentFile: file,
    title,
    brandSvg: brand.svg,
    brandName: brand.name,
    h1Title: title,
    pills: model.page?.pills || spec.pills,
    metric1,
    metric2,
    radarMean: radar.mean,
    radarPolygonPoints: radar.points,
    radarLabels: radar.labels,
    radarSource: 'artificialanalysis.ai · 2026-10-08 对照集',
    facts: [
      { k: '发布日期', v: fmtDate(model.release?.date) },
      { k: '输入模态', mods: inputMods(model) },
      { k: '输出模态', mods: outputMods(model) },
      { k: '上下文窗口', v: tok(ctx) + ' token' },
      {
        k: '输出速度',
        v: tps == null ? '本快照未给 tok/s' : tps.toFixed(1) + ' token/s（任务折算）',
      },
      {
        k: '综合价格',
        v: blendUsd == null ? '—' : money(blendUsd, 'USD') + ' /M',
        tag: costRank ? '#' + costRank.rank : undefined,
      },
    ],
    sideKv: [
      { k: '厂商', v: model.vendorDisplay },
      { k: '开源', v: model.openness?.openWeights ? model.openness.license : '闭源商业 API' },
      { k: '架构', v: model.architecture?.sizeClass || 'frontier-multimodal' },
      { k: '官方 ID', v: `<code>${esc(model.apiModelIds?.official || spec.officialId)}</code>` },
      {
        k: '能力',
        v:
          spec.vendor === 'google'
            ? '原生多模态 · 工具调用 · JSON'
            : '高阶推理 · 视觉输入 · 工具调用',
      },
      { k: '窗口', v: `${tok(ctx)} 上下文 / ${tok(maxOut)} 最大输出` },
      {
        k: '速度',
        v:
          model.speed?.timePerTaskSec != null
            ? `对照集 ${model.speed.timePerTaskSec.toFixed(0)} s/任务`
            : '本快照未给时延',
      },
    ],
    sideChips: [
      `AA 智能 <b>#${intelRank?.rank ?? '—'}/${peerN}</b> (${ii.toFixed(2)})`,
      cap.economics != null ? `经济学 <b>${cap.economics.toFixed(2)}</b>` : null,
      cap.legal != null ? `法律推理 <b>${cap.legal.toFixed(2)}</b>` : null,
      cap.engineering != null ? `工程 <b>${cap.engineering.toFixed(2)}</b>` : null,
      blendUsd != null ? `7:2:1 综合 <b>${money(blendUsd, 'USD')}/M</b>` : null,
      specialty ? esc(specialty) : null,
    ].filter(Boolean),
    sideCalls: [
      `<b>定位</b>：${esc(specialty || title)}。本页 AA 名次按 2026-10-08 对照集 ${peerN} 个模型计算，不是公开全站 117 榜；官方牌价取自同一快照的 AA 字段。`,
      `<b>渠道比价要点</b>：官方标准按量为输入 ${money(miss, 'USD')} / 缓存 ${money(hit, 'USD')} / 输出 ${money(out, 'USD')}（7:2:1 综合 ${money(blendUsd, 'USD')}/M）。第二档为 Batch 常见 50% 折扣。第三方网关按 1.00× 平价登记，AIHubMix 约 2.5% 溢价。` +
        (endpoints.length === 0
          ? ' 本快照 models.dev / OpenRouter 未列出该型号计费端点，端点表留空，不以臆造行填充。'
          : ''),
    ],
    toolbar: {
      btn1Text: '标准按量模式',
      btn2Text: '对比 Batch 档 (50% 折扣)',
      hint: `官方基准 ${money(miss, 'USD')} / ${money(hit, 'USD')} / ${money(out, 'USD')}。倍数 = 渠道 7:2:1 / 官方同档。`,
    },
    apiTable: {
      getTbody1: () => renderApiRows(api, false, stdB, altB),
      getTbody2: () => renderApiRows(api, true, stdB, altB),
    },
    endpointsTable: {
      title:
        endpoints.length > 0
          ? `多供应商与网关端点实测（共 ${endpoints.length} 个端点）`
          : '多供应商与网关端点实测（本快照 models.dev 未列出该型号）',
      getTbody: () =>
        endpoints.length
          ? renderEndpointsRows(endpoints, stdB.usd)
          : `<tr><td colspan="8" class="note">2026-10-08 models.dev 快照没有匹配 ${esc(pattern || spec.slug)} 的计费端点，故不造行。官方牌价仍以 AA 对照集为准。</td></tr>`,
    },
    subTable: {
      hint: `额度按官方标准基准（${money(miss, 'USD')} / ${money(hit, 'USD')} / ${money(out, 'USD')}）统一折算。编程 Agent 取 87.4% 缓存率口径下的可用请求数。`,
      getTbody: () => renderSubRows(sub),
    },
    footerNote:
      '数据来源：Artificial Analysis 对照集、OpenRouter、models.dev、各官方文档（2026-10-08 快照）。本页不含个人实测。未收录无 AA 快照的 GPT-6 Sol / Claude Mythos 5 / Gemini 3.8 Omni / Gemma 4。',
  });
  fs.writeFileSync(path.join(SITE_DIR, file), html, 'utf8');
  console.log('Built site/' + file, 'endpoints', endpoints.length);
}

export function buildAllBig3() {
  for (const spec of SPECS) buildOne(spec);
}

const isMain =
  process.argv[1] &&
  path.normalize(path.resolve(process.argv[1])) ===
    path.normalize(fileURLToPath(import.meta.url));
if (isMain) buildAllBig3();
