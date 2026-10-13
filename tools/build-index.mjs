import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { VENDORS, OPEN_LABEL, SNAPSHOT, catalogStats, renderTopNav, NAV_EXTRA_CSS } from './catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(__dirname, '../site');
fs.mkdirSync(SITE_DIR, { recursive: true });

const stats = catalogStats();

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function openBadge(open) {
  const map = {
    weights: ['开源', 'ok'],
    partial: ['部分开源', 'mid'],
    closed: ['闭源', ''],
    unknown: ['—', 'na'],
  };
  const [label, cls] = map[open] || map.unknown;
  return `<span class="ob ${cls}">${label}</span>`;
}

function modelChip(m) {
  const tag = m.tag ? `<span class="mtag">${esc(m.tag)}</span>` : '';
  const type = m.type ? `<span class="mtype">${esc(m.type)}</span>` : '';
  const inner = `<span class="mname">${esc(m.name)}</span>${tag}${type}`;
  if (m.href) {
    return `<a class="mchip live" href="${m.href}">${inner}<span class="go">横评</span></a>`;
  }
  return `<span class="mchip">${inner}</span>`;
}

function vendorCard(v) {
  const paused = v.status === 'paused'
    ? '<span class="ob hot">官方暂停销售</span>'
    : '';
  const models = v.models.map(modelChip).join('');
  return `<article class="vcard" id="${esc(v.id)}" data-region="${v.region}" data-open="${v.open}" data-name="${esc(v.nameZh)} ${esc(v.name)}">
    <header>
      <div>
        <h3>${esc(v.nameZh)}</h3>
        <p class="ven">${esc(v.name)} · ${esc(v.country)}</p>
      </div>
      <div class="vmeta">${openBadge(v.open)}${paused}</div>
    </header>
    <div class="mlist">${models}</div>
  </article>`;
}

const cnVendors = VENDORS.filter((v) => v.region === 'cn');
const osVendors = VENDORS.filter((v) => v.region === 'os');

const css = `
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
    }
    .topnav .nav-btn:hover { color: #17191e; }
    ${NAV_EXTRA_CSS}
    h1 { font-size: 28px; font-weight: 650; letter-spacing: -0.038em; line-height: 1.12; margin: 8px 0 10px; }
    .lede { color: #5c6570; font-size: 14px; max-width: 68ch; line-height: 1.65; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 18px 0 8px; }
    .stat { background: #fff; border-radius: 14px; padding: 12px 14px; }
    .stat .k { color: #8a9099; font-size: 11px; }
    .stat .v { font-size: 22px; font-weight: 620; letter-spacing: -0.04em; margin-top: 4px; }
    .toolbar { display: flex; gap: 8px; align-items: center; margin: 18px 0 10px; flex-wrap: wrap; }
    .btn {
      border: 1px solid var(--line); background: #fff; border-radius: 999px;
      padding: 5px 12px; font-size: 13px; cursor: pointer;
    }
    .btn.on { background: #1f2a3d; color: #fff; border-color: #1f2a3d; }
    .hint { font-size: 12.5px; color: #6a7380; }
    input.filter {
      border: 1px solid var(--line); background: #fff; border-radius: 999px;
      padding: 6px 14px; font-size: 13px; min-width: 220px; outline: none;
    }
    .sec { margin-top: 28px; }
    .sec h2 {
      font-size: 13px; font-weight: 650; letter-spacing: 0.12em;
      color: #6a7380; text-transform: uppercase; margin-bottom: 14px;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .vcard {
      background: #fff; border-radius: 14px; padding: 16px 16px 14px;
    }
    .vcard header { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; margin-bottom: 10px; }
    .vcard h3 { font-size: 16px; font-weight: 650; letter-spacing: -0.02em; }
    .ven { color: #8a9099; font-size: 12px; margin-top: 2px; }
    .vmeta { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-end; }
    .ob {
      display: inline-block; background: #eef1f5; color: #5c6570;
      font-size: 11px; padding: 1px 7px; border-radius: 6px;
    }
    .ob.ok { background: #e5f4ea; color: #2f7a4a; }
    .ob.mid { background: #f4efe3; color: #8a6d2f; }
    .ob.hot { background: #f8e8e8; color: #b54646; }
    .ob.na { color: #9aa1ab; }
    .mlist { display: flex; flex-wrap: wrap; gap: 6px; }
    .mchip {
      display: inline-flex; align-items: baseline; gap: 6px; flex-wrap: wrap;
      background: var(--canvas); border-radius: 10px; padding: 6px 9px; font-size: 12.5px;
    }
    a.mchip.live {
      text-decoration: none; color: inherit;
      box-shadow: inset 0 0 0 1px #c9d6f0; background: #f4f7fc;
    }
    a.mchip.live:hover { box-shadow: inset 0 0 0 1px #3b6fd8; }
    .mname { font-weight: 650; }
    .mtype { color: #8a9099; font-size: 11px; }
    .mtag {
      background: #e8eefc; color: #3b6fd8; font-size: 10.5px;
      padding: 0 5px; border-radius: 5px;
    }
    .go { color: #3b6fd8; font-size: 11px; font-weight: 700; margin-left: 2px; }
    .foot { margin-top: 28px; font-size: 12px; color: #6a7380; }
    .hidden { display: none !important; }
    @media (max-width: 860px) {
      .grid, .stats { grid-template-columns: 1fr; }
    }
`;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>横评目录 · 按发布公司</title>
  <style>${css}</style>
</head>
<body>
  <div class="page">
${renderTopNav({ title: '按发布公司浏览', isIndex: true })}

    <h1>在用模型目录</h1>
    <p class="lede">按发布公司分组。只收当前主力与在售代际，旧代（GPT-5.x、Claude Opus 4.x、DeepSeek-V4、Hy3、GLM-5.2、Grok 4.6、Llama 等）不进目录。带「横评」的条目已有渠道对照页。</p>

    <div class="stats">
      <div class="stat"><div class="k">厂商</div><div class="v">${stats.vendors}</div></div>
      <div class="stat"><div class="k">在用模型</div><div class="v">${stats.models}</div></div>
      <div class="stat"><div class="k">国内 / 海外</div><div class="v">${stats.cn} / ${stats.os}</div></div>
      <div class="stat"><div class="k">已建档横评</div><div class="v">${stats.pages}</div></div>
    </div>

    <div class="toolbar">
      <button class="btn on" data-region="all" type="button">全部</button>
      <button class="btn" data-region="cn" type="button">国内</button>
      <button class="btn" data-region="os" type="button">海外</button>
      <input class="filter" id="q" type="search" placeholder="筛厂商或型号" />
      <span class="hint">口径：${SNAPSHOT} · 忽略过时模型</span>
    </div>

    <section class="sec" id="cn">
      <h2>国内厂商</h2>
      <div class="grid">${cnVendors.map(vendorCard).join('')}</div>
    </section>

    <section class="sec" id="os">
      <h2>海外厂商</h2>
      <div class="grid">${osVendors.map(vendorCard).join('')}</div>
    </section>

    <p class="foot">来源：《大模型厂商与模型总表》${SNAPSHOT}。不收录纯视频 / TTS 厂商。Kimi 官方已暂停销售，条目保留但标红。未建档型号只做目录，不造死链。</p>
  </div>
  <script>
    const btns = [...document.querySelectorAll('.toolbar .btn')];
    const cards = [...document.querySelectorAll('.vcard')];
    const secs = [...document.querySelectorAll('.sec')];
    const q = document.getElementById('q');
    let region = 'all';
    function apply() {
      const term = (q.value || '').trim().toLowerCase();
      cards.forEach(c => {
        const regionOk = region === 'all' || c.dataset.region === region;
        const hay = (c.dataset.name + ' ' + c.textContent).toLowerCase();
        const textOk = !term || hay.includes(term);
        c.classList.toggle('hidden', !(regionOk && textOk));
      });
      secs.forEach(s => {
        const any = [...s.querySelectorAll('.vcard')].some(c => !c.classList.contains('hidden'));
        s.classList.toggle('hidden', !any);
      });
    }
    btns.forEach(b => b.onclick = () => {
      region = b.dataset.region;
      btns.forEach(x => x.classList.toggle('on', x === b));
      apply();
    });
    q.addEventListener('input', apply);
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(SITE_DIR, 'index.html'), html, 'utf8');
console.log(`Built site/index.html · ${stats.vendors} vendors · ${stats.models} current models · ${stats.pages} pages`);
