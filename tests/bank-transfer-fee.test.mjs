import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const scriptSource = await readFile(new URL("../script.js", import.meta.url), "utf8");
const homeSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const pureLogicSource = scriptSource.split("function readValues()", 1)[0];
const context = {
  document: { getElementById: () => ({}) },
  result: null,
};

vm.runInNewContext(
  `${pureLogicSource}\nresult = calculateFee("bankTransfer", "bankTransfer", 10000, 0, 0, false);`,
  context,
);

assert.equal(context.result.fee, 10);
assert.equal(context.result.totalToPay, 10010);
assert.match(context.result.insight, /PHP 10 per bank transfer/);
assert.match(homeSource, /Fee rules last checked: July 13, 2026/);

console.log("bank transfer fee regression passed");
