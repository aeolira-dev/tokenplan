/**
 * 在用模型目录（按发布公司）。
 * 口径对齐《大模型厂商与模型总表.md》2026-10-08：
 *   - 以「厂商 → 当前主力」为单元
 *   - 剔除已被取代的旧代（GLM-4.6 / GPT-5.x / Claude Opus 4.x /
 *     DeepSeek-V4 / Hy3 / GLM-5.2 / GPT-5.6 / Grok 4.6 / Mistral Large 3 /
 *     MiMo-V2.5 / Llama 品牌 / 匿名测试线 / 实验视觉版）
 *   - 不收录纯视频 / TTS 厂商（可灵、PixVerse、Higgsfield、Cartesia）
 * href 仅指向已建档的横评页；其余为目录条目，不造死链。
 */

export const SNAPSHOT = '2026.10.08';

const W = 'weights';
const P = 'partial';
const C = 'closed';
const U = 'unknown';

export const OPEN_LABEL = {
  weights: '开源',
  partial: '部分开源',
  closed: '闭源',
  unknown: '—',
};

export const VENDORS = [
  {
    id: 'deepseek', name: 'DeepSeek', nameZh: '深度求索', country: '中国', region: 'cn', open: W,
    models: [
      { name: 'DeepSeek-V4 Pro 0813', type: '旗舰推理', href: 'deepseek-v4-pro.html', short: 'Pro' },
      { name: 'DeepSeek-V4.1 Flash', type: '轻量主力', href: 'deepseek-v4.1-flash.html', short: 'Flash' },
    ],
  },
  {
    id: 'bytedance', name: 'ByteDance', nameZh: '字节跳动', country: '中国', region: 'cn', open: C,
    models: [
      { name: 'Doubao Seed 2.1 Pro', type: '旗舰' },
      { name: 'TRAE', type: '编程专用' },
    ],
  },
  {
    id: 'qwen', name: 'Qwen', nameZh: '阿里云 / 千问', country: '中国', region: 'cn', open: P,
    models: [
      { name: 'Qwen3.8-Max', type: '旗舰闭源' },
      { name: 'Qwen3.8-Flash-Next', type: '开源预览', tag: '预览' },
      { name: 'Qwen3.8 Omni Flash', type: '全模态' },
      { name: 'Qwen3.8-Flash', type: '轻量闭源' },
      { name: 'Qwen3.8 27B', type: '开源' },
      { name: 'Qwen3.8 2.4T A95B', type: '开源 MoE' },
    ],
  },
  {
    id: 'tencent', name: 'Tencent', nameZh: '腾讯', country: '中国', region: 'cn', open: P,
    models: [
      { name: 'Hy4', type: '旗舰预览', tag: '预览' },
      { name: 'HY-2.0', type: '通用主力' },
    ],
  },
  {
    id: 'huawei', name: 'Huawei', nameZh: '华为', country: '中国', region: 'cn', open: U,
    models: [{ name: '盘古 5.0', type: '行业 + 通用' }],
  },
  {
    id: 'moonshot', name: 'Moonshot AI', nameZh: '月之暗面', country: '中国', region: 'cn', open: P, status: 'paused',
    models: [
      { name: 'Kimi K3', type: '旗舰', href: 'kimi-k3.html', short: 'Kimi K3' },
      { name: 'Kimi K2.8 Preview', type: '预览版', tag: '预览' },
      { name: 'Kimi K2.7 Code', type: '编程专用' },
    ],
  },
  {
    id: 'baidu', name: 'Baidu', nameZh: '百度', country: '中国', region: 'cn', open: C,
    models: [{ name: 'ERNIE 5.1', type: '旗舰' }],
  },
  {
    id: 'zhipu', name: 'Z.ai', nameZh: '智谱 AI', country: '中国', region: 'cn', open: W,
    models: [
      { name: 'GLM-5.3', type: '旗舰' },
      { name: 'GLM-5.3-Flash', type: '原生多模态', href: 'glm-5.3-flash.html', short: 'GLM-5.3-Flash' },
    ],
  },
  {
    id: '360', name: '360', nameZh: '360', country: '中国', region: 'cn', open: C,
    models: [{ name: '360 智脑', type: '通用' }],
  },
  {
    id: 'minimax', name: 'MiniMax', nameZh: 'MiniMax', country: '中国', region: 'cn', open: W,
    models: [{ name: 'MiniMax M3', type: '旗舰' }],
  },
  {
    id: 'chinatelecom', name: 'China Telecom AI', nameZh: '中电信人工智能', country: '中国', region: 'cn', open: U,
    models: [{ name: '星辰', type: '行业大模型' }],
  },
  {
    id: 'stepfun', name: 'StepFun', nameZh: '阶跃星辰', country: '中国', region: 'cn', open: P,
    models: [{ name: 'Step 5', type: '旗舰 MoE', tag: '预览', href: 'step-5-preview.html', short: 'Step 5 Preview' }],
  },
  {
    id: 'sensetime', name: 'SenseTime', nameZh: '商汤科技', country: '中国', region: 'cn', open: U,
    models: [{ name: 'SenseNova V6', type: '多模态' }],
  },
  {
    id: 'unicom', name: 'China Unicom', nameZh: '中国联通', country: '中国', region: 'cn', open: C,
    models: [{ name: '元景', type: '行业大模型' }],
  },
  {
    id: 'modelbest', name: 'ModelBest', nameZh: '面壁智能', country: '中国', region: 'cn', open: W,
    models: [
      { name: 'MiniCPM', type: '端侧开源' },
      { name: 'SuperMate', type: '通用' },
    ],
  },
  {
    id: 'iflytek', name: 'iFlytek', nameZh: '科大讯飞', country: '中国', region: 'cn', open: U,
    models: [{ name: '讯飞星火 X2', type: '旗舰' }],
  },
  {
    id: 'xiaomi', name: 'Xiaomi', nameZh: '小米', country: '中国', region: 'cn', open: W,
    models: [
      { name: 'MiMo-V2.6-Pro', type: '旗舰', href: 'mimo-v2.6-pro.html', short: 'MiMo-V2.6-Pro' },
      { name: 'MiMo-V2.6-Flash', type: '轻量' },
    ],
  },
  {
    id: 'chinamobile', name: 'China Mobile', nameZh: '中国移动', country: '中国', region: 'cn', open: C,
    models: [{ name: '中移九天', type: '行业大模型' }],
  },
  {
    id: 'yonyou', name: 'Yonyou', nameZh: '用友网络', country: '中国', region: 'cn', open: C,
    models: [{ name: 'YonGPT', type: '企业软件' }],
  },
  {
    id: 'kunlun', name: 'Kunlun', nameZh: '昆仑万维', country: '中国', region: 'cn', open: P,
    models: [{ name: 'Skywork / 天工', type: '通用 + Agent' }],
  },
  {
    id: 'jd', name: 'JD', nameZh: '京东', country: '中国', region: 'cn', open: C,
    models: [{ name: 'JoyAI', type: '产业大模型' }],
  },
  {
    id: 'baichuan', name: 'Baichuan', nameZh: '百川智能', country: '中国', region: 'cn', open: U,
    models: [{ name: 'Baichuan', type: '通用 + 医疗' }],
  },
  {
    id: 'inspur', name: 'Inspur', nameZh: '浪潮云', country: '中国', region: 'cn', open: C,
    models: [{ name: '海若', type: '行业大模型' }],
  },
  {
    id: 'paradigm', name: '4Paradigm', nameZh: '范式智能', country: '中国', region: 'cn', open: C,
    models: [{ name: 'SageGPT', type: '企业级' }],
  },
  {
    id: 'shailab', name: 'Shanghai AI Lab', nameZh: '上海人工智能实验室', country: '中国', region: 'cn', open: W,
    models: [
      { name: 'Intern-S1-Pro', type: '科学多模态' },
      { name: 'Atria Dawn', type: '旗舰预览', tag: '预览' },
      { name: 'InternLM 3', type: '开源' },
    ],
  },
  {
    id: '01ai', name: '01.AI', nameZh: '零一万物', country: '中国', region: 'cn', open: P,
    models: [{ name: 'Yi-Vision', type: '多模态' }],
  },
  {
    id: 'mobvoi', name: 'Mobvoi', nameZh: '出门问问', country: '中国', region: 'cn', open: C,
    models: [{ name: '序列猴子', type: '通用' }],
  },
  {
    id: 'mengzi', name: 'Langboat', nameZh: '澜舟科技', country: '中国', region: 'cn', open: U,
    models: [{ name: '孟子 Mengzi', type: '轻量 + 金融' }],
  },
  {
    id: 'meituan', name: 'Meituan', nameZh: '美团', country: '中国', region: 'cn', open: W,
    models: [{ name: 'LongCat-2.0', type: '旗舰开源' }],
  },
  {
    id: 'inclusionai', name: 'InclusionAI', nameZh: '蚂蚁集团', country: '中国', region: 'cn', open: W,
    models: [
      { name: 'Ling 3.1 Flash', type: '轻量开源' },
      { name: 'Ling 3.0 Flash', type: '原生多模态' },
      { name: 'Ling 3.0 Flash Fin', type: '金融特化' },
    ],
  },
  {
    id: 'xverse', name: 'XVERSE', nameZh: '元象', country: '中国', region: 'cn', open: W,
    models: [{ name: 'XVERSE-Ent', type: '泛娱乐底座' }],
  },
  {
    id: 'anthropic', name: 'Anthropic', nameZh: 'Anthropic', country: '美国', region: 'os', open: C,
    models: [
      { name: 'Claude Opus 5.5', type: '旗舰', href: 'claude-opus-5.5.html', short: 'Opus 5.5' },
      { name: 'Claude Fable 5.1', type: '创意 / 长文本', href: 'claude-fable-5.1.html', short: 'Fable 5.1' },
      { name: 'Claude Sonnet 5.5', type: '主力中档', href: 'claude-sonnet-5.5.html', short: 'Sonnet 5.5' },
      { name: 'Claude Haiku 5.5', type: '轻量', href: 'claude-haiku-5.5.html', short: 'Haiku 5.5' },
      { name: 'Claude Mythos 5', type: '垂直线' },
    ],
  },
  {
    id: 'openai', name: 'OpenAI', nameZh: 'OpenAI', country: '美国', region: 'os', open: C,
    models: [
      { name: 'GPT-6.1 Sol', type: '旗舰', href: 'gpt-6.1-sol.html', short: '6.1 Sol' },
      { name: 'GPT-6 Astra', type: 'Agent 向', href: 'gpt-6-astra.html', short: 'Astra' },
      { name: 'GPT-6 Luna', type: '轻量', href: 'gpt-6-luna.html', short: 'Luna' },
      { name: 'GPT-6 Sol', type: '通用' },
    ],
  },
  {
    id: 'google', name: 'Google DeepMind', nameZh: 'Google DeepMind', country: '美国', region: 'os', open: P,
    models: [
      { name: 'Gemini 4 Argon', type: '旗舰', href: 'gemini-4-argon.html', short: '4 Argon' },
      { name: 'Gemini 3.8 Flash', type: '主力轻量', href: 'gemini-3.8-flash.html', short: '3.8 Flash' },
      { name: 'Gemini 3.8 Omni', type: '全模态' },
      { name: 'Gemma 4', type: '开源' },
    ],
  },
  {
    id: 'xai', name: 'xAI', nameZh: 'xAI', country: '美国', region: 'os', open: P,
    models: [
      { name: 'Grok 4.7', type: '旗舰' },
      { name: 'Grok 4.20', type: '通用' },
    ],
  },
  {
    id: 'meta', name: 'Meta', nameZh: 'Meta', country: '美国', region: 'os', open: W,
    models: [
      { name: 'Muse Spark 1.3', type: '旗舰开源' },
      { name: 'Muse Glimmer-30B', type: '开源中等尺寸' },
    ],
  },
  {
    id: 'mistral', name: 'Mistral AI', nameZh: 'Mistral AI', country: '法国', region: 'os', open: W,
    models: [
      { name: 'Mistral Large 4', type: '旗舰' },
      { name: 'Mistral Medium 3.5', type: '中等' },
      { name: 'Devstral 2', type: '编程专用' },
      { name: 'Shieldstral 1.0', type: '安全小模型' },
    ],
  },
  {
    id: 'cohere', name: 'Cohere', nameZh: 'Cohere', country: '加拿大', region: 'os', open: U,
    models: [
      { name: 'Command A+', type: '旗舰 RAG' },
      { name: 'North', type: '企业平台' },
    ],
  },
  {
    id: 'thinkingmachines', name: 'Thinking Machines', nameZh: 'Thinking Machines', country: '美国', region: 'os', open: W,
    models: [
      { name: 'Inkling', type: '旗舰' },
      { name: 'Inkling Small', type: '轻量' },
    ],
  },
  {
    id: 'nvidia', name: 'NVIDIA', nameZh: 'NVIDIA', country: '美国', region: 'os', open: W,
    models: [
      { name: 'Nemotron 3 Ultra', type: '旗舰开源' },
      { name: 'Nemotron 3.5 Lightning', type: '轻量开源' },
    ],
  },
  {
    id: 'ibm', name: 'IBM', nameZh: 'IBM', country: '美国', region: 'os', open: W,
    models: [{ name: 'Granite 4.2', type: '企业开源' }],
  },
  {
    id: 'inception', name: 'Inception Labs', nameZh: 'Inception Labs', country: '美国', region: 'os', open: U,
    models: [{ name: 'Mercury 2.5', type: '扩散语言模型' }],
  },
  {
    id: 'cursor', name: 'Cursor', nameZh: 'Cursor', country: '美国', region: 'os', open: C,
    models: [{ name: 'Composer 2.5', type: '编程专用' }],
  },
  {
    id: 'poolside', name: 'Poolside', nameZh: 'Poolside', country: '美国', region: 'os', open: U,
    models: [{ name: 'Laguna M.1', type: '编程专用' }],
  },
  {
    id: 'fireworks', name: 'Fireworks AI', nameZh: 'Fireworks AI', country: '美国', region: 'os', open: U,
    models: [{ name: 'Ember-1', type: '推理 / 前端' }],
  },
  {
    id: 'upstage', name: 'Upstage', nameZh: 'Upstage', country: '韩国', region: 'os', open: W,
    models: [
      { name: 'Solar Pro 4', type: '旗舰开源' },
      { name: 'Solar Mini 4', type: '轻量' },
    ],
  },
  {
    id: 'microsoft', name: 'Microsoft', nameZh: '微软', country: '美国', region: 'os', open: P,
    models: [
      { name: 'MAI', type: '通用' },
      { name: 'Phi', type: '端侧' },
    ],
  },
  {
    id: 'amazon', name: 'Amazon', nameZh: 'Amazon', country: '美国', region: 'os', open: C,
    models: [{ name: 'Nova 2', type: '通用 + 多模态' }],
  },
  {
    id: 'apple', name: 'Apple', nameZh: 'Apple', country: '美国', region: 'os', open: C,
    models: [{ name: 'Foundation Model', type: '端侧' }],
  },
  {
    id: 'ai21', name: 'AI21 Labs', nameZh: 'AI21 Labs', country: '以色列', region: 'os', open: P,
    models: [{ name: 'Jamba', type: 'SSM-Transformer' }],
  },
  {
    id: 'reka', name: 'Reka AI', nameZh: 'Reka AI', country: '美国', region: 'os', open: U,
    models: [
      { name: 'Reka Flash', type: '多模态' },
      { name: 'Reka Core', type: '多模态' },
    ],
  },
];

export function catalogStats() {
  const vendors = VENDORS.length;
  const models = VENDORS.reduce((n, v) => n + v.models.length, 0);
  const pages = VENDORS.reduce((n, v) => n + v.models.filter((m) => m.href).length, 0);
  const cn = VENDORS.filter((v) => v.region === 'cn').length;
  const os = VENDORS.filter((v) => v.region === 'os').length;
  return { vendors, models, pages, cn, os };
}

export function vendorByPage(file) {
  return VENDORS.find((v) => v.models.some((m) => m.href === file)) || null;
}

export function vendorsWithPages() {
  return VENDORS.filter((v) => v.models.some((m) => m.href));
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const NAV_EXTRA_CSS = `
    /* company-nav */
    .topnav-left { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    a.nav-home {
      color: #5c6570; text-decoration: none; font-size: 12.5px; font-weight: 650;
      padding: 3px 9px; border-radius: 6px; background: #dfe5ee;
    }
    a.nav-home:hover { color: #17191e; }
    a.nav-home.active {
      background: var(--white); color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    }
    .snap { font-size:11.5px; color:#8a9099; padding:2px 6px; background:#fff; border-radius:4px; }
    .topnav details.nav-switch {
      position: relative; display: inline-block;
      margin-top: 0; background: transparent; border-radius: 6px; padding: 0;
    }
    .nav-switch > summary {
      list-style: none; cursor: pointer; color: #5c6570; padding: 3px 9px;
      font-size: 12.5px; border-radius: 6px; font-weight: 500;
    }
    .nav-switch > summary::-webkit-details-marker { display: none; }
    .nav-switch > summary::marker { content: ''; }
    .nav-switch > summary:hover { color: #17191e; }
    .nav-switch-panel {
      position: absolute; right: 0; top: calc(100% + 6px); z-index: 30;
      min-width: 240px; background: #fff; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(23,25,30,0.12); padding: 8px;
    }
    .nav-switch-vendor { padding: 6px 8px; }
    .nav-switch-vendor .lab { display:block; font-size:11px; color:#8a9099; margin-bottom:4px; }
    .nav-switch-vendor a { display:inline-block; margin-right:8px; color:#3b6fd8; text-decoration:none; font-size:12.5px; }
    .nav-switch-all { display:block; margin-top:4px; padding:8px; font-size:12.5px; color:#3b6fd8; text-decoration:none; }
`;

export function renderTopNav({ currentFile, title, isIndex = false }) {
  const vendor = currentFile ? vendorByPage(currentFile) : null;
  const siblings = (vendor?.models || []).filter((m) => m.href);
  const others = vendorsWithPages().filter((v) => v.id !== vendor?.id);

  const siblingHtml = siblings.map((m) => {
    const active = m.href === currentFile ? ' active' : '';
    return `<a href="${m.href}" class="nav-btn${active}">${esc(m.short || m.name)}</a>`;
  }).join('');

  const otherHtml = others.map((v) => {
    const links = v.models.filter((m) => m.href).map((m) =>
      `<a href="${m.href}">${esc(m.short || m.name)}</a>`
    ).join('');
    return `<div class="nav-switch-vendor"><span class="lab">${esc(v.nameZh)}</span>${links}</div>`;
  }).join('');

  const homeClass = isIndex ? 'nav-home active' : 'nav-home';
  const switcher = isIndex ? '' : `
        <details class="nav-switch">
          <summary>其他厂商</summary>
          <div class="nav-switch-panel">
            ${otherHtml}
            <a class="nav-switch-all" href="index.html">全部厂商与在用模型 →</a>
          </div>
        </details>`;

  const indexJump = isIndex
    ? `<a href="#cn" class="nav-btn">国内</a><a href="#os" class="nav-btn">海外</a>`
    : siblingHtml;

  return `    <div class="topnav">
      <div class="topnav-left">
        <a class="${homeClass}" href="index.html">横评目录</a>
        <strong>${esc(title)}</strong>
        <span class="snap">${SNAPSHOT} 快照</span>
      </div>
      <nav class="nav-group">
        ${indexJump}${switcher}
      </nav>
    </div>`;
}

export const TOPNAV_RE = /<div class="topnav"[\s\S]*?<\/nav>\s*<\/div>/;
