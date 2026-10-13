/**
 * 兼容入口：旧脚本调用 sync-nav 时，走公司导航补丁，不再写回四页平铺顶栏。
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [path.join(here, 'patch-nav.mjs')], {
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
