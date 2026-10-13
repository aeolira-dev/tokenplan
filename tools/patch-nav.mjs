/**
 * 把已生成的横评页顶栏改成「目录 + 同公司已建档型号」。
 * 不改正文表格。可重复执行。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderTopNav, NAV_EXTRA_CSS, TOPNAV_RE, vendorByPage } from './catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(__dirname, '../site');

const PAGES = [
  { file: 'deepseek-v4.1-flash.html', title: 'DeepSeek V4.1 Flash' },
  { file: 'deepseek-v4-pro.html', title: 'DeepSeek V4 Pro' },
  { file: 'gemini-3.8-flash.html', title: 'Gemini 3.8 Flash' },
  { file: 'gemini-4-argon.html', title: 'Gemini 4 Argon' },
  { file: 'gpt-6.1-sol.html', title: 'GPT-6.1 Sol' },
  { file: 'gpt-6-astra.html', title: 'GPT-6 Astra' },
  { file: 'gpt-6-luna.html', title: 'GPT-6 Luna' },
  { file: 'claude-opus-5.5.html', title: 'Claude Opus 5.5' },
  { file: 'claude-sonnet-5.5.html', title: 'Claude Sonnet 5.5' },
  { file: 'claude-fable-5.1.html', title: 'Claude Fable 5.1' },
  { file: 'claude-haiku-5.5.html', title: 'Claude Haiku 5.5' },
];

const MARKER = '/* company-nav */';

for (const page of PAGES) {
  const fp = path.join(SITE_DIR, page.file);
  if (!fs.existsSync(fp)) {
    console.warn('skip missing', page.file);
    continue;
  }
  let html = fs.readFileSync(fp, 'utf8');
  const vendor = vendorByPage(page.file);
  if (!vendor) {
    console.warn('no vendor for', page.file);
    continue;
  }
  const nav = renderTopNav({ currentFile: page.file, title: page.title, isIndex: false });
  if (!TOPNAV_RE.test(html)) {
    console.warn('topnav not found', page.file);
    continue;
  }
  html = html.replace(TOPNAV_RE, nav.trimEnd());
  if (!html.includes(MARKER)) {
    html = html.replace('</style>', `${MARKER}\n${NAV_EXTRA_CSS}\n  </style>`);
  }
  fs.writeFileSync(fp, html, 'utf8');
  const sibs = vendor.models.filter((m) => m.href).map((m) => m.short || m.name).join(', ');
  console.log('patched', page.file, '·', vendor.nameZh, '·', sibs);
}
