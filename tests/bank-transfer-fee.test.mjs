import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const scriptSource = await readFile(new URL("../script.js", import.meta.url), "utf8");
const homeSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const notFoundSource = await readFile(new URL("../404.html", import.meta.url), "utf8");
const pureLogicSource = scriptSource.split("function readValues()", 1)[0];
function calculateBankTransfer(amount) {
  const context = {
    document: { getElementById: () => ({}) },
    result: null,
  };

  vm.runInNewContext(
    `${pureLogicSource}\nresult = calculateFee("bankTransfer", "bankTransfer", ${amount}, 0, 0, false);`,
    context,
  );

  return context.result;
}

const exactLimit = calculateBankTransfer(50000);
assert.equal(exactLimit.fee, 10);
assert.equal(exactLimit.totalToPay, 50010);

const overLimit = calculateBankTransfer(50000.01);
assert.equal(overLimit.fee, 20);
assert.equal(overLimit.totalToPay, 50020.01);

const sixtyThousand = calculateBankTransfer(60000);
assert.equal(sixtyThousand.fee, 20);
assert.equal(sixtyThousand.totalToPay, 60020);

assert.match(exactLimit.insight, /requires 1 transfer/);
assert.match(exactLimit.insight, /PHP 50,000 per transaction/);
assert.match(overLimit.insight, /requires 2 transfers/);
assert.match(homeSource, /Fee rules last checked: July 13, 2026/);
assert.match(notFoundSource, /<meta name="robots" content="noindex,follow">/);
assert.match(notFoundSource, /Page not found/);

console.log("bank transfer fee regression passed");
