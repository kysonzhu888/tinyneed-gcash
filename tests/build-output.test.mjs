import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const verificationFilename = "google1089c0cca1aa4f0a.html";

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
