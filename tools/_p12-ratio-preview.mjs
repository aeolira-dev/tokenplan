// tools/_p12-ratio-preview.mjs — 一次性探针：验证「倍数是价格的纯函数」这个设计
// 用法: node tools/_p12-ratio-preview.mjs
// 读 channels/api.json，对每个渠道算 offpeak / peak 两套倍数，打印成两张表。
//
// 关键规则（同币种相比，不做汇率换算）：
//   渠道 priceCurrency==="CNY" → 用渠道 cny 价 / 官方 cny 牌价
//   其余（默认 USD）           → 用渠道 usd 价 / 官方 usd 牌价
// 若不这样做，火山/百度的 ¥1 会被按 7.1 折成 $0.1408 再比官方 $0.15，
// 凭空得到假的 0.94x「比官方还便宜」，而两者其实是同价。

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const api = JSON.parse(await readFile(join(ROOT, 'models', 'deepseek-v4.1-flash', 'channels', 'api.json'), 'utf8'));

const BASE = Object.fromEntries(api.baseline.tiers.map((t) => [t.id, t]));

/** AA 的 7:2:1 混合口径 → 单一「混合单价」，用于表格的「与官方相比」列 */
const blended = (p) => (7 * p.inputHit + 2 * p.inputMiss + 1 * p.output) / 10;

/** 取出渠道在某档下、按其计价币种应使用的价格对象 */
function priceOf(channel, tierId) {
  const t = channel.tiers.find((x) => x.id === tierId) ?? channel.tiers[0];
  const cur = channel.priceCurrency === 'CNY' ? 'cny' : 'usd';
  if (!t[cur]) return { price: null, currency: cur, tier: t };
  return { price: t[cur], currency: cur, tier: t };
}

function ratios(channel, tierId) {
  const { price, currency } = priceOf(channel, tierId);
  const base = BASE[tierId][currency];
  if (!price || !base) return null;
  const r = {};
  for (const f of ['inputMiss', 'inputHit', 'output']) {
    r[f] = price[f] != null && base[f] != null ? price[f] / base[f] : null;
  }
  r.blended = price.inputHit != null && base.inputHit != null ? blended(price) / blended(base) : null;
  r.currency = currency;
  return r;
}

const fmt = (n) => (n == null ? '  n/a' : (n.toFixed(2) + 'x').padStart(7));

for (const tierId of ['offpeak', 'peak']) {
  const bl = api.baseline.tiers.find((t) => t.id === tierId).label;
  console.log(`\n════════ 与官方相比（基准 = 官方${bl}价）════════`);
  console.log('渠道'.padEnd(26) + '币种  输入未命中   输入命中    输出    混合(7:2:1)');
  const rows = [];
  for (const c of api.channels) {
    if (c.available === false) continue;
    rows.push({ c, r: ratios(c, tierId) });
  }
  rows.sort((a, b) => (a.c.isOfficial ? -1 : b.c.isOfficial ? 1 : (a.r?.blended ?? 99) - (b.r?.blended ?? 99)));
  for (const { c, r } of rows) {
    const name = c.displayName.padEnd(26);
    if (!r) { console.log(name + '（积分计价，无法给出倍数）'); continue; }
    const cur = (r.currency === 'cny' ? 'CNY' : 'USD').padEnd(5);
    console.log(name + cur + fmt(r.inputMiss) + '  ' + fmt(r.inputHit) + '  ' + fmt(r.output) + '  ' + fmt(r.blended));
  }
}

console.log('\n\n════════ 设计验证：峰/谷切换只换基准，价格不动 ════════');
console.log('对「固定单价」渠道，两套基准下的倍数之比应恒等于 2.00（空闲价恒为高峰价一半）；');
console.log('对「自身也有峰谷」的渠道，比值恒为 1.00（它的价格跟着基准一起变），这也正是要区分的两类：');
let pass = 0, total = 0;
for (const c of api.channels) {
  if (c.available === false) continue;
  const a = ratios(c, 'offpeak'), b = ratios(c, 'peak');
  if (!a?.blended || !b?.blended) continue;
  total++;
  const k = a.blended / b.blended;
  const expected = c.peakValley ? 1 : 2;
  const ok = Math.abs(k - expected) < 1e-9;
  if (ok) pass++;
  const kind = c.peakValley ? '峰谷型(期望 1.00)' : '固定型(期望 2.00)';
  console.log(`  ${c.displayName.padEnd(26)} ${kind}  谷 ${a.blended.toFixed(2)}x → 峰 ${b.blended.toFixed(2)}x  比值 ${k.toFixed(2)} ${ok ? '✓' : '✗'}`);
}
console.log(`\n  ${pass}/${total} 通过`);

// 反向断言：人民币渠道若误用 usd 字段折算，会得到 <1 的假优势
console.log('\n════════ 回归断言：CNY 渠道误用汇率折算会产生假优势 ════════');
for (const c of api.channels) {
  if (c.priceCurrency !== 'CNY') continue;
  const t = c.tiers[0];
  if (!t.usd || !t.cny) continue;
  const wrong = (t.usd.inputMiss / BASE.offpeak.usd.inputMiss).toFixed(2);
  const right = (t.cny.inputMiss / BASE.offpeak.cny.inputMiss).toFixed(2);
  console.log(`  ${c.displayName.padEnd(26)} 正确(同币种) ${right}x   错误(折汇率) ${wrong}x  ← 若为 ${wrong}x 说明踩了坑`);
}
