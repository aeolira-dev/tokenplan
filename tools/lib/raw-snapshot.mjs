// 读取 raw/ 下的原始快照，并在缺失时给出可执行的说明。
//
// 为什么需要这个模块：raw/ 被 .gitignore 刻意排除（快照体积大、属数据溯源材料，站点本身不需要）。
// 但页面重建链（render-all-sites → generate-big3-pages → generate-big3-data）在**模块加载期**
// 就读 raw/_global/<date>/modelsdev.json 与 aa-peers.json。于是「克隆仓库后重建」这条路径
// 会以裸 ENOENT 堆栈失败，看不出是「缺快照」还是「代码坏了」。
// 2026-10-13 复核实测：仅用已跟踪文件导出的树里，validate / build-index / check-live 正常，
// render-all-sites 失败；把这两个快照补进去后，16/16 页面重建结果与工作区逐字节一致。
// 因此快照不是可选项，只是**不在 git 里**——这里把这件事说清楚。

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

export const SNAPSHOT_DATE = '2026-10-08';

export function rawPath(...parts) {
  return path.join(ROOT, 'raw', ...parts);
}

// 读 raw/ 下的 JSON；缺失时抛出带恢复步骤的错误，而不是裸 ENOENT。
export function readRawJson(relPath, { date = SNAPSHOT_DATE } = {}) {
  const full = rawPath('_global', date, relPath);
  if (!fs.existsSync(full)) {
    throw new Error(
      `缺少原始快照：raw/_global/${date}/${relPath}\n` +
        `  原因：raw/ 被 .gitignore 排除（快照体积大，站点运行不需要），所以克隆仓库后不会自带。\n` +
        `  影响：仅「重新生成页面」需要它；validate.mjs / build-index.mjs / check-live.mjs 不需要。\n` +
        `  恢复（任选其一）：\n` +
        `    1. 从原机器复制 raw/ 目录（共 3 个文件，约 10 MB）；\n` +
        `    2. 重新抓取：node tools/fetch.mjs --date ${date}（需要联网，会覆盖同日快照）。\n` +
        `  注意：若只想发版，用 node tools/release.mjs —— 它不依赖 raw/，不需要重建页面。`,
    );
  }
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}
