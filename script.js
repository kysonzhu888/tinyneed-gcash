const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const numberFields = ["amount", "monthlyOtcUsed", "customFee"];
const BANK_TRANSFER_FEE_PHP = 10;

const methodOptions = {
  offlineCashIn: [
    { value: "otc", label: "Over-the-counter partner" }
  ],
  onlineCashIn: [
    { value: "bpi", label: "BPI linked bank" },
    { value: "unionbank", label: "UnionBank linked bank" },
    { value: "otherBank", label: "Other bank estimate" }
  ],
  cashOut: [
    { value: "rcbc", label: "RCBC Scan to Withdraw" },
    { value: "partner", label: "Other cash-out partner" }
  ],
  bankTransfer: [
    { value: "bankTransfer", label: "Bank transfer" }
  ],
  sendMoney: [
    { value: "sendMoney", label: "GCash to GCash" }
  ],
  paypal: [
    { value: "paypal", label: "PayPal cash in" },
    { value: "payoneer", label: "Payoneer cash in" }
  ],
  gpo: [
    { value: "gpoCashIn", label: "GPO pa-cash in" },
    { value: "gpoCashOut", label: "GPO pa-cash out" }
  ],
  buyLoad: [
    { value: "globe", label: "Globe load" },
    { value: "smart", label: "Smart load" },
    { value: "dito", label: "DITO load" }
  ]
};

const elements = Object.fromEntries(
  [
    "transactionType",
    "method",
    "amount",
    "monthlyOtcUsed",
    "customFee",
    "pastSendLimit",
    "otcUsedField",
    "customFeeField",
    "sendLimitField",
    "feeAmount",
    "totalToPay",
    "amountReceived",
    "freeLimitLeft",
    "effectiveRate",
    "statusPill",
    "insightBox",
    "copySummary",
    "shareLink",
    "resetButton",
    "refreshCompare",
    "compareGrid",
    "heroPreviewFee"
  ].map((id) => [id, document.getElementById(id)])
);

function parseMoney(value) {
  return Number(String(value || "").replace(/[^\d.]/g, "")) || 0;
}

function formatPercent(value) {
  return `${value.toLocaleString("en-PH", { maximumFractionDigits: 2 })}%`;
}

function normalizeMoneyInput(event) {
  const input = event.currentTarget;
  const value = parseMoney(input.value);
  input.value = value ? value.toLocaleString("en-PH", { maximumFractionDigits: 2 }) : "";
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getLoadFee(method, amount) {
  if (method === "globe") return amount < 99 ? 1 : 2;
  if (method === "smart") return amount < 99 ? 2 : 3;
  return 0;
}

function calculateFee(type, method, amount, monthlyOtcUsed, customFee, pastSendLimit) {
  const result = {
    fee: 0,
    received: amount,
    totalToPay: amount,
    freeLimitLeft: null,
    label: "",
    status: "Ready",
    insight: "Check the estimated fee before you continue in the GCash app.",
    success: false
  };

  if (amount <= 0) {
    result.status = "Enter amount";
    result.insight = "Enter an amount to calculate the estimated fee.";
    result.success = true;
    return result;
  }

  if (type === "offlineCashIn") {
    const monthlyLimit = 8000;
    const freeLeftBefore = Math.max(0, monthlyLimit - monthlyOtcUsed);
    const chargedAmount = Math.max(0, amount - freeLeftBefore);
    result.fee = chargedAmount * 0.02;
    result.totalToPay = amount + result.fee;
    result.freeLimitLeft = Math.max(0, freeLeftBefore - amount);
    result.label = "Offline cash in";
    result.insight = chargedAmount > 0
      ? `Only ${peso.format(chargedAmount)} is above your monthly free limit, so the 2% fee applies to that part.`
      : `This cash-in is still within your monthly ${peso.format(monthlyLimit)} free OTC limit.`;
    result.success = chargedAmount === 0;
  }

  if (type === "onlineCashIn") {
    const fees = {
      bpi: 15,
      unionbank: 5,
      otherBank: customFee
    };
    result.fee = fees[method] ?? customFee;
    result.totalToPay = amount + result.fee;
    result.label = "Online cash in";
    result.insight = method === "otherBank"
      ? "Other bank fees vary. Adjust the custom bank fee to match the bank shown in your GCash app."
      : "This is the listed linked-bank cash-in handling fee for the selected method.";
  }

  if (type === "cashOut") {
    result.fee = method === "rcbc" ? 18 : amount * 0.02;
    result.received = amount - result.fee;
    result.label = "Cash out";
    result.insight = method === "rcbc"
      ? "RCBC Scan to Withdraw is listed as a fixed PHP 18 per transaction."
      : "Other cash-out partners are estimated at 2% of the transaction amount.";
  }

  if (type === "bankTransfer") {
    result.fee = BANK_TRANSFER_FEE_PHP;
    result.totalToPay = amount + result.fee;
    result.label = "Bank transfer";
    result.insight = `GCash lists PHP ${BANK_TRANSFER_FEE_PHP} per bank transfer, effective July 4, 2026. The listed max is PHP 50,000 per transaction.`;
  }

  if (type === "sendMoney") {
    result.fee = pastSendLimit ? 5 : 0;
    result.totalToPay = amount + result.fee;
    result.label = "Send money";
    result.insight = pastSendLimit
      ? "After the monthly free limit, select power users may be charged PHP 5."
      : "GCash lists no fee for the first 500 sends and receives per month.";
    result.success = result.fee === 0;
  }

  if (type === "paypal") {
    result.fee = method === "paypal" ? amount * 0.01 : 0;
    result.totalToPay = amount + result.fee;
    result.label = method === "paypal" ? "PayPal cash in" : "Payoneer cash in";
    result.insight = method === "paypal"
      ? "PayPal cash in is calculated at 1% of the cash-in amount."
      : "Payoneer cash in is listed as free.";
    result.success = result.fee === 0;
  }

  if (type === "gpo") {
    result.fee = method === "gpoCashIn" ? amount * 0.01 : amount * 0.02;
    result.totalToPay = method === "gpoCashIn" ? amount + result.fee : amount;
    result.received = method === "gpoCashOut" ? amount - result.fee : amount;
    result.label = method === "gpoCashIn" ? "GPO pa-cash in" : "GPO pa-cash out";
    result.insight = method === "gpoCashIn"
      ? "GCash lists GPO pa-cash in at 1% of the transaction amount."
      : "GCash lists GPO pa-cash out at 2% of the transaction amount.";
  }

  if (type === "buyLoad") {
    result.fee = getLoadFee(method, amount);
    result.totalToPay = amount + result.fee;
    result.label = "Buy load";
    result.insight = method === "dito"
      ? "DITO load is listed as free."
      : "Globe and Smart load fees depend on whether the load amount is below PHP 99.";
    result.success = result.fee === 0;
  }

  result.fee = roundMoney(result.fee);
  result.received = roundMoney(result.received);
  result.totalToPay = roundMoney(result.totalToPay);
  if (result.freeLimitLeft !== null) result.freeLimitLeft = roundMoney(result.freeLimitLeft);
  return result;
}

function readValues() {
  return {
    type: elements.transactionType.value,
    method: elements.method.value,
    amount: parseMoney(elements.amount.value),
    monthlyOtcUsed: parseMoney(elements.monthlyOtcUsed.value),
    customFee: parseMoney(elements.customFee.value),
    pastSendLimit: elements.pastSendLimit.checked
  };
}

function updateMethodOptions() {
  const type = elements.transactionType.value;
  const options = methodOptions[type] || [];
  elements.method.innerHTML = options.map((option) => {
    return `<option value="${option.value}">${option.label}</option>`;
  }).join("");
  updateConditionalFields();
}

function updateConditionalFields() {
  const type = elements.transactionType.value;
  const method = elements.method.value;
  elements.otcUsedField.style.display = type === "offlineCashIn" ? "grid" : "none";
  elements.customFeeField.style.display = type === "onlineCashIn" && method === "otherBank" ? "grid" : "none";
  elements.sendLimitField.style.display = type === "sendMoney" ? "flex" : "none";
}

function updateResults() {
  updateConditionalFields();
  const values = readValues();
  const result = calculateFee(
    values.type,
    values.method,
    values.amount,
    values.monthlyOtcUsed,
    values.customFee,
    values.pastSendLimit
  );

  const effectiveRate = values.amount > 0 ? (result.fee / values.amount) * 100 : 0;
  elements.feeAmount.textContent = peso.format(result.fee);
  elements.totalToPay.textContent = peso.format(result.totalToPay);
  elements.amountReceived.textContent = peso.format(result.received);
  elements.freeLimitLeft.textContent = result.freeLimitLeft === null ? "Not applicable" : peso.format(result.freeLimitLeft);
  elements.effectiveRate.textContent = formatPercent(effectiveRate);
  elements.statusPill.textContent = result.success ? "Low fee" : result.status;
  elements.statusPill.classList.toggle("warning", !result.success && result.fee > 0);
  elements.insightBox.textContent = result.insight;
  elements.insightBox.classList.toggle("success", result.success);
  elements.heroPreviewFee.textContent = peso.format(result.fee);

  const summary = buildSummary(values, result);
  elements.shareLink.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://gcash.tinyneed.com/")}`;
  elements.shareLink.setAttribute("aria-label", summary);
  renderComparison(values.amount, values.monthlyOtcUsed, values.customFee, values.pastSendLimit);
}

function buildSummary(values, result) {
  return [
    "GCash Fee Calculator - TinyNeed",
    `${result.label}: ${peso.format(values.amount)}`,
    `Estimated fee: ${peso.format(result.fee)}`,
    `Total to prepare: ${peso.format(result.totalToPay)}`,
    "https://gcash.tinyneed.com/"
  ].join("\n");
}

function renderComparison(amount, monthlyOtcUsed, customFee, pastSendLimit) {
  const comparisons = [
    ["offlineCashIn", "otc", "OTC cash in"],
    ["onlineCashIn", "bpi", "BPI cash in"],
    ["onlineCashIn", "unionbank", "UnionBank cash in"],
    ["bankTransfer", "bankTransfer", "Bank transfer"],
    ["paypal", "paypal", "PayPal cash in"],
    ["sendMoney", "sendMoney", "GCash to GCash"]
  ].map(([type, method, label]) => {
    const result = calculateFee(type, method, amount, monthlyOtcUsed, customFee, pastSendLimit);
    return { label, result };
  });

  comparisons.sort((a, b) => a.result.fee - b.result.fee);

  elements.compareGrid.innerHTML = comparisons.map(({ label, result }) => `
    <article class="compare-card">
      <strong>${label}</strong>
      <span>${result.insight}</span>
      <strong class="fee">${peso.format(result.fee)}</strong>
    </article>
  `).join("");
}

async function copySummary() {
  const values = readValues();
  const result = calculateFee(
    values.type,
    values.method,
    values.amount,
    values.monthlyOtcUsed,
    values.customFee,
    values.pastSendLimit
  );
  await navigator.clipboard.writeText(buildSummary(values, result));
  elements.copySummary.textContent = "Copied";
  window.setTimeout(() => {
    elements.copySummary.textContent = "Copy summary";
  }, 1300);
}

function resetForm() {
  elements.transactionType.value = "offlineCashIn";
  updateMethodOptions();
  elements.amount.value = "10000";
  elements.monthlyOtcUsed.value = "6000";
  elements.customFee.value = "15";
  elements.pastSendLimit.checked = false;
  numberFields.forEach((id) => normalizeMoneyInput({ currentTarget: elements[id] }));
  updateResults();
}

numberFields.forEach((id) => {
  normalizeMoneyInput({ currentTarget: elements[id] });
  elements[id].addEventListener("input", updateResults);
  elements[id].addEventListener("blur", normalizeMoneyInput);
});

elements.transactionType.addEventListener("change", () => {
  updateMethodOptions();
  updateResults();
});
elements.method.addEventListener("change", updateResults);
elements.pastSendLimit.addEventListener("change", updateResults);
elements.copySummary.addEventListener("click", copySummary);
elements.resetButton.addEventListener("click", resetForm);
elements.refreshCompare.addEventListener("click", updateResults);

updateMethodOptions();
updateResults();

initCommentSections(document);

function initCommentSections(root) {
  root.querySelectorAll("[data-comment-section]").forEach((section) => {
    if (section.dataset.commentsInitialized === "true") return;
    section.dataset.commentsInitialized = "true";

    const pageSlug = section.dataset.pageSlug || "home";
    const form = section.querySelector("[data-comment-form]");
    const list = section.querySelector("[data-comment-list]");
    const status = section.querySelector("[data-comment-status]");
    const count = section.querySelector("[data-comment-count]");
    const submit = section.querySelector("[data-comment-submit]");

    if (!form || !list) return;

    const setStatus = (message, tone = "") => {
      if (!status) return;
      status.textContent = message;
      status.dataset.tone = tone;
    };

    const setLoading = (isLoading) => {
      if (!submit) return;
      submit.disabled = isLoading;
      submit.textContent = isLoading ? "Posting..." : "Post";
    };

    const fetchComments = async () => {
      const response = await fetch(`/api/comments?pageSlug=${encodeURIComponent(pageSlug)}`, {
        headers: { Accept: "application/json" },
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(payload.error || "Could not load comments.");
      }
      return Array.isArray(payload.comments) ? payload.comments : [];
    };

    const postComment = async (name, comment, website) => {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageSlug, name, comment, website }),
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(payload.error || "Could not post comment.");
      }
      return Array.isArray(payload.comments) ? payload.comments : [];
    };

    const render = (comments) => {
      list.replaceChildren();
      if (count) {
        count.textContent = comments.length === 1 ? "1 comment" : `${comments.length} comments`;
      }

      if (!comments.length) {
        const empty = document.createElement("p");
        empty.className = "comment-empty";
        empty.textContent = "No comments yet. Add the first note.";
        list.append(empty);
        return;
      }

      comments.forEach((comment) => {
        const item = document.createElement("article");
        item.className = "comment-item";

        const meta = document.createElement("div");
        meta.className = "comment-meta";

        const name = document.createElement("strong");
        name.textContent = comment.name || "Reader";

        const time = document.createElement("time");
        time.dateTime = comment.createdAt || "";
        time.textContent = formatCommentDate(comment.createdAt);

        const text = document.createElement("p");
        text.textContent = comment.body || "";

        meta.append(name, time);
        item.append(meta, text);
        list.append(item);
      });
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const name = String(data.get("name") || "Reader").trim().slice(0, 40) || "Reader";
      const text = String(data.get("comment") || "").trim().slice(0, 600);
      // 蜜罐字段：正常用户看不到，永远为空；转发给后端由服务端判定。
      const website = String(data.get("website") || "");
      if (!text) {
        setStatus("Write a comment before posting.", "error");
        return;
      }

      setLoading(true);
      setStatus("Posting...");
      postComment(name, text, website)
        .then((comments) => {
          form.reset();
          render(comments);
          setStatus("Posted. Thanks for the note.", "success");
        })
        .catch((error) => {
          setStatus(error.message || "Could not post comment.", "error");
        })
        .finally(() => {
          setLoading(false);
        });
    });

    fetchComments()
      .then((comments) => {
        render(comments);
        setStatus("");
      })
      .catch((error) => {
        render([]);
        setStatus(error.message || "Comments are temporarily unavailable.", "error");
      });
  });
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("The comment API is unavailable on this server.");
  }
  return response.json();
}

function formatCommentDate(value) {
  try {
    return value ? new Date(value).toLocaleDateString() : "";
  } catch {
    return "";
  }
}
