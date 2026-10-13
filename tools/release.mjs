#!/usr/bin/env node
// 一条命令跑完「校验 → 建目录 → 部署 → 推送」，这是日常发版的唯一入口。
//
// 用法：
//   node tools/release.mjs                 校验 + 建目录 + 部署上线（不碰 GitHub）
//   node tools/release.mjs --with-github --repo <owner/repo>
//                                          额外提交并推送到 GitHub
//   node tools/release.mjs --check         只做校验与目录构建，不部署
//
// 设计：任一步失败立即停下，不带着坏数据上线。
// 注意：部署后一定会跑 verify-manifest.mjs。Pages 的 manifest 用错哈希算法（例如
// 误用 sha256）时部署 API 仍返回 success，但整站会 500 —— 这一步就是拦它的。

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const has = (n) => args.includes(n);
const val = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : null;
};

const checkOnly = has('--check');
const withGithub = has('--with-github');
const repo = val('--repo');

// 继承当前环境，但清掉代理变量，避免本机代理干扰 Cloudflare / GitHub 直连
const env = { ...process.env };
delete env.HTTP_PROXY;
delete env.HTTPS_PROXY;
delete env.http_proxy;
delete env.https_proxy;

// 沙箱禁止管道 stdio，故用 inherit 直接透传输出
const step = (title, cmd, cmdArgs) => {
  console.log(`\n===== ${title} =====`);
  execFileSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', env });
};

let failed = null;
try {
  step('1/4 数据校验', 'node', ['tools/validate.mjs']);
  step('2/4 构建目录页', 'node', ['tools/build-index.mjs']);

  if (checkOnly) {
    console.log('\n[check-only] 已跳过部署与推送。');
    process.exit(0);
  }

  step('3/4 部署到 Cloudflare Pages', 'node', ['tools/deploy-pages.mjs', '--deploy']);
  step('4/4 校验线上 manifest', 'node', ['tools/verify-manifest.mjs']);

  if (withGithub) {
    if (!repo) throw new Error('使用 --with-github 时必须提供 --repo <owner/repo>');
    // 有改动先提交，再交给发布脚本推送
    const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (dirty) {
      step('提交改动', 'git', ['add', '-A']);
      execFileSync('git', ['commit', '-m', 'Update comparison site'], { cwd: ROOT, stdio: 'inherit', env });
    }
    step('推送到 GitHub', 'node', ['tools/publish-github.mjs', '--repo', repo, '--push']);
  } else {
    console.log('\n[skip] 未指定 --with-github，跳过 GitHub 推送。');
  }
} catch (err) {
  failed = err;
}

if (failed) {
  console.error(`\n[失败] ${failed.message}`);
  console.error('发布流程已中断，线上仍是上一版可用内容。修好问题后重跑本命令即可。');
  process.exit(1);
}

const siteCount = fs.readdirSync(path.join(ROOT, 'site')).filter((f) => f.endsWith('.html')).length;
console.log(`\n[完成] site/ 共 ${siteCount} 个页面 · https://tokenplan.040215390.xyz`);
