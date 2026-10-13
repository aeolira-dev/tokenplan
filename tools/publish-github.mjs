#!/usr/bin/env node
// 把当前仓库推送到 GitHub，并给出 Pages 侧的最短后续动作。
//
// 用法：
//   node tools/publish-github.mjs --repo <owner/repo>              体检 + 打印将执行的命令（默认 dry-run）
//   node tools/publish-github.mjs --repo <owner/repo> --push       真正推送（SSH 优先）
//   node tools/publish-github.mjs --show-key                       只打印工作区部署公钥，便于加到 GitHub
//   node tools/publish-github.mjs --repo <o/r> --push --https      强制走 HTTPS + GITHUB_TOKEN
//
// 为什么默认 SSH：
//   本机 .NET/schannel TLS 栈异常（连 www.baidu.com 都报「接收时发生错误」），
//   导致 Git Credential Manager、gh CLI 等基于 .NET 的授权流程全部不可用；
//   而 OpenSSH 与 Node 的网络都正常，所以用 SSH 密钥是最稳的方式。
//   密钥位于 .ssh/id_ed25519_github（已在 .gitignore 中排除），无口令、无有效期。
//
// 说明：脚本从不打印 token 或私钥内容。

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const KEY_DIR = path.join(ROOT, '.ssh');
const KEY = path.join(KEY_DIR, 'id_ed25519_github');
const PUB = path.join(KEY_DIR, 'github-deploy-key.pub');
const KNOWN_HOSTS = path.join(KEY_DIR, 'known_hosts');

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const value = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : null;
};

const repo = value('--repo');
const doPush = flag('--push');
const forceHttps = flag('--https');
const showKey = flag('--show-key');
const branch = value('--branch') || 'main';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;

// ---- 通用执行：本机沙箱禁止子进程管道，需要捕获输出时改用临时文件 ----
function run(cmd, cmdArgs, { inherit = false, env = {} } = {}) {
  if (inherit) return execFileSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tokenplan-')), 'out.txt');
  const fd = fs.openSync(tmp, 'w');
  try {
    execFileSync(cmd, cmdArgs, { cwd: ROOT, stdio: ['ignore', fd, 'inherit'], env: { ...process.env, ...env } });
    return { code: 0, out: fs.readFileSync(tmp, 'utf8').trim() };
  } catch (err) {
    return { code: err.status ?? 1, out: fs.existsSync(tmp) ? fs.readFileSync(tmp, 'utf8').trim() : '' };
  } finally {
    fs.closeSync(fd);
    fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  }
}

const git = (a, o) => run('git', a, o);

function sshEnv() {
  return {
    GIT_SSH_COMMAND: `ssh -i "${KEY}" -o IdentitiesOnly=yes -o UserKnownHostsFile="${KNOWN_HOSTS}" -o StrictHostKeyChecking=accept-new -o BatchMode=yes`,
  };
}

// ---- 公钥展示 ----
function readPublicKey() {
  if (fs.existsSync(PUB)) return fs.readFileSync(PUB, 'utf8').trim();
  if (!fs.existsSync(KEY)) return null;
  const out = run('ssh-keygen', ['-y', '-f', KEY]);
  if (!/^ssh-/.test(out.out)) return null;
  return out.out.trim();
}

if (showKey) {
  const pub = readPublicKey();
  if (!pub) {
    console.error('[key] 未找到部署密钥。请先执行：ssh-keygen -t ed25519 -f .ssh/id_ed25519_github -N ""');
    process.exit(1);
  }
  console.log(pub);
  process.exit(0);
}

if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
  console.error('用法：node tools/publish-github.mjs --repo <owner/repo> [--push] [--https] [--branch main]');
  console.error('      node tools/publish-github.mjs --show-key');
  process.exit(2);
}

// ---- 本地状态 ----
const info = {
  head: git(['rev-parse', 'HEAD']).out,
  branch: git(['rev-parse', '--abbrev-ref', 'HEAD']).out,
  commits: git(['rev-list', '--count', 'HEAD']).out,
  tracked: git(['ls-files']).out.split('\n').filter(Boolean).length,
  remotes: git(['remote']).out.split('\n').filter(Boolean),
  status: git(['status', '--porcelain']).out,
  sslBackend: git(['config', '--get', 'http.sslBackend']).out || '(未设置)',
};
console.log('[local]', JSON.stringify(info, null, 2));
if (info.status) console.log('[warn] 工作区有未提交改动，推送只包含已提交内容。');

// ---- 凭据体检 ----
const pub = readPublicKey();
const sshUrl = `git@github.com:${repo}.git`;
const httpsUrl = `https://github.com/${repo}.git`;

console.log(`[key] ${pub ? '部署公钥已就绪（.ssh/github-deploy-key.pub）' : '缺少部署密钥'}`);
if (pub) console.log(`      ${pub}`);

let sshAuth = null;
if (pub && !forceHttps) {
  const t = run('ssh', ['-i', KEY, '-o', 'IdentitiesOnly=yes', '-o', `UserKnownHostsFile=${KNOWN_HOSTS}`, '-o', 'StrictHostKeyChecking=accept-new', '-o', 'BatchMode=yes', '-T', 'git@github.com']);
  // 认证成功时 GitHub 返回 "Hi <user>! You've successfully authenticated"，退出码仍为 1，故按文本判断
  const m = t.out.match(/Hi ([^!]+)! You've successfully authenticated/);
  sshAuth = m ? m[1] : null;
  console.log(`[ssh] ${sshAuth ? `已通过 GitHub 认证：${sshAuth}` : '尚未认证' + (t.out ? `（${t.out.split('\n')[0]}）` : '')}`);
}

// 远程仓库是否存在（ls-remote 会自行返回 128 表示不存在或无权限）
let remoteExists = null;
if (sshAuth) {
  const ls = run('git', ['ls-remote', '--heads', sshUrl], sshEnv());
  remoteExists = ls.code === 0;
  console.log(`[remote] ${repo} 通过 SSH 可达=${remoteExists}`);
}

if (!sshAuth && !token) {
  console.log('');
  console.log('=== 需要你做一次授权（之后永久生效）===');
  console.log('1) 打开 https://github.com/settings/ssh/new');
  console.log('2) Title 随意填（如 tokenplan-laptop），Key type 选 Authentication Key');
  console.log('3) Key 粘贴下面这一整行，然后点 Add SSH key：');
  console.log('');
  console.log(pub || '（缺少密钥，请先运行 ssh-keygen 生成）');
  console.log('');
  console.log(`4) 在 GitHub 新建一个空仓库 ${repo}（不要勾选 README / .gitignore / License）`);
  console.log('5) 回来执行：');
  console.log(`   node tools/publish-github.mjs --repo ${repo} --push`);
  console.log('');
  console.log('备注：如果更想用令牌方式，可设 GITHUB_TOKEN 环境变量后加 --https 运行该脚本。');
  process.exit(1);
}

// ---- 推送 ----
const useHttps = forceHttps || !sshAuth;
const url = useHttps ? httpsUrl : sshUrl;
console.log(`[plan] 方式=${useHttps ? 'HTTPS+token' : 'SSH'} · git push ${url} HEAD:refs/heads/${branch}`);

if (!doPush) {
  console.log('[dry-run] 未推送。加 --push 执行。');
  process.exit(0);
}

if (useHttps && token) {
  // 用一次性 header 避免把令牌写进 .git/config
  const b64 = Buffer.from(`x-access-token:${token}`).toString('base64');
  const res = git(['-c', `http.extraheader=Authorization: Basic ${b64}`, 'push', url, `HEAD:refs/heads/${branch}`], { inherit: true });
  console.log('[push] 完成');
} else {
  if (!info.remotes.includes('origin')) {
    git(['remote', 'add', 'origin', url]);
    console.log('[remote] 已添加 origin ->', url);
  } else {
    git(['remote', 'set-url', 'origin', url]);
    console.log('[remote] 已更新 origin ->', url);
  }
  // 让本仓库永久使用工作区密钥，无需改动用户的全局 SSH 配置
  git(['config', 'core.sshCommand', `ssh -i "${KEY}" -o IdentitiesOnly=yes -o UserKnownHostsFile="${KNOWN_HOSTS}" -o StrictHostKeyChecking=accept-new`]);
  console.log('[config] 已为本仓库设置 core.sshCommand（不改动全局 ~/.ssh/config）');
  const res = git(['push', 'origin', `HEAD:refs/heads/${branch}`], { inherit: true });
  console.log('[push] 完成');
}

console.log('[next] Cloudflare Pages 若绑定本仓库，推送会自动触发构建；否则执行：');
console.log('       node tools/deploy-pages.mjs --deploy');
