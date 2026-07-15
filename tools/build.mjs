import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const deploy = new URL("../.deploy/", import.meta.url);

// 🚨 allowlist 是安全边界：wrangler.toml / schema.sql / site.config.json / tools
//    绝不能进 .deploy（会被 Cloudflare Pages 当静态文件公开）。
//    functions/ 必须包含——Cloudflare 会把它编译成 Pages Functions（API），漏了会抹掉线上接口。
const include = [
  "index.html",
  "404.html",
  "styles.css",
  "script.js",
  "robots.txt",
  "sitemap.xml",
  "ads.txt",
  "google1089c0cca1aa4f0a.html",
  "about",
  "contact",
  "privacy",
  "assets",
  "functions"
];

await rm(deploy, { recursive: true, force: true });
await mkdir(deploy, { recursive: true });

for (const item of include) {
  const from = new URL(item, root);
  if (!existsSync(from)) continue;
  const to = new URL(item, deploy);
  await cp(from, to, { recursive: true });
}

console.log("Built .deploy");
