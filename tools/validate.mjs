// tools/validate.mjs — 校验数据层结构完整性与数值约束
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(new URL('.', import.meta.url).pathname.replace(/^\/+/, '').replace(/\//g, '\\'), '..');

async function loadJSON(relPath) {
  const text = await readFile(join(ROOT, relPath), 'utf8');
  return JSON.parse(text);
}

async function validate() {
  console.log('=== [P2 数据校验] 开始执行 ===');
  let errCount = 0;
  const assert = (cond, msg) => {
    if (!cond) {
      console.error(`❌ [FAIL] ${msg}`);
      errCount++;
    } else console.log(`✅ [PASS] ${msg}`);
  };

  const providers = await loadJSON('providers.json');
  const providerCount = Object.keys(providers.providers || {}).length;
  assert(providerCount >= 20, `providers.json 包含 ${providerCount} 家渠道`);

  const model = await loadJSON('models/deepseek-v4.1-flash/model.json');
  assert(model.slug === 'deepseek-v4.1-flash', 'model.json slug 正确');
  assert(model.architecture.totalParametersB === 552, '参数量 552B 正确');
  assert(model.limits.contextTokens === 1000000, '上下文长度 1M 正确');
  assert(model.speed.timeToFirstChunkSeconds === 1.217, '首字延迟 1.217s 正确');
  assert(model.card.radar.axes.length === 6, '雷达图轴数为 6');

  const aa = await loadJSON('models/deepseek-v4.1-flash/benchmarks/aa.json');
  const caps = aa.boards.artificialAnalysis.capabilities;
  const capKeys = Object.keys(caps).filter(k => !k.startsWith('_'));
  assert(capKeys.length === 6, 'AA 能力包含 6 个维度');
  for (const k of capKeys) assert(typeof caps[k] === 'number' && caps[k] >= 0 && caps[k] <= 100, `AA 能力 ${k}: ${caps[k]} 处于 [0, 100]`);
  assert(Math.abs(aa.boards.artificialAnalysis.intelligenceIndex - 39.456) < 0.01, 'AA 智能指数 39.46 正确');

  const lmarena = await loadJSON('models/deepseek-v4.1-flash/benchmarks/lmarena.json');
  assert(lmarena.boards.text.categories.coding.rank === 17, 'LMArena Coding 排名 #17 正确');
  assert(lmarena.boards.text.categories.overall.rank === 37, 'LMArena Overall 排名 #37 正确');

  const api = await loadJSON('models/deepseek-v4.1-flash/channels/api.json');
  assert(api.baseline.tiers.length === 2, '官方 API 包含 peak/offpeak 2 档基准');
  assert(Array.isArray(api.channels) && api.channels.length >= 15, `API 渠道数 ${api.channels.length} 充足`);
  const sub = await loadJSON('models/deepseek-v4.1-flash/channels/subscription.json');
  assert(Array.isArray(sub.plans) && sub.plans.length >= 10, `订阅方案数 ${sub.plans.length} 充足`);
  const obs = await loadJSON('models/deepseek-v4.1-flash/observed/cline-usr-01M3.json');
  assert(obs._meta?.hardRule != null, '实测数据包含隔离 hardRule 声明');
  const sources = await loadJSON('models/deepseek-v4.1-flash/sources.json');
  assert(Array.isArray(sources.sources) && sources.sources.length >= 25, `数据溯源记录 ${sources.sources.length} 条充足`);

  const glm = await loadJSON('models/glm-5.3-flash/model.json');
  assert(glm.slug === 'glm-5.3-flash', 'GLM 页面模型 slug 正确');
  assert(glm.architecture.totalParametersB === 320 && glm.architecture.activeParametersB === 18, 'GLM 参数量 320B / 激活 18B 正确');
  assert(glm.limits.contextTokens === 1000000 && glm.limits.maxOutputTokens === 128000, 'GLM 上下文 1M / 最大输出 128K 正确');
  assert(glm.capabilities.inputModalities.includes('video') && glm.capabilities.inputModalities.includes('file'), 'GLM 原生视频/文件输入已登记');
  const glmAa = await loadJSON('models/glm-5.3-flash/benchmarks/aa.json');
  assert(Math.abs(glmAa.boards.artificialAnalysis.intelligenceIndex - 41.807466113455) < 0.000001, 'GLM AA 智能指数快照正确');
  assert(glmAa.boards.artificialAnalysis.capabilities && Object.keys(glmAa.boards.artificialAnalysis.capabilities).length === 6, 'GLM AA 能力包含 6 个维度');
  const glmArena = await loadJSON('models/glm-5.3-flash/benchmarks/lmarena.json');
  assert(glmArena.boards.text.categories.overall.rank === 30, 'GLM LMArena 总榜排名 #30 正确');
  const glmApi = await loadJSON('models/glm-5.3-flash/channels/api.json');
  assert(glmApi.channels.length >= 1 && glmApi.channels[0].priceCurrency === 'CNY', 'GLM 至少有 1 个官方人民币 API 渠道');
  assert(glmApi.baseline.tiers[0].cny.inputMiss === 0.8 && glmApi.baseline.tiers[0].cny.inputHit === 0.23 && glmApi.baseline.tiers[0].cny.output === 2.8, 'GLM 官方 API ¥0.8 / ¥0.23 / ¥2.8 口径正确');
  const glmSub = await loadJSON('models/glm-5.3-flash/channels/subscription.json');
  assert(glmSub.plans.length === 3 && glmSub.plans.every(p => p.limits?.fiveHourCredits && p.limits?.weeklyCredits), 'GLM Coding Plan 三档积分窗口完整');
  const glmSources = await loadJSON('models/glm-5.3-flash/sources.json');
  assert(glmSources.sources.some(s => s.id === 'glm-official-model') && glmSources.sources.some(s => s.id === 'glm-coding-plan-overview'), 'GLM 官方模型/Coding Plan 来源已登记');

  const domesticSpecs = [
    { slug: 'kimi-k3', label: 'Kimi K3', parameters: 2800, active: 104, context: 1048576, maxOutput: 131072, rank: 23, currency: 'USD', inputMiss: 3, inputHit: 0.3, output: 15, provider: 'moonshot-official' },
    { slug: 'step-5-preview', label: 'Step 5 Preview', parameters: 600, active: 27, context: 1000000, maxOutput: 64000, rank: 56, currency: 'USD', inputMiss: 1, inputHit: 0.1, output: 2.7, provider: 'stepfun-official' },
    { slug: 'mimo-v2.6-pro', label: 'MiMo-V2.6-Pro', parameters: 1020, active: 42, context: 1048576, maxOutput: 131072, rank: 10, currency: 'CNY', inputMiss: 3, inputHit: 0.025, output: 6, provider: 'xiaomi-mimo-official' },
  ];
  for (const spec of domesticSpecs) {
    const dm = await loadJSON(`models/${spec.slug}/model.json`);
    assert(dm.slug === spec.slug, `${spec.label} 模型 slug 正确`);
    assert(dm.architecture.totalParametersB === spec.parameters && dm.architecture.activeParametersB === spec.active, `${spec.label} 参数量 ${spec.parameters}B / 激活 ${spec.active}B 正确`);
    assert(dm.limits.contextTokens === spec.context && dm.limits.maxOutputTokens === spec.maxOutput, `${spec.label} 上下文/最大输出正确`);
    assert(Array.isArray(dm.capabilities.inputModalities) && dm.capabilities.inputModalities.includes('image'), `${spec.label} 多模态输入已登记`);
    const daa = await loadJSON(`models/${spec.slug}/benchmarks/aa.json`);
    const daaBoard = daa.boards.artificialAnalysis;
    assert(typeof daaBoard.intelligenceIndex === 'number' && daaBoard.capabilities && Object.keys(daaBoard.capabilities).length === 6, `${spec.label} AA 指数与六维能力完整`);
    const dla = await loadJSON(`models/${spec.slug}/benchmarks/lmarena.json`);
    assert(dla.boards.text.categories.overall.rank === spec.rank, `${spec.label} LMArena 总榜排名 #${spec.rank} 正确`);
    const da = await loadJSON(`models/${spec.slug}/channels/api.json`);
    assert(da.baseline.tiers[0].cny?.inputMiss === spec.inputMiss || da.baseline.tiers[0].usd?.inputMiss === spec.inputMiss, `${spec.label} 官方 API 未命中价格正确`);
    assert(da.baseline.tiers[0].cny?.inputHit === spec.inputHit || da.baseline.tiers[0].usd?.inputHit === spec.inputHit, `${spec.label} 官方 API 缓存命中价格正确`);
    assert(da.baseline.tiers[0].cny?.output === spec.output || da.baseline.tiers[0].usd?.output === spec.output, `${spec.label} 官方 API 输出价格正确`);
    assert(da.channels.some(ch => ch.isOfficial && ch.providerId === spec.provider), `${spec.label} 官方 API 渠道已登记`);
    const ds = await loadJSON(`models/${spec.slug}/channels/subscription.json`);
    assert(Array.isArray(ds.plans), `${spec.label} 订阅数据结构完整`);
    const dsrc = await loadJSON(`models/${spec.slug}/sources.json`);
    assert(Array.isArray(dsrc.sources) && dsrc.sources.some(s => s.verification === 'official-doc'), `${spec.label} 官方来源已登记`);
  }

  console.log(`\n=== 校验总结: ${errCount === 0 ? '全部通过 (0 错误)' : `${errCount} 项错误`} ===`);
  if (errCount > 0) process.exit(1);
}

validate().catch(e => { console.error('校验脚本抛出异常:', e); process.exit(1); });
