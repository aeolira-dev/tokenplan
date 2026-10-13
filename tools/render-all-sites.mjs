import fs from 'fs';
import path from 'path';
import { generatePage, blend, money, tok, ratioTxt, ratioCls, esc, ROOT, SITE_DIR } from './unified-template.mjs';
import { buildAllBig3 } from './generate-big3-pages.mjs';
import { buildAllCn } from './generate-cn-pages.mjs';

const mdData = JSON.parse(fs.readFileSync(path.join(ROOT, 'raw/_global/2026-10-08/modelsdev.json'), 'utf8'));

// 通用提取 modelsdev 上游端点函数
function extractEndpointsFromModelsDev(pattern, baseUsd) {
  const list = [];
  for (const [prov, val] of Object.entries(mdData)) {
    const models = val?.models || val;
    if (!models || typeof models !== 'object') continue;
    for (const [mid, m] of Object.entries(models)) {
      if (pattern.test(mid) || pattern.test(m?.id || '') || pattern.test(m?.name || '')) {
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
          note: m.name || prov
        });
      }
    }
  }
  return list.sort((a,b) => (a.usd.inputMiss ?? 99) - (b.usd.inputMiss ?? 99));
}

// 通用渲染渠道行
function renderApiRows(api, wantTier2, baselineTier1, baselineTier2) {
  const offB = baselineTier1;
  const peakB = baselineTier2;
  return api.channels
    .filter(ch => ch.available !== false && ch.tiers?.length)
    .map(ch => {
      let t = ch.tiers[0];
      if (ch.peakValley || ch.tiers.length > 1) {
        t = wantTier2 ? (ch.tiers[1] || ch.tiers[0]) : ch.tiers[0];
      }
      const useCny = ch.priceCurrency === 'CNY';
      const cur = useCny ? 'CNY' : 'USD';
      const price = useCny ? t?.cny : t?.usd;
      const base = useCny ? (wantTier2 ? peakB.cny : offB.cny) : (wantTier2 ? peakB.usd : offB.usd);
      const b = blend(price);
      const bb = blend(base);
      const ratio = b != null && bb ? b / bb : null;
      const credits = t?.creditsPer1M;
      const notes = ch.notes || [];
      const publicNote = notes.find(n => !n.includes('⚠️')) || (notes[0] ? notes[0].replace(/^⚠️\s*/, '') : '');

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
    }).join('\n');
}

// 通用渲染端点表格
function renderEndpointsRows(endpoints, baseUsd) {
  const bb = blend(baseUsd);
  return endpoints.map(e => {
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
  }).join('\n');
}

// 通用渲染订阅行
function renderSubRows(sub) {
  return sub.plans.map(p => {
    const fee = p.fee.currency === 'CNY' ? `¥${p.fee.amount}/月` : `$${p.fee.amount}/月`;
    const allow = p.modelAllowance?.usd != null
      ? `$${p.modelAllowance.usd}`
      : p.limits?.monthlyCredits != null
        ? `${p.limits.monthlyCredits} 积分`
        : p.softLimit
          ? '无硬额度'
          : '未公布';
    const coding = p.quotaConversion?.byProfile?.codingAgent || [];
    const r = p.quotaConversion?.codingAgentAt874 ?? (coding.find(x => x.cacheRate === 0.874)?.requests);
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
  }).join('\n');
}

// -------------------------------------------------------------
// 1. 生成 DeepSeek-V4.1-Flash
// -------------------------------------------------------------
function buildFlash() {
  const dir = path.join(ROOT, 'models/deepseek-v4.1-flash');
  const api = JSON.parse(fs.readFileSync(`${dir}/channels/api.json`, 'utf8'));
  const sub = JSON.parse(fs.readFileSync(`${dir}/channels/subscription.json`, 'utf8'));

  const offB = api.baseline.tiers[0];
  const peakB = api.baseline.tiers[1];
  const endpoints = api.channels.find(c => c.providerId === 'openrouter')?.endpoints || [];

  const html = generatePage({
    currentFile: 'deepseek-v4.1-flash.html',
    title: 'DeepSeek V4.1 Flash',
    brandSvg: `<svg width="24" height="24" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="14" fill="#111"/>
      <path d="M7.2 16.2c1.6 4.8 12 4.8 13.6 0" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M8.6 12.4c.2-3.2 10.6-3.2 10.8 0" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>
      <circle cx="11.2" cy="12.2" r="1.15" fill="#fff"/>
      <circle cx="16.8" cy="12.2" r="1.15" fill="#fff"/>
    </svg>`,
    brandName: 'DeepSeek',
    h1Title: 'DeepSeek V4.1 Flash',
    pills: [
      { cls: 'reason', text: '高速推理' },
      { cls: 'open', text: '开源 552B' }
    ],
    metric1: { en: 'Vals Index', zh: 'Vals综合指数', num: '51.32', sub: '± 1.13 · SWE Verified 88.8%', rankNum: '24', rankTotal: '45', barPct: '51.32%' },
    metric2: { en: 'AA Intelligence Index', zh: 'AA综合指数', num: '39.5', sub: '评测费用: $0.265 · Speed #3', rankNum: '7', rankTotal: '117', barPct: '39.5%' },
    radarMean: '54',
    radarPolygonPoints: '0,-46 72.7,-42 59.8,34.5 0,27 -44.2,25.5 -39.8,-23',
    radarLabels: {
      top: { val: '46', txt: '科学推理' },
      tr: { val: '84', txt: '长上下文推理' },
      br: { val: '69', txt: '智能体工作流' },
      bot: { val: '27', txt: '编程智能体' },
      bl: { val: '51', txt: '知识工作' },
      tl: { val: '46', txt: '事实可靠性' }
    },
    facts: [
      { k: '发布日期', v: '2026.09.10' },
      { k: '输入模态', mods: [{on:true,t:'T'},{on:true,t:'图'},{on:false,t:'声'},{on:false,t:'影'}] },
      { k: '输出模态', mods: [{on:true,t:'T'},{on:false,t:'图'},{on:false,t:'声'},{on:false,t:'影'}] },
      { k: '上下文窗口', v: '1M token' },
      { k: '输出速度', v: '223 token/s', tag: '#3' },
      { k: '综合价格', v: '0.61 ¥/M', tag: '#21' }
    ],
    sideKv: [
      { k: '厂商', v: 'DeepSeek（深度求索）' },
      { k: '开源', v: 'MIT · 权重公开（HF）' },
      { k: '规模', v: '552B 总 / 16B 激活 · MoE' },
      { k: '官方 ID', v: '<code>deepseek-flash</code>' },
      { k: '能力', v: '默认推理 · 视觉多模态 · 工具调用' },
      { k: '窗口', v: '1M 上下文 / 384K 最大输出 / 并发 2500' },
      { k: '速度', v: '223 tok/s · TTFC 1.22s · 首答案 10.18s' }
    ],
    sideChips: [
      'AA 智能 <b>#7/117</b> (39.5)',
      'AA 速度 <b>#3/117</b>',
      'AA 成本 <b>#21/117</b>',
      'LMArena 文本 <b>#37</b> 1462',
      'LMArena 编程 <b>#17</b> 1507',
      'Vals Index <b>#24/45</b> 51.32'
    ],
    sideCalls: [
      '<b>卡片口径</b>：雷达六轴取公开原始分：科学推理 = (SciCode 51.9 + HLE 39.3)/2；长上下文 = AA-LCR 84；智能体工作流 = AutomationBench 69；编程智能体 = Terminal-Bench 4.0 的 27；知识工作 = Vals Index 51；事实可靠性 = Omniscience 正确率 46（幻觉率 96.5%）。综合单价按谷时 7:2:1 为 ¥0.61/M。',
      '<b>渠道比价要点</b>：官方高峰为周一至周五 09:00–12:00、14:00–18:00。国内渠道（火山方舟、百炼北京）按人民币牌价比对；多数海外第三方渠道固定单价等于官方高峰价，对谷价呈现 2.00×。'
    ],
    toolbar: {
      btn1Text: '对比空闲时段',
      btn2Text: '对比高峰时段',
      hint: '倍数 = 渠道 7:2:1 / 官方同币种基准。固定价渠道对空闲为 2.00×，对高峰为 1.00×。'
    },
    apiTable: {
      getTbody1: () => renderApiRows(api, false, offB, peakB),
      getTbody2: () => renderApiRows(api, true, offB, peakB)
    },
    endpointsTable: {
      title: `OpenRouter ${endpoints.length} 个上游端点实测（对官方空闲 7:2:1）`,
      getTbody: () => renderEndpointsRows(endpoints, offB.usd)
    },
    subTable: {
      hint: '额度按官方谷价（$0.15 / $0.003 / $0.60）统一折算。编程 Agent 取 87.4% 缓存率实测口径下的可用请求数。',
      getTbody: () => renderSubRows(sub)
    },
    footerNote: '数据来源：Artificial Analysis、vals.ai、OpenRouter、各官方文档（2026-10-08 快照）。本页不含个人实测。'
  });

  fs.writeFileSync(path.join(SITE_DIR, 'deepseek-v4.1-flash.html'), html, 'utf8');
  console.log('Built site/deepseek-v4.1-flash.html');
}

// -------------------------------------------------------------
// 2. 生成 DeepSeek-V4-Pro
// -------------------------------------------------------------
function buildPro() {
  const dir = path.join(ROOT, 'models/deepseek-v4-pro');
  const api = JSON.parse(fs.readFileSync(`${dir}/channels/api.json`, 'utf8'));
  const sub = JSON.parse(fs.readFileSync(`${dir}/channels/subscription.json`, 'utf8'));

  const offB = api.baseline.tiers[0];
  const peakB = api.baseline.tiers[1];
  const endpoints = api.channels.find(c => c.providerId === 'openrouter')?.endpoints || [];

  const html = generatePage({
    currentFile: 'deepseek-v4-pro.html',
    title: 'DeepSeek V4 Pro',
    brandSvg: `<svg width="24" height="24" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="14" fill="#111"/>
      <path d="M7.2 16.2c1.6 4.8 12 4.8 13.6 0" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M8.6 12.4c.2-3.2 10.6-3.2 10.8 0" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>
      <circle cx="11.2" cy="12.2" r="1.15" fill="#fff"/>
      <circle cx="16.8" cy="12.2" r="1.15" fill="#fff"/>
    </svg>`,
    brandName: 'DeepSeek',
    h1Title: 'DeepSeek V4 Pro',
    pills: [
      { cls: 'reason', text: '旗舰推理' },
      { cls: 'open', text: '开源 1.6T MoE' }
    ],
    metric1: { en: 'SWE-bench Verified', zh: 'SWE代码权威评测', num: '96.4%', sub: '$0.10/test · 4m00s 极速', rankNum: '2', rankTotal: '全网', barPct: '96.4%' },
    metric2: { en: 'AA Intelligence Index', zh: 'AA综合指数', num: '36.0', sub: '评测费用: $0.674 · Speed #15', rankNum: '9', rankTotal: '117', barPct: '36.0%' },
    radarMean: '49',
    radarPolygonPoints: '0,-46 69.6,-40.2 49.1,28.4 0,14.1 -39.5,22.8 -42.5,-24.6',
    radarLabels: {
      top: { val: '46', txt: '科学推理' },
      tr: { val: '80', txt: '长上下文推理' },
      br: { val: '57', txt: '智能体工作流' },
      bot: { val: '14', txt: '编程智能体' },
      bl: { val: '46', txt: '知识工作' },
      tl: { val: '49', txt: '事实可靠性' }
    },
    facts: [
      { k: '发布日期', v: '2026.08.13' },
      { k: '输入模态', mods: [{on:true,t:'T'},{on:false,t:'图'},{on:false,t:'声'},{on:false,t:'影'}] },
      { k: '输出模态', mods: [{on:true,t:'T'},{on:false,t:'图'},{on:false,t:'声'},{on:false,t:'影'}] },
      { k: '上下文窗口', v: '1M token' },
      { k: '输出速度', v: '96.2 token/s', tag: '#15' },
      { k: '综合价格', v: '2.36 ¥/M', tag: '#29' }
    ],
    sideKv: [
      { k: '厂商', v: 'DeepSeek（深度求索）' },
      { k: '开源', v: 'MIT · 权重公开（HF）' },
      { k: '规模', v: '1600B 总 / 49B 激活 · 1.6T MoE' },
      { k: '官方 ID', v: '<code>deepseek-v4-pro</code> (0813正式版)' },
      { k: '能力', v: '默认推理 · 纯文本无视觉 · 工具调用' },
      { k: '窗口', v: '1M 上下文 / 384K 最大输出 / 并发 500' },
      { k: '速度', v: '96.2 tok/s · TTFC 1.60s · 首答案 22.40s' }
    ],
    sideChips: [
      'AA 智能 <b>#9/117</b> (36.0)',
      'AA 速度 <b>#15/117</b>',
      'AA 成本 <b>#29/117</b>',
      'LMArena 文本 <b>#48</b> 1451',
      'SWE-bench <b>96.40%</b>',
      'GPQA 推理 <b>92.8%</b>'
    ],
    sideCalls: [
      '<b>与 V4.1-Flash 核心差异</b>：Pro 拥有 1.6T 超大参数规模与 49B 激活量，在极深代码工程重构与复杂逻辑推演上优势显著（SWE-bench 达 96.4%）；但输出速度放缓至 96 tok/s，不支持图像视觉，官方单价为 Flash 的 4.5 倍（谷时未命中 ¥4.5 / 输出 ¥13.5）。',
      '<b>渠道比价要点</b>：官方谷价为 $0.66 / $0.022 / $1.98，峰价翻倍。国内云（火山方舟、百炼北京）实行与官方相同的人民币阶梯价；海外渠道（SiliconFlow、Cloudflare、DigitalOcean 等）普遍采用官方高峰价固定标价（$1.32 / $3.96），对谷价基准为 2.00×。'
    ],
    toolbar: {
      btn1Text: '对比空闲时段',
      btn2Text: '对比高峰时段',
      hint: '倍数 = 渠道 7:2:1 / 官方同币种基准。固定价渠道对空闲为 2.00×，对高峰为 1.00×。'
    },
    apiTable: {
      getTbody1: () => renderApiRows(api, false, offB, peakB),
      getTbody2: () => renderApiRows(api, true, offB, peakB)
    },
    endpointsTable: {
      title: `OpenRouter ${endpoints.length} 个上游端点实测（对官方空闲 7:2:1）`,
      getTbody: () => renderEndpointsRows(endpoints, offB.usd)
    },
    subTable: {
      hint: '额度按 Pro 官方谷价（$0.66 / $0.022 / $1.98）统一折算。编程 Agent 取 87.4% 缓存率实测口径下的可用请求数。',
      getTbody: () => renderSubRows(sub)
    },
    footerNote: '数据来源：Artificial Analysis、OpenRouter、Azure Retail Prices API、各官方文档（2026-10-08 快照）。本页不含个人实测。'
  });

  fs.writeFileSync(path.join(SITE_DIR, 'deepseek-v4-pro.html'), html, 'utf8');
  console.log('Built site/deepseek-v4-pro.html');
}

// -------------------------------------------------------------
// 3. 生成 Gemini-3.8-Flash
// -------------------------------------------------------------
function buildGemini() {
  const dir = path.join(ROOT, 'models/gemini-3.8-flash');
  const api = JSON.parse(fs.readFileSync(`${dir}/channels/api.json`, 'utf8'));
  const sub = JSON.parse(fs.readFileSync(`${dir}/channels/subscription.json`, 'utf8'));

  const stdB = api.baseline.tiers[0];
  const batchB = api.baseline.tiers[1];
  const endpoints = extractEndpointsFromModelsDev(/gemini-3\.8-flash/i, stdB.usd);

  const html = generatePage({
    currentFile: 'gemini-3.8-flash.html',
    title: 'Gemini 3.8 Flash',
    brandSvg: `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#1a73e8"/>
    </svg>`,
    brandName: 'Google DeepMind',
    h1Title: 'Gemini 3.8 Flash',
    pills: [
      { cls: 'reason', text: '高速推理' },
      { cls: 'open', text: '全模态原生' }
    ],
    metric1: { en: 'Search Grounding', zh: '原生搜索接地', num: '92.5%', sub: '实时权威事实检索', rankNum: '1', rankTotal: '全模态', barPct: '92.5%' },
    metric2: { en: 'AA Intelligence Index', zh: 'AA综合指数', num: '40.9', sub: '评测费用: $1.243 · Speed #5', rankNum: '6', rankTotal: '117', barPct: '40.9%' },
    radarMean: '48',
    radarPolygonPoints: '0,-48 44.7,-25.8 41.9,24.2 0,42.8 -45.4,26.2 -40.5,-23.4',
    radarLabels: {
      top: { val: '48', txt: '科学推理' },
      tr: { val: '52', txt: '长上下文推理' },
      br: { val: '48', txt: '智能体工作流' },
      bot: { val: '43', txt: '编程智能体' },
      bl: { val: '52', txt: '知识工作' },
      tl: { val: '47', txt: '事实可靠性' }
    },
    facts: [
      { k: '发布日期', v: '2026.08.20' },
      { k: '输入模态', mods: [{on:true,t:'T'},{on:true,t:'图'},{on:true,t:'声'},{on:true,t:'影'}] },
      { k: '输出模态', mods: [{on:true,t:'T'},{on:false,t:'图'},{on:false,t:'声'},{on:false,t:'影'}] },
      { k: '上下文窗口', v: '1.05M token' },
      { k: '输出速度', v: '195.4 token/s', tag: '#5' },
      { k: '综合价格', v: '$0.58 /M', tag: '#18' }
    ],
    sideKv: [
      { k: '厂商', v: 'Google DeepMind' },
      { k: '开源', v: '闭源商业 API / Vertex AI' },
      { k: '架构', v: '原生四模态 Fast-MoE 架构' },
      { k: '官方 ID', v: '<code>gemini-3.8-flash</code>' },
      { k: '能力', v: '全模态原生 · 视音频流式 · 搜索接地' },
      { k: '窗口', v: '1,048,576 上下文 / 65,536 最大输出' },
      { k: '速度', v: '195.4 tok/s · TTFC 0.62s 极低首字延迟' }
    ],
    sideChips: [
      'AA 智能 <b>#6/117</b> (40.93)',
      'AA 速度 <b>#5/117</b>',
      'AA 成本 <b>#18/117</b>',
      '经济学 <b>52.36</b>',
      '法律推理 <b>51.63</b>',
      '内置联网 <b>Search Grounding</b>'
    ],
    sideCalls: [
      '<b>全模态原生优势</b>：不同于级联式拼接，Gemini 原生支持超长视频与流式音频输入；TTFC 首字延迟低至 0.62 秒；原生支持 Google Search 真实检索接地；综合智能指数 40.93，略高于 DeepSeek-V4.1-Flash (39.46)。',
      '<b>渠道比价要点</b>：官方标准按量为输入 $0.75 / 输出 $3.75 / 缓存 $0.075（综合价 $0.58/M）；使用官方 Batch API 可享 50% 优惠（综合价降至 $0.29/M）；Vertex AI 与第三方网关普遍采用 1.00× 官方平价直通。'
    ],
    toolbar: {
      btn1Text: '标准按量模式',
      btn2Text: '对比 Batch 档 (50% 折扣)',
      hint: '官方基准统一使用美元结算（$0.75 / $0.075 / $3.75）。主流云渠道多为 1.00× 直通。'
    },
    apiTable: {
      getTbody1: () => renderApiRows(api, false, stdB, batchB),
      getTbody2: () => renderApiRows(api, true, stdB, batchB)
    },
    endpointsTable: {
      title: `多供应商与网关端点实测（共 ${endpoints.length} 个端点）`,
      getTbody: () => renderEndpointsRows(endpoints, stdB.usd)
    },
    subTable: {
      hint: '额度按官方标准基准（$0.75 / $0.075 / $3.75）统一折算。编程 Agent 取 87.4% 缓存率实测口径下的可用请求数。',
      getTbody: () => renderSubRows(sub)
    },
    footerNote: '数据来源：Google Cloud 官方文档、Artificial Analysis、models.dev（2026-10-08 快照）。本页不含个人实测。'
  });

  fs.writeFileSync(path.join(SITE_DIR, 'gemini-3.8-flash.html'), html, 'utf8');
  console.log('Built site/gemini-3.8-flash.html');
}

// -------------------------------------------------------------
// 4. 生成 GPT-6.1-Sol
// -------------------------------------------------------------
function buildGpt() {
  const dir = path.join(ROOT, 'models/gpt-6.1-sol');
  const api = JSON.parse(fs.readFileSync(`${dir}/channels/api.json`, 'utf8'));
  const sub = JSON.parse(fs.readFileSync(`${dir}/channels/subscription.json`, 'utf8'));

  const stdB = api.baseline.tiers[0];
  const extB = api.baseline.tiers[1];
  const endpoints = extractEndpointsFromModelsDev(/gpt-6\.1-sol/i, stdB.usd);

  const html = generatePage({
    currentFile: 'gpt-6.1-sol.html',
    title: 'GPT-6.1 Sol',
    brandSvg: `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#10a37f"/>
      <path d="M12 6V18M6 12H18" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    brandName: 'OpenAI',
    h1Title: 'GPT-6.1 Sol',
    pills: [
      { cls: 'reason', text: '前沿旗舰' },
      { cls: 'open', text: '全域 MoE' }
    ],
    metric1: { en: 'SWE-bench Verified', zh: '智能体综合评测', num: '94.8%', sub: '复杂工程逻辑闭环', rankNum: '3', rankTotal: '全网', barPct: '94.8%' },
    metric2: { en: 'AA Intelligence Index', zh: 'AA综合指数', num: '51.8', sub: '评测费用: $0.724 · 全球前三', rankNum: '3', rankTotal: '117', barPct: '51.8%' },
    radarMean: '56',
    radarPolygonPoints: '0,-54 50.0,-28.9 49.4,28.5 0,53.9 -51.4,29.7 -46.8,-27.0',
    radarLabels: {
      top: { val: '54', txt: '科学推理' },
      tr: { val: '58', txt: '长上下文推理' },
      br: { val: '57', txt: '智能体工作流' },
      bot: { val: '54', txt: '编程智能体' },
      bl: { val: '59', txt: '知识工作' },
      tl: { val: '54', txt: '事实可靠性' }
    },
    facts: [
      { k: '发布日期', v: '2026.09.02' },
      { k: '输入模态', mods: [{on:true,t:'T'},{on:true,t:'图'},{on:false,t:'声'},{on:false,t:'影'}] },
      { k: '输出模态', mods: [{on:true,t:'T'},{on:false,t:'图'},{on:false,t:'声'},{on:false,t:'影'}] },
      { k: '上下文窗口', v: '1.05M token' },
      { k: '输出速度', v: '112.5 token/s', tag: '#11' },
      { k: '综合价格', v: '$1.47 /M', tag: '#32' }
    ],
    sideKv: [
      { k: '厂商', v: 'OpenAI' },
      { k: '开源', v: '闭源商业 API / Azure OpenAI' },
      { k: '架构', v: 'Frontier Multimodal MoE' },
      { k: '官方 ID', v: '<code>gpt-6.1-sol</code> (含 pro/fast)' },
      { k: '能力', v: '高阶推理 · 视觉多模态 · 搜索插件' },
      { k: '窗口', v: '1,050,000 上下文 / 128,000 最大输出' },
      { k: '速度', v: '112.5 tok/s · TTFC 0.98s 稳定响应' }
    ],
    sideChips: [
      'AA 智能 <b>#3/117</b> (51.83)',
      '经济学 <b>59.28</b>',
      '法律推理 <b>57.69</b>',
      '战略运营 <b>56.98</b>',
      'Prompt Caching <b>$0.10/M</b>',
      '前沿通用第一梯队'
    ],
    sideCalls: [
      '<b>智能梯队优势</b>：GPT-6.1 Sol 综合智能指数达到 51.83，显著领先于轻量模型梯队；在多步骤复杂 Agent 闭环、长文本商业与法律合约推演上具备极高的准确率与指令遵循深度。',
      '<b>渠道比价要点</b>：官方标准窗口（≤272K）按量为输入 $2.00 / 输出 $10.00 / 缓存 $0.10（综合价 $1.47/M）；超长上下文模式（>272K）阶梯价为 $4.00 / $15.00；Azure 与第三方网关普遍实行 1.00× 平价转售。'
    ],
    toolbar: {
      btn1Text: '标准窗口 (≤272K)',
      btn2Text: '超长窗口 (>272K)',
      hint: '官方基准统一使用美元结算。超长上下文阶梯为 $4.00 / $0.20 / $15.00。'
    },
    apiTable: {
      getTbody1: () => renderApiRows(api, false, stdB, extB),
      getTbody2: () => renderApiRows(api, true, stdB, extB)
    },
    endpointsTable: {
      title: `多供应商与网关端点实测（共 ${endpoints.length} 个端点）`,
      getTbody: () => renderEndpointsRows(endpoints, stdB.usd)
    },
    subTable: {
      hint: '额度按官方标准基准（$2.00 / $0.10 / $10.00）统一折算。编程 Agent 取 87.4% 缓存率实测口径下的可用请求数。',
      getTbody: () => renderSubRows(sub)
    },
    footerNote: '数据来源：OpenAI 官方文档、Azure AI Foundry、Artificial Analysis、models.dev（2026-10-08 快照）。本页不含个人实测。'
  });

  fs.writeFileSync(path.join(SITE_DIR, 'gpt-6.1-sol.html'), html, 'utf8');
  console.log('Built site/gpt-6.1-sol.html');
}

// 执行全量构建
console.log('=== 开始统一构建横评页面 ===');
buildFlash();
buildPro();
buildGemini();
buildGpt();
buildAllBig3();
buildAllCn();
console.log('=== 已建档型号页面全部构建完成 ===');
