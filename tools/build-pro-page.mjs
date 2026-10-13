import fs from 'fs';
import path from 'path';

const root = path.resolve('models/deepseek-v4-pro');
const api = JSON.parse(fs.readFileSync(path.join(root, 'channels/api.json'), 'utf8'));
const sub = JSON.parse(fs.readFileSync(path.join(root, 'channels/subscription.json'), 'utf8'));

const blend = (p) => {
  if (!p) return null;
  if (p.inputHit == null || p.inputMiss == null || p.output == null) return null;
  return (7 * p.inputHit + 2 * p.inputMiss + 1 * p.output) / 10;
};
const pick = (ch, wantPeak) => {
  if (!ch.tiers?.length) return null;
  if (ch.peakValley) {
    const id = wantPeak ? 'peak' : 'offpeak';
    return ch.tiers.find((t) => t.id === id) || ch.tiers[0];
  }
  return ch.tiers[0];
};
const money = (n, cur) => {
  if (n == null) return '—';
  const v = Number(n);
  const d = v < 0.01 ? 4 : v < 1 ? 3 : 2;
  return (cur === 'CNY' ? '¥' : '$') + v.toFixed(d).replace(/0+$/, '').replace(/\.$/, '');
};
const tok = (n) => {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 ? 2 : 0).replace(/\.00$/, '') + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'K';
  return String(n);
};
const ratioTxt = (r) => (r == null ? '—' : r.toFixed(2) + '×');
const ratioCls = (r) => {
  if (r == null) return '';
  if (r <= 1.01) return 'ok';
  if (r <= 1.15) return 'mid';
  if (r <= 2.05) return 'hi';
  return 'hot';
};

const offB = api.baseline.tiers.find((t) => t.id === 'offpeak');
const peakB = api.baseline.tiers.find((t) => t.id === 'peak');

function rowData(ch, wantPeak) {
  const t = pick(ch, wantPeak);
  const cur = ch.priceCurrency === 'CNY' || (t?.cny && !t?.usd) ? 'CNY' : t?.cny && ch.priceCurrency === 'CNY' ? 'CNY' : 'USD';
  const useCny = ch.priceCurrency === 'CNY';
  const price = useCny ? t?.cny : t?.usd;
  const base = useCny ? (wantPeak ? peakB.cny : offB.cny) : (wantPeak ? peakB.usd : offB.usd);
  const b = blend(price);
  const bb = blend(base);
  const ratio = b != null && bb ? b / bb : null;
  return { t, useCny, price, b, ratio };
}

function apiRows(wantPeak) {
  return api.channels
    .filter((ch) => ch.available !== false && ch.tiers?.length)
    .map((ch) => {
      const { t, useCny, price, b, ratio } = rowData(ch, wantPeak);
      const cur = useCny ? 'CNY' : 'USD';
      const miss = price?.inputMiss;
      const hit = price?.inputHit;
      const out = price?.output;
      const credits = t?.creditsPer1M;
      const notes = ch.notes || [];
      const publicNote =
        notes.find((n) => !n.includes('⚠️')) ||
        (notes[0] ? notes[0].replace(/^⚠️\s*/, '') : '');
      return `<tr data-id="${ch.providerId}">
        <td>${ch.isOfficial ? '<span class="badge">官方</span> ' : ''}${esc(ch.displayName)}${ch.peakValley ? '<div class="sub">峰谷</div>' : ''}</td>
        <td>${credits ? '积分' : cur}</td>
        <td class="num">${credits ? credits.inputMiss + ' 分' : money(miss, cur)}</td>
        <td class="num">${credits ? credits.inputHit + ' 分' : hit == null ? '<span class="na">未公布</span>' : money(hit, cur)}</td>
        <td class="num">${credits ? credits.output + ' 分' : money(out, cur)}</td>
        <td class="num">${b == null ? '—' : money(b, cur)}</td>
        <td class="num"><span class="x ${ratioCls(ratio)}">${credits ? '积分' : ratioTxt(ratio)}</span></td>
        <td class="num">${tok(ch.limits?.contextTokens)}</td>
        <td class="num">${tok(ch.limits?.maxOutputTokens)}</td>
        <td class="note">${esc(publicNote)}</td>
      </tr>`;
    })
    .join('\n');
}

function orRows() {
  const ch = api.channels.find((c) => c.providerId === 'openrouter');
  if (!ch?.endpoints) return '';
  return ch.endpoints
    .map((e) => {
      const b = blend(e.usd);
      const ratio = b != null && offB?.usd ? b / blend(offB.usd) : null;
      return `<tr>
        <td>${esc(e.providerName)}${e.implicitCache ? ' <span class="badge">隐式缓存</span>' : ''}</td>
        <td class="num">${money(e.usd.inputMiss, 'USD')}</td>
        <td class="num">${money(e.usd.inputHit, 'USD')}</td>
        <td class="num">${money(e.usd.output, 'USD')}</td>
        <td class="num">${money(b, 'USD')}</td>
        <td class="num"><span class="x ${ratioCls(ratio)}">${ratioTxt(ratio)}</span></td>
        <td class="num">${tok(e.maxOutputTokens)}</td>
        <td class="note">${esc(e.note || e.quantization || '')}${e.uptimeLast1d != null ? ` · 1d ${e.uptimeLast1d}%` : ''}</td>
      </tr>`;
    })
    .join('\n');
}

function subRows() {
  return sub.plans
    .map((p) => {
      const fee =
        p.fee.currency === 'CNY' ? `¥${p.fee.amount}/月` : `$${p.fee.amount}/月`;
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
      const req = r ? r.toLocaleString('en-US') + ' 次' : '—';
      const note = p.modelAllowance?.derivation || '';
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

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DeepSeek V4 Pro · 渠道对照</title>
  <style>
    :root {
      --canvas: #e8edf3;
      --ink: #17191e;
      --gold: #9a845c;
      --blue: #3b6fd8;
      --orange: #c37b4c;
      --white: #fff;
      --line: #d5dce6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #d5dce6; color: var(--ink); }
    body {
      font-family: "Inter", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif;
      line-height: 1.45;
    }
    .page { max-width: 1180px; margin: 0 auto; padding: 28px 24px 72px; }
    .topnav {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 22px; color: #5c6570;
    }
    .topnav strong { color: var(--ink); font-size: 15px; }
    .nav-links { display: flex; gap: 14px; font-size: 13px; }
    .nav-links a { color: #3b6fd8; text-decoration: none; }
    .nav-links a:hover { text-decoration: underline; }
    .sec { margin-top: 36px; }
    .sec h2 {
      font-size: 13px; font-weight: 650; letter-spacing: 0.12em;
      color: #6a7380; text-transform: uppercase; margin-bottom: 14px;
    }
    .intro {
      display: grid;
      grid-template-columns: 430px 1fr;
      gap: 22px;
      align-items: start;
    }
    .poster {
      width: 430px;
      background: var(--canvas);
      padding: 22px 20px 14px;
      border-radius: 8px;
    }
    header.cardhd {
      display: flex; justify-content: space-between; align-items: center;
      padding-bottom: 14px; border-bottom: 1px solid var(--line);
    }
    .brand { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 700; }
    .coord { font-size: 18px; font-weight: 500; letter-spacing: 0.46em; margin-right: -0.46em; }
    .title-row { display: flex; justify-content: space-between; gap: 10px; margin: 22px 0 14px; }
    h1 { font-size: 28px; font-weight: 650; letter-spacing: -0.038em; line-height: 1.12; }
    .pills { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
    .pill {
      display: inline-flex; align-items: center; gap: 6px;
      border-radius: 999px; padding: 4px 11px 4px 9px; font-size: 13px; background: #fff;
    }
    .pill .dot { width: 7px; height: 7px; border-radius: 50%; }
    .pill.reason { color: #3a63b8; box-shadow: inset 0 0 0 1px #c9d6f0; }
    .pill.reason .dot { background: #4b78e6; }
    .pill.open { color: #2f7a4a; box-shadow: inset 0 0 0 1px #c7e3d0; }
    .pill.open .dot { background: #3aa05c; }
    .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .metric { background: var(--white); border-radius: 14px; padding: 12px; }
    .metric-head { display: flex; justify-content: space-between; color: var(--gold); font-size: 10.5px; }
    .metric-head .en { font-family: Georgia, "Times New Roman", serif; font-style: italic; }
    .metric-body { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px; }
    .metric-num { font-size: 26px; font-weight: 620; letter-spacing: -0.04em; line-height: 1; }
    .metric-sub { margin-top: 4px; color: #8a9099; font-size: 11px; }
    .rank { color: var(--blue); font-size: 18px; font-weight: 700; }
    .rank small { font-size: 11px; font-weight: 500; color: #7b95d6; }
    .bar { margin-top: 8px; height: 4px; background: #e6ebf3; border-radius: 99px; overflow: hidden; }
    .bar > span { display: block; height: 100%; background: var(--blue); }
    .radar-card { margin-top: 10px; background: var(--white); border-radius: 14px; padding: 12px 8px 8px; }
    .radar-head { display: flex; justify-content: space-between; padding: 0 8px; }
    .radar-head h3 { font-size: 13px; font-weight: 650; }
    .radar-head h3 em { font-style: normal; color: var(--blue); }
    .legend { margin-top: 6px; font-size: 11px; color: #5b616a; }
    .legend i {
      display: inline-block; width: 11px; height: 8px; border-radius: 2px; margin-right: 6px; vertical-align: middle;
      box-shadow: inset 0 0 0 1.5px currentColor; background: color-mix(in srgb, currentColor 28%, white);
    }
    .legend .me { color: var(--blue); }
    .legend .avg { color: var(--orange); opacity: 0.4; margin-top: 3px; }
    .mean { text-align: right; color: var(--blue); font-size: 12px; }
    .mean b { display: block; font-size: 20px; }
    .radar-wrap { position: relative; height: 300px; }
    .radar-wrap svg { width: 100%; height: 100%; display: block; }
    .lab { position: absolute; font-size: 11px; color: #3a4250; white-space: nowrap; text-align: center; }
    .lab b { color: var(--blue); font-size: 12px; display: block; }
    .lab.top { left: 50%; top: 0; transform: translateX(-50%); }
    .lab.tr { right: 4px; top: 64px; text-align: right; }
    .lab.br { right: 4px; bottom: 70px; text-align: right; }
    .lab.bot { left: 50%; bottom: 4px; transform: translateX(-50%); }
    .lab.bl { left: 4px; bottom: 70px; text-align: left; }
    .lab.tl { left: 4px; top: 64px; text-align: left; }
    .src { text-align: center; color: #8a9099; font-size: 11px; padding: 2px 0 6px; }
    .facts { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px; }
    .fact { background: var(--white); border-radius: 12px; padding: 10px; min-height: 64px; }
    .fact .k { color: #8a9099; font-size: 11px; margin-bottom: 6px; display: flex; justify-content: space-between; }
    .fact .k .tag { color: var(--blue); font-weight: 700; }
    .fact .v { font-size: 14px; font-weight: 650; }
    .mods { display: flex; gap: 6px; color: #d5d9e0; }
    .mods .on { color: #2a2e35; }
    .poster footer {
      margin-top: 10px; color: #8a9099; font-size: 10px; display: flex; justify-content: space-between;
    }
    .side {
      background: var(--white);
      border-radius: 14px;
      padding: 22px 24px;
      min-height: 100%;
    }
    .side h3 { font-size: 14px; margin: 18px 0 8px; }
    .side h3:first-child { margin-top: 0; }
    .kv { display: grid; grid-template-columns: 96px 1fr; gap: 6px 12px; font-size: 13px; }
    .kv dt { color: #8a9099; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { background: var(--canvas); border-radius: 999px; padding: 4px 10px; font-size: 12.5px; }
    .chip b { color: var(--blue); }
    .call { margin-top: 10px; font-size: 12.5px; color: #5c6570; line-height: 1.55; }
    .toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
    .btn {
      border: 1px solid var(--line); background: #fff; border-radius: 999px;
      padding: 5px 12px; font-size: 13px; cursor: pointer;
    }
    .btn.on { background: #1f2a3d; color: #fff; border-color: #1f2a3d; }
    .hint { font-size: 12.5px; color: #6a7380; }
    .tbl-wrap { overflow: auto; background: #fff; border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 9px 10px; border-bottom: 1px solid #eef1f5; vertical-align: top; text-align: left; }
    th { position: sticky; top: 0; background: #f6f8fb; font-weight: 600; color: #5c6570; font-size: 12px; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    td.note { color: #6a7380; font-size: 12px; max-width: 280px; }
    .sub { color: #8a9099; font-size: 11px; margin-top: 2px; }
    .badge { display: inline-block; background: #e8eefc; color: #3b6fd8; font-size: 11px; padding: 1px 6px; border-radius: 6px; }
    .x { font-weight: 700; }
    .x.ok { color: #2f7a4a; }
    .x.mid { color: #8a6d2f; }
    .x.hi { color: #c37b4c; }
    .x.hot { color: #b54646; }
    .na { color: #9aa1ab; }
    details { margin-top: 12px; background: #fff; border-radius: 12px; padding: 10px 14px; }
    details summary { cursor: pointer; font-weight: 650; font-size: 13px; }
    .foot { margin-top: 28px; font-size: 12px; color: #6a7380; }
    @media (max-width: 980px) {
      .intro { grid-template-columns: 1fr; }
      .poster { width: 100%; max-width: 460px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="topnav">
      <strong>DeepSeek V4 Pro (0813)</strong>
      <div class="nav-links">
        <a href="deepseek-v4.1-flash.html">← 切换至 V4.1 Flash</a>
        <span>数据快照 2026.10.08</span>
      </div>
    </div>

    <section class="sec">
      <h2>01 模型介绍</h2>
      <div class="intro">
        <article class="poster">
          <header class="cardhd">
            <div class="brand">
              <svg width="24" height="24" viewBox="0 0 28 28" aria-hidden="true">
                <circle cx="14" cy="14" r="14" fill="#111"/>
                <path d="M7.2 16.2c1.6 4.8 12 4.8 13.6 0" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>
                <path d="M8.6 12.4c.2-3.2 10.6-3.2 10.8 0" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>
                <circle cx="11.2" cy="12.2" r="1.15" fill="#fff"/>
                <circle cx="16.8" cy="12.2" r="1.15" fill="#fff"/>
              </svg>
              DeepSeek
            </div>
            <div class="coord">图灵坐标</div>
          </header>
          <div class="title-row">
            <h1>DeepSeek V4 Pro</h1>
            <div class="pills">
              <span class="pill reason"><span class="dot"></span>旗舰推理</span>
              <span class="pill open"><span class="dot"></span>开源 1.6T</span>
            </div>
          </div>
          <div class="metrics">
            <section class="metric">
              <div class="metric-head"><span class="en">SWE-bench Verified</span><span>SWE代码精度</span></div>
              <div class="metric-body">
                <div><div class="metric-num">96.4%</div><div class="metric-sub">$0.10/test · 4m00s</div></div>
                <div class="rank">#2<small>/全网</small></div>
              </div>
              <div class="bar"><span style="width:96.4%"></span></div>
            </section>
            <section class="metric">
              <div class="metric-head"><span class="en">AA Intelligence Index</span><span>AA综合指数</span></div>
              <div class="metric-body">
                <div><div class="metric-num">36.0</div><div class="metric-sub">评测费用: $0.67</div></div>
                <div class="rank">#9<small>/117</small></div>
              </div>
              <div class="bar"><span style="width:36.0%"></span></div>
            </section>
          </div>
          <section class="radar-card">
            <div class="radar-head">
              <div>
                <h3>主客观混合雷达图<em>「原始分数」</em></h3>
                <div class="legend">
                  <div class="me"><i></i>DeepSeek V4 Pro 0813</div>
                  <div class="avg"><i></i>本轮模型平均值（未收录）</div>
                </div>
              </div>
              <div class="mean">六维均值<b>49</b></div>
            </div>
            <div class="radar-wrap">
              <svg viewBox="0 0 430 300">
                <g transform="translate(215,150)">
                  <polygon points="0,-100 86.6,-50 86.6,50 0,100 -86.6,50 -86.6,-50" fill="none" stroke="#d8dfe8"/>
                  <polygon points="0,-75 65,-37.5 65,37.5 0,75 -65,37.5 -65,-37.5" fill="none" stroke="#e4e9f0"/>
                  <polygon points="0,-50 43.3,-25 43.3,25 0,50 -43.3,25 -43.3,-25" fill="none" stroke="#e4e9f0"/>
                  <polygon points="0,-25 21.7,-12.5 21.7,12.5 0,25 -21.7,12.5 -21.7,-12.5" fill="none" stroke="#e4e9f0"/>
                  <line x1="0" y1="0" x2="0" y2="-100" stroke="#d8dfe8"/>
                  <line x1="0" y1="0" x2="86.6" y2="-50" stroke="#d8dfe8"/>
                  <line x1="0" y1="0" x2="86.6" y2="50" stroke="#d8dfe8"/>
                  <line x1="0" y1="0" x2="0" y2="100" stroke="#d8dfe8"/>
                  <line x1="0" y1="0" x2="-86.6" y2="50" stroke="#d8dfe8"/>
                  <line x1="0" y1="0" x2="-86.6" y2="-50" stroke="#d8dfe8"/>
                  <!-- Pro values: sci:46, ctx:80.3, agent:56.7, coding:14.1, know:45.6, fact:49.1 -->
                  <polygon points="0,-46 69.6,-40.2 49.1,28.4 0,14.1 -39.5,22.8 -42.5,-24.6"
                    fill="rgba(59,111,216,0.28)" stroke="#3b6fd8" stroke-width="2" stroke-linejoin="round"/>
                </g>
              </svg>
              <div class="lab top"><b>46</b>科学推理</div>
              <div class="lab tr"><b>80</b>长上下文推理</div>
              <div class="lab br"><b>57</b>智能体工作流</div>
              <div class="lab bot"><b>14</b>编程智能体</div>
              <div class="lab bl"><b>46</b>知识工作</div>
              <div class="lab tl"><b>49</b>事实可靠性</div>
            </div>
            <p class="src">数据来源 <b>artificialanalysis.ai</b> · <b>vals.ai / SWE-bench</b></p>
          </section>
          <div class="facts">
            <div class="fact"><div class="k">发布日期</div><div class="v">2026.08.13</div></div>
            <div class="fact"><div class="k">输入模态</div><div class="mods"><span class="on">T</span><span>图</span><span>声</span><span>影</span></div></div>
            <div class="fact"><div class="k">输出模态</div><div class="mods"><span class="on">T</span><span>图</span><span>声</span><span>影</span></div></div>
            <div class="fact"><div class="k">上下文窗口</div><div class="v">1M token</div></div>
            <div class="fact"><div class="k">输出速度 <span class="tag">#15</span></div><div class="v">96.2 tok/s</div></div>
            <div class="fact"><div class="k">综合价格 <span class="tag">#29</span></div><div class="v">2.36 ¥/M</div></div>
          </div>
          <footer>
            <div>旗舰级大参数 MoE，高难度代码首选</div>
            <div>2026.10.08</div>
          </footer>
        </article>

        <aside class="side">
          <h3>身份</h3>
          <dl class="kv">
            <dt>厂商</dt><dd>DeepSeek（深度求索）</dd>
            <dt>开源</dt><dd>MIT · 权重公开（HF）</dd>
            <dt>规模</dt><dd>1600B 总 / 49B 激活 · 1.6T MoE</dd>
            <dt>官方 ID</dt><dd><code>deepseek-v4-pro</code>（正式版 DeepSeek-V4-Pro-0813）</dd>
            <dt>能力</dt><dd>默认推理 · 纯文本（无视觉） · 工具调用 · 无内置联网</dd>
            <dt>窗口</dt><dd>1M 上下文 / 384K 最大输出 / 并发 500</dd>
            <dt>速度</dt><dd>96.2 tok/s · TTFC 1.60s · 首答案 22.40s（含思考 20.8s）</dd>
          </dl>
          <h3>公开榜单</h3>
          <div class="chips">
            <span class="chip">AA 智能 <b>#9/117</b> (36.0)</span>
            <span class="chip">AA 速度 <b>#15/117</b></span>
            <span class="chip">AA 成本 <b>#29/117</b></span>
            <span class="chip">LMArena 文本 <b>#48</b> 1451</span>
            <span class="chip">SWE-bench Verified <b>96.40%</b></span>
            <span class="chip">GPQA <b>92.8%</b></span>
          </div>
          <h3>卡片口径与对比要点</h3>
          <p class="call"><b>与 V4.1-Flash 核心差异</b>：Pro 拥有 1.6T 总参数与 49B 激活，在极复杂代码重构与科学多步推理上优势显著（SWE-bench 达 96.4%）；但输出速度降至 96 tok/s（Flash 为 223 tok/s），官方定价为 Flash 的 4.5 倍（谷时 ¥4.5 / ¥0.15 / ¥13.5，综合约 ¥2.36/M），且<b>不支持图像视觉输入</b>，并发限额 500。</p>
          <p class="call"><b>渠道定价规律</b>：官方空闲 ¥4.5/¥0.15/¥13.5 ($0.66/$0.022/$1.98)，高峰翻倍。国内云（火山方舟、百炼北京）实行与官方相同的人民币阶梯价；海外渠道如 SiliconFlow、Cloudflare Workers AI、DigitalOcean 等普遍采用官方高峰价固定标价（$1.32/$3.96），相对谷时基准约为 2.00×。</p>
        </aside>
      </div>
    </section>

    <section class="sec">
      <h2>02 按量渠道</h2>
      <div class="toolbar">
        <button class="btn on" id="btn-off" type="button">对比空闲</button>
        <button class="btn" id="btn-peak" type="button">对比高峰</button>
        <span class="hint">倍数 = 渠道 7:2:1 / 官方同币种该档。固定价渠道对空闲为 2.00×，对高峰为 1.00×。火山/百炼北京采用人民币同价 1.00×。</span>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>渠道</th><th>币种</th>
              <th class="num">未命中 /M</th><th class="num">缓存 /M</th><th class="num">输出 /M</th>
              <th class="num">7:2:1</th><th class="num">vs 官方</th>
              <th class="num">上下文</th><th class="num">最大输出</th><th>备注</th>
            </tr>
          </thead>
          <tbody id="api-off">${apiRows(false)}</tbody>
          <tbody id="api-peak" hidden>${apiRows(true)}</tbody>
        </table>
      </div>
      <p class="hint" style="margin-top:8px">Cloudflare Workers AI 已上架 @cf/deepseek-ai/deepseek-v4-pro-0813。Azure AI Foundry 提供 Fireworks 转售 meter。AWS Bedrock / Google Vertex AI 未上架。</p>
      <details>
        <summary>OpenRouter 22 个上游端点实测（对官方空闲 7:2:1）</summary>
        <div class="tbl-wrap" style="margin-top:10px">
          <table>
            <thead>
              <tr>
                <th>上游</th>
                <th class="num">未命中</th><th class="num">缓存</th><th class="num">输出</th>
                <th class="num">7:2:1</th><th class="num">vs 官方空闲</th>
                <th class="num">最大输出</th><th>备注</th>
              </tr>
            </thead>
            <tbody>${orRows()}</tbody>
          </table>
        </div>
      </details>
    </section>

    <section class="sec">
      <h2>03 订阅渠道</h2>
      <p class="hint" style="margin-bottom:10px">额度按 Pro 官方谷价（$0.66 / $0.022 / $1.98）统一折算。编程 Agent 列取缓存率 87.4% 下的可用请求数估算。</p>
      <div class="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>方案</th>
              <th class="num">月费</th>
              <th class="num">本模型额度</th>
              <th class="num">5 小时</th>
              <th class="num">周</th>
              <th>窗口</th>
              <th class="num">编程 Agent @87.4%</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>${subRows()}</tbody>
        </table>
      </div>
    </section>

    <p class="foot">数据来源：Artificial Analysis、OpenRouter、Azure Retail Prices API、各官方定价文档（2026-10-08 快照）。本页不含个人实测。</p>
  </div>
  <script>
    const off = document.getElementById('api-off');
    const peak = document.getElementById('api-peak');
    const bOff = document.getElementById('btn-off');
    const bPeak = document.getElementById('btn-peak');
    bOff.onclick = () => { off.hidden = false; peak.hidden = true; bOff.classList.add('on'); bPeak.classList.remove('on'); };
    bPeak.onclick = () => { off.hidden = true; peak.hidden = false; bPeak.classList.add('on'); bOff.classList.remove('on'); };
  </script>
</body>
</html>
`;

const out = path.resolve('site/deepseek-v4-pro.html');
fs.writeFileSync(out, html);
console.log('wrote', out, html.length);
