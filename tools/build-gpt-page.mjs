import fs from 'fs';
import path from 'path';

const root = path.resolve('models/gpt-6.1-sol');
const api = JSON.parse(fs.readFileSync(path.join(root, 'channels/api.json'), 'utf8'));
const sub = JSON.parse(fs.readFileSync(path.join(root, 'channels/subscription.json'), 'utf8'));

const blend = (p) => {
  if (!p) return null;
  if (p.inputHit == null || p.inputMiss == null || p.output == null) return null;
  return (7 * p.inputHit + 2 * p.inputMiss + 1 * p.output) / 10;
};
const pick = (ch, wantExtended) => {
  if (!ch.tiers?.length) return null;
  if (wantExtended) {
    return ch.tiers.find((t) => t.id === 'extended') || ch.tiers[0];
  }
  return ch.tiers.find((t) => t.id === 'standard') || ch.tiers[0];
};
const money = (n, cur = 'USD') => {
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

const stdB = api.baseline.tiers.find((t) => t.id === 'standard');
const extB = api.baseline.tiers.find((t) => t.id === 'extended');

function rowData(ch, wantExtended) {
  const t = pick(ch, wantExtended);
  const cur = 'USD';
  const price = t?.usd;
  const base = wantExtended ? extB.usd : stdB.usd;
  const b = blend(price);
  const bb = blend(base);
  const ratio = b != null && bb ? b / bb : null;
  return { t, price, b, ratio };
}

function apiRows(wantExtended) {
  return api.channels
    .filter((ch) => ch.available !== false && ch.tiers?.length)
    .map((ch) => {
      const { t, price, b, ratio } = rowData(ch, wantExtended);
      const cur = 'USD';
      const miss = price?.inputMiss;
      const hit = price?.inputHit;
      const out = price?.output;
      const notes = ch.notes || [];
      const publicNote = notes[0] || '';
      return `<tr data-id="${ch.providerId}">
        <td>${ch.isOfficial ? '<span class="badge">官方</span> ' : ''}${esc(ch.displayName)}</td>
        <td>${cur}</td>
        <td class="num">${money(miss, cur)}</td>
        <td class="num">${hit == null ? '<span class="na">未公布</span>' : money(hit, cur)}</td>
        <td class="num">${money(out, cur)}</td>
        <td class="num">${b == null ? '—' : money(b, cur)}</td>
        <td class="num"><span class="x ${ratioCls(ratio)}">${ratioTxt(ratio)}</span></td>
        <td class="num">${tok(ch.limits?.contextTokens)}</td>
        <td class="num">${tok(ch.limits?.maxOutputTokens)}</td>
        <td class="note">${esc(publicNote)}</td>
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
  <title>GPT-6.1 Sol · 渠道对照</title>
  <style>
    :root {
      --canvas: #e8edf3;
      --ink: #17191e;
      --gold: #9a845c;
      --blue: #10a37f;
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
    .nav-links a { color: #10a37f; text-decoration: none; font-weight: 500; }
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
    .pill.flagship { color: #0d8c6d; box-shadow: inset 0 0 0 1px #bfeadb; }
    .pill.flagship .dot { background: #10a37f; }
    .pill.frontier { color: #d97706; box-shadow: inset 0 0 0 1px #fde68a; }
    .pill.frontier .dot { background: #f59e0b; }
    .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .metric { background: var(--white); border-radius: 14px; padding: 12px; }
    .metric-head { display: flex; justify-content: space-between; color: var(--gold); font-size: 10.5px; }
    .metric-head .en { font-family: Georgia, "Times New Roman", serif; font-style: italic; }
    .metric-body { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 6px; }
    .metric-num { font-size: 26px; font-weight: 620; letter-spacing: -0.04em; line-height: 1; }
    .metric-sub { margin-top: 4px; color: #8a9099; font-size: 11px; }
    .rank { color: var(--blue); font-size: 18px; font-weight: 700; }
    .rank small { font-size: 11px; font-weight: 500; color: #4db69a; }
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
    .badge { display: inline-block; background: #e8f5f0; color: #0d8c6d; font-size: 11px; padding: 1px 6px; border-radius: 6px; }
    .x { font-weight: 700; }
    .x.ok { color: #2f7a4a; }
    .x.mid { color: #8a6d2f; }
    .x.hi { color: #c37b4c; }
    .x.hot { color: #b54646; }
    .na { color: #9aa1ab; }
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
      <strong>GPT-6.1 Sol (Max)</strong>
      <div class="nav-links">
        <a href="deepseek-v4.1-flash.html">DeepSeek Flash</a>
        <a href="deepseek-v4-pro.html">DeepSeek Pro</a>
        <a href="gemini-3.8-flash.html">Gemini Flash</a>
        <span>快照 2026.10.08</span>
      </div>
    </div>

    <section class="sec">
      <h2>01 模型介绍</h2>
      <div class="intro">
        <article class="poster">
          <header class="cardhd">
            <div class="brand">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="#10a37f"/>
                <path d="M12 6V18M6 12H18" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
              </svg>
              OpenAI
            </div>
            <div class="coord">图灵坐标</div>
          </header>
          <div class="title-row">
            <h1>GPT-6.1 Sol</h1>
            <div class="pills">
              <span class="pill flagship"><span class="dot"></span>前沿旗舰</span>
              <span class="pill frontier"><span class="dot"></span>高阶推理</span>
            </div>
          </div>
          <div class="metrics">
            <section class="metric">
              <div class="metric-head"><span class="en">AA Intelligence</span><span>综合智能指数</span></div>
              <div class="metric-body">
                <div><div class="metric-num">51.8</div><div class="metric-sub">全球第一梯队</div></div>
                <div class="rank">#3<small>/117</small></div>
              </div>
              <div class="bar"><span style="width:51.8%"></span></div>
            </section>
            <section class="metric">
              <div class="metric-head"><span class="en">Context Window</span><span>百万级上下文</span></div>
              <div class="metric-body">
                <div><div class="metric-num">1.05M</div><div class="metric-sub">128K 最大输出</div></div>
                <div class="rank">视觉</div>
              </div>
              <div class="bar"><span style="width:100%"></span></div>
            </section>
          </div>
          <section class="radar-card">
            <div class="radar-head">
              <div>
                <h3>主客观混合雷达图<em>「能力维度」</em></h3>
                <div class="legend">
                  <div class="me"><i></i>GPT-6.1 Sol (Max)</div>
                </div>
              </div>
              <div class="mean">六维均值<b>56</b></div>
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
                  <!-- GPT-6.1 Sol values: sci:54.0, ctx:57.7, agent:57.0, coding:53.9, know:59.3, fact:54.0 -->
                  <polygon points="0,-54 50.0,-28.9 49.4,28.5 0,53.9 -51.4,29.7 -46.8,-27.0"
                    fill="rgba(16,163,127,0.28)" stroke="#10a37f" stroke-width="2" stroke-linejoin="round"/>
                </g>
              </svg>
              <div class="lab top"><b>54</b>科学推理</div>
              <div class="lab tr"><b>58</b>长上下文推理</div>
              <div class="lab br"><b>57</b>智能体工作流</div>
              <div class="lab bot"><b>54</b>编程智能体</div>
              <div class="lab bl"><b>59</b>知识工作</div>
              <div class="lab tl"><b>54</b>事实可靠性</div>
            </div>
            <p class="src">数据来源 <b>Artificial Analysis</b> · <b>OpenAI 官方文档</b></p>
          </section>
          <div class="facts">
            <div class="fact"><div class="k">发布日期</div><div class="v">2026.09.02</div></div>
            <div class="fact"><div class="k">输入模态</div><div class="mods"><span class="on">T</span><span class="on">图</span><span>声</span><span>影</span></div></div>
            <div class="fact"><div class="k">输出模态</div><div class="mods"><span class="on">T</span><span>图</span><span>声</span><span>影</span></div></div>
            <div class="fact"><div class="k">上下文窗口</div><div class="v">1.05M token</div></div>
            <div class="fact"><div class="k">输出速度 <span class="tag">#11</span></div><div class="v">112.5 tok/s</div></div>
            <div class="fact"><div class="k">综合价格 <span class="tag">#32</span></div><div class="v">$1.47 /M</div></div>
          </div>
          <footer>
            <div>OpenAI 2026 旗舰前沿主力模型</div>
            <div>2026.10.08</div>
          </footer>
        </article>

        <aside class="side">
          <h3>身份与定位</h3>
          <dl class="kv">
            <dt>厂商</dt><dd>OpenAI</dd>
            <dt>开放性</dt><dd>闭源商业 API / Azure 专有</dd>
            <dt>架构</dt><dd>Frontier Multimodal MoE</dd>
            <dt>官方 ID</dt><dd><code>gpt-6.1-sol</code>（含 pro / fast 变体）</dd>
            <dt>模态</dt><dd>支持文本 + 图像多模态输入</dd>
            <dt>窗口</dt><dd>1,050,000 上下文 / 128,000 最大输出</dd>
            <dt>速度</dt><dd>112 tok/s · TTFC 0.98s</dd>
          </dl>
          <h3>公开榜单表现</h3>
          <div class="chips">
            <span class="chip">AA 智能 <b>#3/117</b> (51.83)</span>
            <span class="chip">经济学 <b>59.28</b></span>
            <span class="chip">法律推理 <b>57.69</b></span>
            <span class="chip">战略运营 <b>56.98</b></span>
            <span class="chip">Prompt Caching <b>$0.10/M</b></span>
          </div>
          <h3>与 DeepSeek / Gemini 横向对比</h3>
          <p class="call"><b>智能梯队</b>：GPT-6.1 Sol 的综合智能指数（51.83）显著高于 DeepSeek-V4.1-Flash (39.46) 与 Gemini 3.8 Flash (40.93)，在极其复杂的多轮自主 Agent 逻辑闭环、长篇商业与法律起草上处于绝对领先水准。</p>
          <p class="call"><b>性价比考量</b>：单价基准为 $2.00 / $10.00 / 缓存 $0.10（综合价 $1.47/M），比 DeepSeek-Flash 贵约 8 倍，但得益于 OpenAI 原生提示词缓存机制，在长上下文多次调用中能省去大量未命中成本。</p>
        </aside>
      </div>
    </section>

    <section class="sec">
      <h2>02 按量渠道</h2>
      <div class="toolbar">
        <button class="btn on" id="btn-std" type="button">标准窗口 (≤272K)</button>
        <button class="btn" id="btn-ext" type="button">超长窗口 (>272K)</button>
        <span class="hint">官方基准统一使用美元结算。超长上下文阶梯为 $4.00 / $0.20 / $15.00。主流云渠道多为 1.00× 直通。</span>
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
          <tbody id="api-std">${apiRows(false)}</tbody>
          <tbody id="api-ext" hidden>${apiRows(true)}</tbody>
        </table>
      </div>
    </section>

    <section class="sec">
      <h2>03 订阅渠道</h2>
      <p class="hint" style="margin-bottom:10px">折算以官方标准谷价（$2.00 / $0.10 / $10.00）为基准，编程 Agent 列为 87.4% 缓存率下的可用请求量估算。</p>
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

    <p class="foot">数据来源：OpenAI 官方文档、Azure AI Foundry、Artificial Analysis、OpenRouter（2026-10-08 快照）。本页不含个人实测。</p>
  </div>
  <script>
    const std = document.getElementById('api-std');
    const ext = document.getElementById('api-ext');
    const bStd = document.getElementById('btn-std');
    const bExt = document.getElementById('btn-ext');
    bStd.onclick = () => { std.hidden = false; ext.hidden = true; bStd.classList.add('on'); bExt.classList.remove('on'); };
    bExt.onclick = () => { std.hidden = true; ext.hidden = false; bExt.classList.add('on'); bStd.classList.remove('on'); };
  </script>
</body>
</html>
`;

const out = path.resolve('site/gpt-6.1-sol.html');
fs.writeFileSync(out, html);
console.log('wrote', out, html.length);
