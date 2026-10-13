import fs from 'fs';
import path from 'path';
import { renderTopNav, NAV_EXTRA_CSS } from './catalog.mjs';

// ROOT 必须锚定到脚本所在位置，而不是当前工作目录。
// 原先用 path.resolve('.')：只要不是在仓库根目录执行，site/ 就会被建到别处（或读不到 models/），
// 表现为莫名其妙的 ENOENT。从根目录运行时两者等价，因此这里改成脚本相对路径不改变既有行为。
const ROOT = path.resolve(import.meta.dirname, '..');
const SITE_DIR = path.join(ROOT, 'site');
fs.mkdirSync(SITE_DIR, { recursive: true });

// 辅助函数
const blend = (p) => {
  if (!p) return null;
  const hit = p.inputHit ?? p.input_cache_read ?? null;
  const miss = p.inputMiss ?? p.prompt ?? null;
  const out = p.output ?? p.completion ?? null;
  if (miss == null || out == null) return null;
  const h = hit != null ? hit : miss; // 若无缓存价则按未命中算
  return (7 * h + 2 * miss + 1 * out) / 10;
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

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// 统一 CSS（顶栏公司导航样式来自 catalog.mjs）
const UNIFIED_CSS = `
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
    .page { max-width: 1180px; margin: 0 auto; padding: 24px 24px 72px; }
    .topnav {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 22px; padding: 6px 0 14px; border-bottom: 1px solid var(--line);
    }
    .topnav strong { color: var(--ink); font-size: 16px; letter-spacing: -0.02em; }
    .topnav .nav-group { display: flex; align-items: center; gap: 4px; background: #dfe5ee; padding: 3px; border-radius: 8px; }
    .topnav .nav-btn {
      color: #5c6570; text-decoration: none; padding: 3px 9px; font-size: 12.5px; border-radius: 6px; font-weight: 500;
      transition: all 0.15s ease;
    }
    .topnav .nav-btn:hover { color: #17191e; }
    .topnav .nav-btn.active {
      background: var(--white); color: var(--ink); font-weight: 650; box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    }
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
    .coord { font-size: 18px; font-weight: 500; letter-spacing: 0.46em; margin-right: -0.46em; color: #4a5260; }
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
    .mods { display: flex; gap: 6px; color: #d5d9e0; font-size: 12px; font-weight: 600; }
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
${NAV_EXTRA_CSS}
`;

// 生成单页生成器
function generatePage(config) {
  const {
    currentFile,
    title,
    brandSvg,
    brandName,
    coordText = '图灵坐标',
    h1Title,
    pills, // [{ cls: 'reason', text: '推理' }, ...]
    metric1, // { en, zh, num, sub, rankNum, rankTotal, barPct }
    metric2, // { en, zh, num, sub, rankNum, rankTotal, barPct }
    radarMean,
    radarPolygonPoints,
    radarLabels, // { top: {val, txt}, tr, br, bot, bl, tl }
    radarSource = 'artificialanalysis.ai · 官方数据',
    facts, // [{ k, v, tag, mods: [ {on: bool, t: 'T'} ] }]
    posterFooter = { left: '数据仅供参考，请以个人体感为准', date: '2026.10.08' },
    sideKv, // [{ k, v }]
    sideChips, // [ text ]
    sideCalls, // [ text ]
    toolbar, // { btn1Text, btn2Text, hint }
    apiTable, // { getTbody1, getTbody2 }
    endpointsTable, // { title, getTbody }
    subTable, // { hint, getTbody }
    footerNote
  } = config;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · 渠道对照</title>
  <style>${UNIFIED_CSS}</style>
</head>
<body>
  <div class="page">
${renderTopNav({ currentFile, title, isIndex: false })}

    <section class="sec">
      <h2>01 模型介绍</h2>
      <div class="intro">
        <article class="poster">
          <header class="cardhd">
            <div class="brand">
              ${brandSvg}
              ${brandName}
            </div>
            <div class="coord">${coordText}</div>
          </header>
          <div class="title-row">
            <h1>${h1Title}</h1>
            <div class="pills">
              ${pills.map(p => `<span class="pill ${p.cls}"><span class="dot"></span>${p.text}</span>`).join('')}
            </div>
          </div>
          <div class="metrics">
            <section class="metric">
              <div class="metric-head"><span class="en">${metric1.en}</span><span>${metric1.zh}</span></div>
              <div class="metric-body">
                <div><div class="metric-num">${metric1.num}</div><div class="metric-sub">${metric1.sub}</div></div>
                <div class="rank">#${metric1.rankNum}<small>/${metric1.rankTotal}</small></div>
              </div>
              <div class="bar"><span style="width:${metric1.barPct}"></span></div>
            </section>
            <section class="metric">
              <div class="metric-head"><span class="en">${metric2.en}</span><span>${metric2.zh}</span></div>
              <div class="metric-body">
                <div><div class="metric-num">${metric2.num}</div><div class="metric-sub">${metric2.sub}</div></div>
                <div class="rank">#${metric2.rankNum}<small>/${metric2.rankTotal}</small></div>
              </div>
              <div class="bar"><span style="width:${metric2.barPct}"></span></div>
            </section>
          </div>
          <section class="radar-card">
            <div class="radar-head">
              <div>
                <h3>主客观混合雷达图<em>「原始分数」</em></h3>
                <div class="legend">
                  <div class="me"><i></i>${h1Title}</div>
                  <div class="avg"><i></i>本轮模型平均值（未收录）</div>
                </div>
              </div>
              <div class="mean">六维均值<b>${radarMean}</b></div>
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
                  <polygon points="${radarPolygonPoints}"
                    fill="rgba(59,111,216,0.28)" stroke="#3b6fd8" stroke-width="2" stroke-linejoin="round"/>
                </g>
              </svg>
              <div class="lab top"><b>${radarLabels.top.val}</b>${radarLabels.top.txt}</div>
              <div class="lab tr"><b>${radarLabels.tr.val}</b>${radarLabels.tr.txt}</div>
              <div class="lab br"><b>${radarLabels.br.val}</b>${radarLabels.br.txt}</div>
              <div class="lab bot"><b>${radarLabels.bot.val}</b>${radarLabels.bot.txt}</div>
              <div class="lab bl"><b>${radarLabels.bl.val}</b>${radarLabels.bl.txt}</div>
              <div class="lab tl"><b>${radarLabels.tl.val}</b>${radarLabels.tl.txt}</div>
            </div>
            <p class="src">数据来源 <b>${radarSource}</b></p>
          </section>
          <div class="facts">
            ${facts.map(f => {
              let inner = '';
              if (f.mods) {
                inner = `<div class="mods">${f.mods.map(m => `<span class="${m.on ? 'on' : ''}">${m.t}</span>`).join('')}</div>`;
              } else {
                inner = `<div class="v">${f.v}</div>`;
              }
              const tagHtml = f.tag ? ` <span class="tag">${f.tag}</span>` : '';
              return `<div class="fact"><div class="k">${f.k}${tagHtml}</div>${inner}</div>`;
            }).join('')}
          </div>
          <footer>
            <div>${posterFooter.left}</div>
            <div>${posterFooter.date}</div>
          </footer>
        </article>

        <aside class="side">
          <h3>身份</h3>
          <dl class="kv">
            ${sideKv.map(item => `<dt>${item.k}</dt><dd>${item.v}</dd>`).join('')}
          </dl>
          <h3>公开榜单</h3>
          <div class="chips">
            ${sideChips.map(c => `<span class="chip">${c}</span>`).join('')}
          </div>
          <h3>卡片口径与评测分析</h3>
          ${sideCalls.map(c => `<p class="call">${c}</p>`).join('')}
        </aside>
      </div>
    </section>

    <section class="sec">
      <h2>02 按量渠道</h2>
      <div class="toolbar">
        <button class="btn on" id="btn-t1" type="button">${toolbar.btn1Text}</button>
        <button class="btn" id="btn-t2" type="button">${toolbar.btn2Text}</button>
        <span class="hint">${toolbar.hint}</span>
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
          <tbody id="api-t1">${apiTable.getTbody1()}</tbody>
          <tbody id="api-t2" hidden>${apiTable.getTbody2()}</tbody>
        </table>
      </div>
      ${endpointsTable ? `
      <details>
        <summary>${endpointsTable.title}</summary>
        <div class="tbl-wrap" style="margin-top:10px">
          <table>
            <thead>
              <tr>
                <th>上游 / 供应商</th>
                <th class="num">未命中</th><th class="num">缓存</th><th class="num">输出</th>
                <th class="num">7:2:1</th><th class="num">vs 官方基准</th>
                <th class="num">最大输出</th><th>备注</th>
              </tr>
            </thead>
            <tbody>${endpointsTable.getTbody()}</tbody>
          </table>
        </div>
      </details>` : ''}
    </section>

    <section class="sec">
      <h2>03 订阅渠道</h2>
      <p class="hint" style="margin-bottom:10px">${subTable.hint}</p>
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
          <tbody>${subTable.getTbody()}</tbody>
        </table>
      </div>
    </section>

    <p class="foot">${footerNote}</p>
  </div>
  <script>
    const t1 = document.getElementById('api-t1');
    const t2 = document.getElementById('api-t2');
    const b1 = document.getElementById('btn-t1');
    const b2 = document.getElementById('btn-t2');
    b1.onclick = () => { t1.hidden = false; t2.hidden = true; b1.classList.add('on'); b2.classList.remove('on'); };
    b2.onclick = () => { t1.hidden = true; t2.hidden = false; b2.classList.add('on'); b1.classList.remove('on'); };
  </script>
</body>
</html>`;
}

// 导出生成器逻辑
export { generatePage, blend, money, tok, ratioTxt, ratioCls, esc, ROOT, SITE_DIR };
