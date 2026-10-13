// tools/fetch.mjs — 联网抓取层（手动运行，产出 raw/ 快照）
// 用法: node tools/fetch.mjs [--only name1,name2] [--date YYYY-MM-DD]
//
// 设计约束：
//   1. 本文件是唯一联网的脚本；validate.mjs 与 build.mjs 永不联网。
//   2. 每个源单独 try/catch，一个失败不阻断其余（失败记入 _fetch-report.json）。
//   3. 原文原样落盘，不做加工；加工在 normalize 阶段人工确认后进行。

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argOf = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const DATE = argOf('--date', new Date().toISOString().slice(0, 10));
const ONLY = (argOf('--only', '') || '').split(',').filter(Boolean);

const MODEL_SLUG = 'deepseek-v4.1-flash';
const RAW = join(ROOT, 'models', MODEL_SLUG, 'raw', DATE);
const GLOBAL_RAW = join(ROOT, 'raw', '_global', DATE);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';

async function get(url, { as = 'json', headers = {} } = {}) {
  const res = await fetch(url, { headers: { 'user-agent': UA, ...headers }, redirect: 'follow' });
  const body = as === 'json' ? await res.json() : await res.text();
  return { status: res.status, body, contentType: res.headers.get('content-type') };
}

/** 解出 Next.js App Router 内嵌的 self.__next_f 分片，还原转义后拼成可搜索的 blob */
function unpackNextFlight(html) {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)<\/script>/g)]
    .map((m) => m[1])
    .join('');
  return chunks.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
}

/** 从 start 处的 '{' 起，按平衡括号切出一个完整 JSON 对象（跳过字符串内的括号） */
function balancedSlice(blob, start, budget = 400000) {
  let depth = 0, inStr = false, esc = false;
  for (let j = start; j < Math.min(blob.length, start + budget); j++) {
    const c = blob[j];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return blob.slice(start, j + 1); }
  }
  return null;
}

/**
 * 找出所有含 anchor 的对象并逐个尝试解析，返回第一个满足 predicate 的。
 * AA 页里同一个模型 slug 会出现多次（release 列表 / 图表数据 / 度量块），
 * 只有含 intelligenceIndexEvaluations 的那个才是完整度量对象。
 */
function findJsonObject(blob, anchor, predicate = () => true, budget = 400000) {
  let from = 0;
  while (true) {
    const i = blob.indexOf(anchor, from);
    if (i < 0) return null;
    // anchor 形如 "slug":"..."，其外层对象的起始 '{' 就是锚点前最近的 '{'（中间只有 "id":"uuid",）
    const brace = blob.lastIndexOf('{', i);
    if (brace >= 0) {
      const slice = balancedSlice(blob, brace, budget);
      if (slice) {
        try {
          const obj = JSON.parse(slice);
          if (predicate(obj)) return obj;
        } catch { /* 不是完整对象，继续找下一个 */ }
      }
    }
    from = i + 1;
  }
}

/** 从 Flight blob 里抽出 initialModels 数组（AA 页的全部对照模型完整指标） */
function extractInitialModels(blob) {
  const anchor = '"initialModels":[';
  const i = blob.indexOf(anchor);
  if (i < 0) return null;
  const start = blob.indexOf('[', i);
  let depth = 0, inStr = false, esc = false;
  for (let j = start; j < Math.min(blob.length, start + 6_000_000); j++) {
    const c = blob[j];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return JSON.parse(blob.slice(start, j + 1)); }
  }
  return null;
}

const SOURCES = {
  // ── 官方文档 ───────────────────────────────────────────────
  'deepseek-pricing-doc': {
    target: RAW, file: 'deepseek-pricing.zh.html', as: 'text',
    url: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing',
    note: 'DeepSeek 官方中文定价页（峰谷计价、上下文、并发、能力）',
  },
  'deepseek-pricing-doc-en': {
    target: RAW, file: 'deepseek-pricing.en.html', as: 'text',
    url: 'https://api-docs.deepseek.com/quick_start/pricing',
    note: 'DeepSeek 官方英文定价页（USD 口径交叉验证）',
  },

  // ── 按量渠道：OpenRouter 逐端点 ─────────────────────────────
  'openrouter-flash-endpoints': {
    target: RAW, file: 'openrouter-endpoints-flash.json',
    url: 'https://openrouter.ai/api/v1/models/deepseek/deepseek-v4.1-flash/endpoints',
    note: '30 个 provider 端点：价格/缓存价/上下文/max_output/量化/uptime',
  },
  'openrouter-pro-endpoints': {
    target: RAW, file: 'openrouter-endpoints-pro.json',
    url: 'https://openrouter.ai/api/v1/models/deepseek/deepseek-v4-pro-0813/endpoints',
    note: '22 个 provider 端点（V4-Pro-0813）',
  },
  'openrouter-models-all': {
    target: GLOBAL_RAW, file: 'openrouter-models.json',
    url: 'https://openrouter.ai/api/v1/models',
    note: 'OpenRouter 全量模型目录（横评总览的模型索引来源）',
  },

  // ── 全局 provider 名单 ─────────────────────────────────────
  'modelsdev-all': {
    target: GLOBAL_RAW, file: 'modelsdev.json',
    url: 'https://models.dev/api.json',
    note: '226 家 provider + 各模型定价/上下文（含 cline-pass / opencode-go 等订阅渠道）',
  },

  // ── 榜单：Artificial Analysis ──────────────────────────────
  'aa-model-flash': {
    target: RAW, file: 'aa-model-flash.html', as: 'text',
    url: 'https://artificialanalysis.ai/models/deepseek-v4-1-flash',
    note: 'AA 模型页（内嵌 self.__next_f 完整指标 JSON）',
  },
  'aa-model-pro': {
    target: RAW, file: 'aa-model-pro.html', as: 'text',
    url: 'https://artificialanalysis.ai/models/deepseek-v4-pro',
    note: 'AA 模型页（V4-Pro-0813）',
  },
  'aa-providers-flash': {
    target: RAW, file: 'aa-providers-flash.html', as: 'text',
    url: 'https://artificialanalysis.ai/models/deepseek-v4-1-flash/providers',
    note: 'AA 渠道对比页（速度/延迟/价格区间）',
  },

  // ── 榜单：LMArena ─────────────────────────────────────────
  'lmarena-text-overall': {
    target: RAW, file: 'lmarena-text.json',
    url: 'https://datasets-server.huggingface.co/rows?dataset=lmarena-ai/leaderboard-dataset&config=text&split=latest&offset=0&length=100',
    note: 'LMArena text 榜前 100（overall 分类，含 DeepSeek 各变体排名）',
  },

  // ── 云渠道 ────────────────────────────────────────────────
  'azure-retail-deepseek': {
    target: RAW, file: 'azure-retail-deepseek.json',
    url: "https://prices.azure.com/api/retail/prices?$filter=contains(meterName,'DeepSeek')&$top=200",
    note: 'Azure Retail Prices API：DeepSeek 相关 meter（Azure 为 Fireworks 转售）',
  },
};

async function main() {
  const report = { date: DATE, startedAt: new Date().toISOString(), sources: [] };
  for (const [name, spec] of Object.entries(SOURCES)) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    const entry = { name, url: spec.url, file: spec.file, note: spec.note };
    const t0 = Date.now();
    try {
      const { status, body, contentType } = await get(spec.url, { as: spec.as || 'json' });
      const out = join(spec.target, spec.file);
      await mkdir(dirname(out), { recursive: true });
      const text = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
      await writeFile(out, text, 'utf8');
      Object.assign(entry, { status, bytes: Buffer.byteLength(text), contentType, ms: Date.now() - t0, ok: status === 200 });
    } catch (e) {
      Object.assign(entry, { ok: false, error: e.message, ms: Date.now() - t0 });
    }
    report.sources.push(entry);
    const flag = entry.ok ? 'OK ' : 'ERR';
    console.log(`${flag} ${name.padEnd(28)} ${entry.status ?? '-'} ${entry.bytes ?? 0}B ${entry.ms}ms${entry.error ? ' :: ' + entry.error : ''}`);
  }

  // ── 派生：从 AA 页解出结构化指标并落盘（仍是原始证据，只是可读化）──
  try {
    if (!ONLY.length || ONLY.includes('aa-model-flash')) {
      const html = await (await fetch(SOURCES['aa-model-flash'].url, { headers: { 'user-agent': UA } })).text();
      const blob = unpackNextFlight(html);
      const obj = findJsonObject(
        blob,
        '"slug":"deepseek-v4-1-flash","name":"DeepSeek V4.1 Flash (Max)"',
        (o) => o.intelligenceIndex != null && o.intelligenceIndexEvaluations != null,
      );
      if (obj) {
        const json = JSON.stringify(obj, null, 2);
        await writeFile(join(RAW, 'aa-metrics-flash.json'), json, 'utf8');
        console.log(`OK  aa-metrics-flash (derived)      ${Buffer.byteLength(json)}B  II=${obj.intelligenceIndex.toFixed(2)}`);
      } else {
        console.log('ERR aa-metrics-flash (derived)      metric object not found');
      }

      const peers = extractInitialModels(blob);
      if (peers) {
        // 只保留横评需要的字段，避免把 1.5MB 的页面全塞进数据层
        const slim = peers.map((m) => ({
          slug: m.slug, name: m.name, releaseDate: m.releaseDate, creator: m.creator?.slug,
          isOpenWeights: m.isOpenWeights, license: m.licenseName,
          parameters: m.parameters, activeParams: m.inferenceParametersActiveBillions,
          contextWindowTokens: m.contextWindowTokens,
          intelligenceIndex: m.intelligenceIndex, isEstimated: m.intelligenceIndexIsEstimated,
          capabilities: m.capabilities ?? null,
          price1mInputTokens: m.price1mInputTokens, price1mOutputTokens: m.price1mOutputTokens,
          cacheHitPrice: m.cacheHitPrice, cacheHitDiscountPercent: m.cacheHitDiscountPercent,
          price1mBlended7To2To1: m.price1mBlended7To2To1,
          costPerTaskUSD: m.intelligenceIndexCostPerTask?.cost?.total ?? null,
          timePerTaskSec: m.intelligenceIndexTimePerTask ?? null,
          outputTokensPerTask: m.intelligenceIndexOutputTokensPerTask?.output ?? null,
        }));
        const pj = JSON.stringify({ capturedAt: new Date().toISOString(), source: SOURCES['aa-model-flash'].url, models: slim }, null, 2);
        await writeFile(join(GLOBAL_RAW, 'aa-peers.json'), pj, 'utf8');
        console.log(`OK  aa-peers (derived)              ${Buffer.byteLength(pj)}B  ${slim.length} models`);
      } else {
        console.log('ERR aa-peers (derived)              initialModels not found');
      }
    }
  } catch (e) {
    console.log('ERR aa derivation                    ' + e.message);
  }

  report.finishedAt = new Date().toISOString();
  const failed = report.sources.filter((s) => !s.ok);
  await writeFile(join(RAW, '_fetch-report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n抓取完成：${report.sources.length - failed.length}/${report.sources.length} 成功` + (failed.length ? `，失败：${failed.map((f) => f.name).join(', ')}` : ''));
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
