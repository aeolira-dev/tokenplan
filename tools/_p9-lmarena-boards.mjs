// tools/_p9-lmarena-boards.mjs — 一次性探针：补齐 LMArena 各 config 分榜
// 用法: node tools/_p9-lmarena-boards.mjs [config1,config2,...]
// 结果合并进 models/deepseek-v4.1-flash/raw/<date>/lmarena-subleaderboards.json 的 boards.<config>

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = 'deepseek-v4.1-flash';
const DATE = process.argv[2] && /^\d{4}-\d{2}-\d{2}$/.test(process.argv[2])
  ? process.argv[2] : '2026-10-08';
const OUT = join(ROOT, 'models', SLUG, 'raw', DATE, 'lmarena-subleaderboards.json');
const MODEL = 'deepseek-v4.1-flash-max';

const CONFIGS = (process.argv[2] && !/^\d{4}-\d{2}-\d{2}$/.test(process.argv[2])
  ? process.argv[2].split(',')
  : ['text_factuality', 'agent', 'webdev', 'vision', 'search', 'math', 'instruction_following']
).filter(Boolean);

async function grab(config, tries = 6) {
  let lastErr = 'unknown';
  for (let a = 1; a <= tries; a++) {
    try {
      const where = encodeURIComponent(`"model_name"='${MODEL}'`);
      const url = `https://datasets-server.huggingface.co/filter?dataset=lmarena-ai/leaderboard-dataset&config=${config}&split=latest&where=${where}`;
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
      const text = await res.text();
      if (text.trimStart().startsWith('<')) throw new Error('HTML response');
      const json = JSON.parse(text);
      if (json.error) throw new Error(json.error);
      return json.rows.map((r) => r.row);
    } catch (e) {
      lastErr = e.message;
      await new Promise((s) => setTimeout(s, 2000 * a));
    }
  }
  throw new Error(lastErr);
}

const doc = JSON.parse(await readFile(OUT, 'utf8'));
doc.boards ??= {};

for (const cfg of CONFIGS) {
  try {
    const rows = await grab(cfg);
    if (!rows.length) { console.log(`EMPTY ${cfg}`); continue; }
    doc.boards[cfg] = rows;
    const cats = rows.map((r) => `${r.category}=${r.rank}`).join(' ');
    console.log(`OK   ${cfg.padEnd(22)} ${rows.length} cats: ${cats.slice(0, 200)}`);
  } catch (e) {
    console.log(`ERR  ${cfg.padEnd(22)} ${e.message}`);
  }
}

doc.capturedAt = new Date().toISOString();
doc.source = 'https://datasets-server.huggingface.co/filter?dataset=lmarena-ai/leaderboard-dataset';
doc.modelName = MODEL;
await writeFile(OUT, JSON.stringify(doc, null, 2), 'utf8');
console.log(`\nsaved boards: ${Object.keys(doc.boards).join(', ')}`);
