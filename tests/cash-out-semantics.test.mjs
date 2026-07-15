import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const scriptSource = await readFile(new URL("../script.js", import.meta.url), "utf8");
const homeSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const pureLogicSource = scriptSource.split("function readValues()", 1)[0];

function evaluatePure(expression) {
  const context = {
    document: { getElementById: () => ({}) },
    result: null,
  };

  vm.runInNewContext(
    `${pureLogicSource}\nresult = ${expression};`,
    context,
  );

  return context.result;
}

function calculate(type, method, amount, monthlyOtcUsed = 0, customFee = 0, pastSendLimit = false) {
  return evaluatePure(
    `calculateFee(${JSON.stringify(type)}, ${JSON.stringify(method)}, ${amount}, ${monthlyOtcUsed}, ${customFee}, ${pastSendLimit})`,
  );
}

test("cash-out amount means cash received and the fee is added to wallet debit", () => {
  const partnerCashOut = calculate("cashOut", "partner", 1000);
  assert.equal(partnerCashOut.fee, 20);
  assert.equal(partnerCashOut.received, 1000);
  assert.equal(partnerCashOut.totalToPay, 1020);

  const rcbcCashOut = calculate("cashOut", "rcbc", 1000);
  assert.equal(rcbcCashOut.fee, 18);
  assert.equal(rcbcCashOut.received, 1000);
  assert.equal(rcbcCashOut.totalToPay, 1018);

  const gpoCashOut = calculate("gpo", "gpoCashOut", 1000);
  assert.equal(gpoCashOut.fee, 20);
  assert.equal(gpoCashOut.received, 1000);
  assert.equal(gpoCashOut.totalToPay, 1020);
});

test("cash-out fields have explicit labels", () => {
  assert.match(homeSource, /id="amountLabel"/);
  assert.match(homeSource, /id="totalToPayLabel"/);
  assert.match(homeSource, /id="amountReceivedLabel"/);
  assert.deepEqual(
    { ...evaluatePure('getAmountLabels("cashOut", "partner")') },
    {
      amount: "Cash amount to receive",
      totalToPay: "Wallet debit",
      received: "Cash received",
    },
  );
  assert.deepEqual(
    { ...evaluatePure('getAmountLabels("offlineCashIn", "otc")') },
    {
      amount: "Amount",
      totalToPay: "Total to prepare",
      received: "Amount received",
    },
  );
});

test("non-cash-out calculation branches stay unchanged", () => {
  assert.deepEqual(
    { ...calculate("offlineCashIn", "otc", 1000, 7500) },
    {
      fee: 10,
      received: 1000,
      totalToPay: 1010,
      freeLimitLeft: 0,
      label: "Offline cash in",
      status: "Ready",
      insight: "Only ₱500.00 is above your monthly free limit, so the 2% fee applies to that part.",
      success: false,
    },
  );

  const cases = [
    ["offlineCashIn", "otc", 1000, 0, 0, false, { fee: 0, received: 1000, totalToPay: 1000 }],
    ["onlineCashIn", "bpi", 1000, 0, 0, false, { fee: 15, received: 1000, totalToPay: 1015 }],
    ["onlineCashIn", "unionbank", 1000, 0, 0, false, { fee: 5, received: 1000, totalToPay: 1005 }],
    ["onlineCashIn", "otherBank", 1000, 0, 12, false, { fee: 12, received: 1000, totalToPay: 1012 }],
    ["bankTransfer", "bankTransfer", 1000, 0, 0, false, { fee: 10, received: 1000, totalToPay: 1010 }],
    ["sendMoney", "sendMoney", 1000, 0, 0, false, { fee: 0, received: 1000, totalToPay: 1000 }],
    ["sendMoney", "sendMoney", 1000, 0, 0, true, { fee: 5, received: 1000, totalToPay: 1005 }],
    ["paypal", "paypal", 1000, 0, 0, false, { fee: 10, received: 1000, totalToPay: 1010 }],
    ["paypal", "payoneer", 1000, 0, 0, false, { fee: 0, received: 1000, totalToPay: 1000 }],
    ["gpo", "gpoCashIn", 1000, 0, 0, false, { fee: 10, received: 1000, totalToPay: 1010 }],
    ["buyLoad", "globe", 98, 0, 0, false, { fee: 1, received: 98, totalToPay: 99 }],
    ["buyLoad", "globe", 100, 0, 0, false, { fee: 2, received: 100, totalToPay: 102 }],
    ["buyLoad", "smart", 98, 0, 0, false, { fee: 2, received: 98, totalToPay: 100 }],
    ["buyLoad", "smart", 100, 0, 0, false, { fee: 3, received: 100, totalToPay: 103 }],
    ["buyLoad", "dito", 1000, 0, 0, false, { fee: 0, received: 1000, totalToPay: 1000 }],
  ];

  for (const [type, method, amount, monthlyOtcUsed, customFee, pastSendLimit, expected] of cases) {
    const result = calculate(type, method, amount, monthlyOtcUsed, customFee, pastSendLimit);
    assert.deepEqual(
      { fee: result.fee, received: result.received, totalToPay: result.totalToPay },
      expected,
      `${type}/${method}`,
    );
  }
});
