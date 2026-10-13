# tools/fixtures

存放部署校验用的固定测试数据。

| 文件 | 性质 | 作用 |
|---|---|---|
| `pages-hash-vectors.json` | **永久有效** | 5 条固定输入的 Pages manifest 哈希向量。输入是写死的字符串，因此永不失效；`tools/verify-manifest.mjs` 每次运行都会先跑它，BLAKE3 实现一旦被改动或替换立刻失败。这是主要的防回归保护。 |
| `pages-manifest.good.json` | 历史快照 | 2026-10-13 从正常生产部署抓取的真实 manifest，用 BLAKE3 校验命中 16/16。仅作为「正确哈希长什么样」的证据。 |
| `pages-manifest.bad.json` | 历史快照 | 同一份 manifest 的 SHA256 版本，校验命中 0/16。仅作为「错误哈希长什么样」的证据。 |

注意：`good.json` / `bad.json` 绑定的是当时那批页面的内容，**站点内容变化后它们不再匹配**，这是预期的。需要复现现象时用快照方式调用：

```bash
node tools/verify-manifest.mjs tools/fixtures/pages-manifest.good.json   # 期望一致（若内容未变）
node tools/verify-manifest.mjs tools/fixtures/pages-manifest.bad.json    # 期望全部不一致
```

日常校验不要传参数，直接跑 `node tools/verify-manifest.mjs`，它会取当前线上部署来比对。

## 背景

Cloudflare Pages 的部署 manifest 要求哈希为 `blake3(base64(内容) + 扩展名).hex().slice(0, 32)`（与 wrangler 的 `hashFile` 一致，见 `wrangler-dist/cli.js:162742`）。**部署 API 不校验哈希算法**：提交 sha256 仍返回 `deploy:success`，随后边缘整站 HTTP 500。2026-10-13 实际发生过一次，故这里同时保留了两侧证据。
