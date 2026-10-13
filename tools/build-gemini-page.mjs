import fs from 'fs';
import path from 'path';

const root = path.resolve('models/gemini-3.8-flash');
const api = JSON.parse(fs.readFileSync(path.join(root, 'channels/api.json'), 'utf8'));
const sub = JSON.parse(fs.readFileSync(path.join(root, 'channels/subscription.json'), 'utf8'));

const blend = (p) => {
  if (!p) return null;
  if (p.inputHit == null || p.inputMiss == null || p.output == null) return null;
  return (7 * p.inputHit + 2 * p.inputMiss + 1 * p.output) / 10;
};
const pick = (ch, wantBatch) => {
  if (!ch.tiers?.length) return null;
  if (wantBatch) {
    return ch.tiers.find((t) => t.id === 'batch') || ch.tiers[0];
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
const batchB = api.baseline.tiers.find((t) => t.id === 'batch');

function rowData(ch, wantBatch) {
  const t = pick(ch, wantBatch);
  const cur = 'USD';
  const price = t?.usd;
  const base = wantBatch ? batchB.usd : stdB.usd;
  const b = blend(price);
  const bb = blend(base);
  const ratio = b != null && bb ? b / bb : null;
  return { t, price, b, ratio };
}

function apiRows(wantBatch) {
  return api.channels
    .filter((ch) => ch.available !== false && ch.tiers?.length)
    .map((ch) => {
      const { t, price, b, ratio } = rowData(ch, wantBatch);
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
        <td class="num">${hit == null ? '<span class="na">未单独列出</span>' : money(hit, cur)}</td>
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
  <title>Gemini 3.8 Flash · 渠道对照</title>
  <style>
    :root {
      --canvas: #e8edf3;
      --ink: #17191e;
      --gold: #9a845c;
      --blue: #1a73e8;
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
    .nav-links a { color: #1a73e8; text-decoration: none; }
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
    .pill.reason { color: #1a73e8; box-shadow: inset 0 0 0 1px #c9d6f0; }
    .pill.reason .dot { background: #1a73e8; }
    .pill.multi { color: #8e24aa; box-shadow: inset 0 0 0 1px #e1bee7; }
    .pill.multi .dot { background: #ab47bc; }
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
    .badge { display: inline-block; background: #e8eefc; color: #1a73e8; font-size: 11px; padding: 1px 6px; border-radius: 6px; }
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
      <strong>Gemini 3.8 Flash (High)</strong>
      <div class="nav-links">
        <a href="deepseek-v4.1-flash.html">DeepSeek Flash</a>
        <a href="deepseek-v4-pro.html">DeepSeek Pro</a>
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
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#1a73e8"/>
              </svg>
              Google DeepMind
            </div>
            <div class="coord">图灵坐标</div>
          </header>
          <div class="title-row">
            <h1>Gemini 3.8 Flash</h1>
            <div class="pills">
              <span class="pill reason"><span class="dot"></span>高推理</span>
              <span class="pill multi"><span class="dot"></span>全模态原生</span>
            </div>
          </div>
          <div class="metrics">
            <section class="metric">
              <div class="metric-head"><span class="en">AA Intelligence</span><span>综合智能指数</span></div>
              <div class="metric-body">
                <div><div class="metric-num">40.9</div><div class="metric-sub">超越多数同尺寸</div></div>
                <div class="rank">#6<small>/117</small></div>
              </div>
              <div class="bar"><span style="width:40.9%"></span></div>
            </section>
            <section class="metric">
              <div class="metric-head"><span class="en">Context Window</span><span>原生超长窗口</span></div>
              <div class="metric-body">
                <div><div class="metric-num">1.05M</div><div class="metric-sub">含视音频原生</div></div>
                <div class="rank">全模态</div>
              </div>
              <div class="bar"><span style="width:100%"></span></div>
            </section>
          </div>
          <section class="radar-card">
            <div class="radar-head">
              <div>
                <h3>主客观混合雷达图<em>「能力维度」</em></h3>
                <div class="legend">
                  <div class="me"><i></i>Gemini 3.8 Flash (High)</div>
                </div>
              </div>
              <div class="mean">六维均值<b>48</b></div>
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
                  <!-- Gemini values: sci:48.0, ctx:51.6, agent:48.4, coding:42.8, know:52.4, fact:46.8 -->
                  <polygon points="0,-48 44.7,-25.8 41.9,24.2 0,42.8 -45.4,26.2 -40.5,-23.4"
                    fill="rgba(26,115,232,0.28)" stroke="#1a73e8" stroke-width="2" stroke-linejoin="round"/>
                </g>
              </svg>
              <div class="lab top"><b>48</b>科学推理</div>
              <div class="lab tr"><b>52</b>长上下文推理</div>
              <div class="lab br"><b>48</b>智能体工作流</div>
              <div class="lab bot"><b>43</b>编程智能体</div>
              <div class="lab bl"><b>52</b>知识工作</div>
              <div class="lab tl"><b>47</b>事实可靠性</div>
            </div>
            <p class="src">数据来源 <b>Artificial Analysis</b> · <b>Google Cloud</b></p>
          </section>
          <div class="facts">
            <div class="fact"><div class="k">发布日期</div><div class="v">2026.08.20</div></div>
            <div class="fact"><div class="k">输入模态</div><div class="mods"><span class="on">T</span><span class="on">图</span><span class="on">声</span><span class="on">影</span></div></div>
            <div class="fact"><div class="k">输出模态</div><div class="mods"><span class="on">T</span><span>图</span><span>声</span><span>影</span></div></div>
            <div class="fact"><div class="k">上下文窗口</div><div class="v">1.05M token</div></div>
            <div class="fact"><div class="k">输出速度 <span class="tag">#5</span></div><div class="v">195.4 tok/s</div></div>
            <div class="fact"><div class="k">综合价格 <span class="tag">#18</span></div><div class="v">$0.58 /M</div></div>
          </div>
          <footer>
            <div>Google 原生全模态主力高速模型</div>
            <div>2026.10.08</div>
          </footer>
        </article>

        <aside class="side">
          <h3>身份与特点</h3>
          <dl class="kv">
            <dt>厂商</dt><dd>Google DeepMind</dd>
            <dt>开放性</dt><dd>闭源商业 API / Vertex AI 专有</dd>
            <dt>架构</dt><dd>原生全模态架构（原生音频/视频 Tokens）</dd>
            <dt>官方 ID</dt><dd><code>gemini-3.8-flash</code></dd>
            <dt>模态</dt><dd>四模态原生输入（文本/图片/音频/视频）</dd>
            <dt>窗口</dt><dd>1,048,576 上下文 / 65,536 最大输出</dd>
            <dt>速度</dt><dd>195 tok/s · TTFC 0.62s 极低首字延迟</dd>
          </dl>
          <h3>公开榜单表现</h3>
          <div class="chips">
            <span class="chip">AA 智能 <b>#6/117</b> (40.93)</span>
            <span class="chip">AA 速度 <b>#5/117</b></span>
            <span class="chip">AA 成本 <b>#18/117</b></span>
            <span class="chip">经济学 <b>52.36</b></span>
            <span class="chip">法律推理 <b>51.63</b></span>
            <span class="chip">内置联网 <b>Search Grounding</b></span>
          </div>
          <h3>与 DeepSeek 系列横向对比</h3>
          <p class="call"><b>核心强项</b>：原生全模态能力极其强大，不仅支持高分辨率长视频理解，还能直接流式输入原生音频；TTFC 首字延迟低至 0.62 秒；原生支持 Google Search 真实检索接地；AA 综合智能指数达 40.93，略胜于 DeepSeek-V4.1-Flash (39.46)。</p>
          <p class="call"><b>成本考量</b>：官方标准按量输入 $0.75 / 输出 $3.75 / 缓存 $0.075（7:2:1 综合价 $0.58/M），价格约为 DeepSeek-Flash 的 3.1 倍；但若使用官方 Batch API，享受 50% 优惠（$0.375/$1.875），综合成本将降至 $0.29/M，接近开源部署性价比。</p>
        </aside>
      </div>
    </section>

    <section class="sec">
      <h2>02 按量渠道</h2>
      <div class="toolbar">
        <button class="btn on" id="btn-std" type="button">标准按量</button>
        <button class="btn" id="btn-batch" type="button">对比 Batch 档 (50% 折扣)</button>
        <span class="hint">官方基准统一使用美元结算（$0.75 / $0.075 / $3.75）。主流云渠道多为 1.00× 直通。</span>
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
          <tbody id="api-batch" hidden>${apiRows(true)}</tbody>
        </table>
      </div>
    </section>

    <section class="sec">
      <h2>03 订阅渠道</h2>
      <p class="hint" style="margin-bottom:10px">折算以官方标准谷价（$0.75 / $0.075 / $3.75）为基准，编程 Agent 列为 87.4% 缓存率下的可用请求量估算。</p>
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

    <p class="foot">数据来源：Google Cloud 官方文档、Artificial Analysis、OpenRouter（2026-10-08 快照）。本页不含个人实测。</p>
  </div>
  <script>
    const std = document.getElementById('api-std');
    const batch = document.getElementById('api-batch');
    const bStd = document.getElementById('btn-std');
    const bBatch = document.getElementById('btn-batch');
    bStd.onclick = () => { std.hidden = false; batch.hidden = true; bStd.classList.add('on'); bBatch.classList.remove('on'); };
    bBatch.onclick = () => { std.hidden = true; batch.hidden = false; bBatch.classList.add('on'); bStd.classList.remove('on'); };
  </script>
</body>
</html>
`;

const out = path.resolve('site/gemini-3.8-flash.html');
fs.writeFileSync(out, html);
console.log('wrote', out, html.length);
