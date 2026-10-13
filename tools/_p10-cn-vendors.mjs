// tools/_p10-cn-vendors.mjs — 一次性探针：补齐国内厂商（百炼 / 腾讯 / 硅基 / 百度）官方价
// 用法: node tools/_p10-cn-vendors.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'models', 'deepseek-v4.1-flash', 'raw', '2026-10-08');
await mkdir(RAW, { recursive: true });

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';

const TARGETS = [
  ['aliyun-bailian-flash', 'https://help.aliyun.com/zh/model-studio/models'],
  ['aliyun-bailian-price', 'https://help.aliyun.com/zh/model-studio/model-pricing'],
  ['aliyun-intl-flash', 'https://www.alibabacloud.com/help/en/model-studio/models'],
  ['tencent-lkeap-flash', 'https://cloud.tencent.com/document/product/1772/115963'],
  ['siliconflow-flash', 'https://cloud.siliconflow.cn/models/detail/deepseek-ai/DeepSeek-V4.1-Flash'],
  ['siliconflow-pricing2', 'https://www.siliconflow.com/pricing'],
  ['baidu-qianfan-flash', 'https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb'],
  ['nebius-flash', 'https://studio.nebius.com/models/deepseek-ai/DeepSeek-V4.1-Flash'],
  ['vercel-flash', 'https://vercel.com/ai-gateway/models/deepseek-v4.1-flash'],
  ['novita-flash', 'https://novita.ai/model-api/product/llm-api/deepseek-v4.1-flash'],
];

const strip = (s) => s
  .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#\d+;/g, '')
  .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

const report = [];
for (const [name, url] of TARGETS) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,*/*' }, redirect: 'follow' });
    const html = await res.text();
    await writeFile(join(RAW, `_probe-${name}.html`), html, 'utf8');
    const text = strip(html);
    await writeFile(join(RAW, `_probe-${name}.txt`), text, 'utf8');
    const hit = /deepseek[-_ ]?v4[.\-]?1[-_ ]?flash|DeepSeek[-\s]V4\.1[-\s]Flash|deepseek-flash/i.test(text);
    console.log(`${res.status}  ${name.padEnd(24)} ${html.length}B  text=${text.length}  v4.1Flash=${hit}`);
    report.push({ name, url, status: res.status, bytes: html.length, textChars: text.length, mentionsV41Flash: hit, ms: Date.now() - t0 });
  } catch (e) {
    console.log(`ERR ${name.padEnd(24)} ${e.message}`);
    report.push({ name, url, error: e.message });
  }
}
await writeFile(join(RAW, '_probe-cn-vendors-report.json'), JSON.stringify(report, null, 2), 'utf8');
