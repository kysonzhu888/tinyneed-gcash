import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const verificationFilename = "google1089c0cca1aa4f0a.html";

function listHtmlDocuments(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listHtmlDocuments(entryPath);
    if (!entry.name.endsWith(".html")) return [];

    const contents = fs.readFileSync(entryPath, "utf8");
    return /<\/html>/i.test(contents) ? [entryPath] : [];
  });
}

test("build copies the Google verification file into .deploy", () => {
  const build = spawnSync(process.execPath, ["tools/build.mjs"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(build.status, 0, build.stderr || build.stdout);
  assert.equal(
    fs.readFileSync(path.join(root, ".deploy", verificationFilename), "utf8"),
    fs.readFileSync(path.join(root, verificationFilename), "utf8"),
  );
});

test("injects Cloudflare Web Analytics exactly once into every HTML document", () => {
  const build = spawnSync(process.execPath, ["tools/build.mjs"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(build.status, 0, build.stderr || build.stdout);
  const htmlDocuments = listHtmlDocuments(path.join(root, ".deploy"));
  assert.ok(htmlDocuments.length > 0);

  for (const htmlPath of htmlDocuments) {
    const contents = fs.readFileSync(htmlPath, "utf8");
    const beacons = contents.match(/static\.cloudflareinsights\.com\/beacon\.min\.js/g) ?? [];
    assert.equal(beacons.length, 1, path.relative(root, htmlPath));
    assert.match(contents, /data-cf-beacon='\{"token":"[a-f0-9]{32}"\}'/, path.relative(root, htmlPath));
  }
});
