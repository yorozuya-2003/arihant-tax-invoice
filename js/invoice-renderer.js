let templateHtml = null;

async function loadTemplate() {
  if (templateHtml) return templateHtml;
  const response = await fetch("invoice-template.html");
  if (!response.ok) throw new Error("Could not load invoice template.");
  templateHtml = await response.text();
  return templateHtml;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setText(doc, field, value) {
  doc.querySelectorAll(`[data-field="${field}"]`).forEach((el) => {
    el.textContent = value ?? "";
  });
}

function setAmountFields(doc, prefix, amount) {
  const { rs, p } = splitRsPaise(amount);
  setText(doc, `${prefix}Rs`, rs);
  setText(doc, `${prefix}P`, p);
}

function calculateTotals(items, data) {
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const rate = Number(data.taxRate) || 0;
  const otherCharge = Number(data.otherCharge) || 0;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (data.taxType === "cgst_sgst") {
    cgst = (subtotal * rate) / 100;
    sgst = (subtotal * rate) / 100;
  } else if (data.taxType === "igst") {
    igst = (subtotal * rate) / 100;
  }

  const grandTotal = subtotal + cgst + sgst + igst + otherCharge;

  return { subtotal, cgst, sgst, igst, otherCharge, grandTotal };
}

function createItemRow(doc, item, index, itemCount) {
  const amount = item.qty * item.rate;
  const { rs, p } = splitRsPaise(amount);
  const tr = doc.createElement("tr");
  tr.className = itemCount <= 2 ? "items items--sparse" : "items";
  tr.innerHTML = `
    <td class="center">${index + 1}</td>
    <td colspan="4">${escapeHtml(item.description)}</td>
    <td class="center">${escapeHtml(item.hsn || "")}</td>
    <td class="right">${formatAmount(item.qty)}</td>
    <td class="right">${formatAmount(item.rate)}</td>
    <td class="amount-col">${rs}</td>
    <td class="amount-col">${p}</td>
  `;
  return tr;
}

function buildInvoiceFilename(data) {
  const invoiceNo = String(data.invoiceNo).trim();
  const customer = String(data.partyName).trim().replace(/\s+/g, "_");
  return `${invoiceNo}-${customer}`;
}

function populateInvoice(doc, data) {
  const items = data.items.filter((item) => item.description && item.qty > 0);
  const totals = calculateTotals(items, data);
  const rate = Number(data.taxRate) || 0;

  const textFields = [
    "partyName", "invoiceNo", "date", "vehicleNo", "containerNo",
    "partyGstin", "grNo", "state", "stateCode", "transportName",
    "ewayBillNo", "shipTo",
  ];
  textFields.forEach((field) => setText(doc, field, data[field] || ""));

  const addressEl = doc.querySelector('[data-field="partyAddress"]');
  if (addressEl) {
    addressEl.textContent = data.partyAddress || "";
    addressEl.style.display = data.partyAddress ? "block" : "none";
  }

  const itemsBody = doc.getElementById("items-body");
  itemsBody.replaceChildren();
  items.forEach((item, index) => {
    itemsBody.appendChild(createItemRow(doc, item, index, items.length));
  });

  setAmountFields(doc, "subtotal", totals.subtotal);
  setAmountFields(doc, "otherCharge", totals.otherCharge);
  setAmountFields(doc, "grandTotal", totals.grandTotal);
  setText(doc, "amountWords", amountToWords(totals.grandTotal));

  const showCgstSgst = data.taxType === "cgst_sgst";
  const showIgst = data.taxType === "igst";

  setText(doc, "cgstRate", showCgstSgst ? rate : "—");
  setText(doc, "sgstRate", showCgstSgst ? rate : "—");
  setText(doc, "igstRate", showIgst ? rate : "—");
  setAmountFields(doc, "cgst", showCgstSgst ? totals.cgst : 0);
  setAmountFields(doc, "sgst", showCgstSgst ? totals.sgst : 0);
  setAmountFields(doc, "igst", showIgst ? totals.igst : 0);

  doc.querySelectorAll("[data-tax-row]").forEach((row) => {
    const type = row.getAttribute("data-tax-row");
    const active = (type === "igst" && showIgst) || (type !== "igst" && showCgstSgst);
    row.classList.toggle("tax-inactive", !active);
  });

  const base = document.baseURI.replace(/[^/]+$/, "");
  const logo = doc.querySelector(".header-logo");
  if (logo && !logo.src.startsWith("http")) {
    logo.src = new URL("assets/terapanth.jpg", base).href;
  }

  doc.title = buildInvoiceFilename(data);
}

function buildPrintableHtml(doc, filename) {
  const base = document.baseURI.replace(/[^/]+$/, "");
  const safeTitle = escapeHtml(filename);
  let html = "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  if (!html.includes("<base ")) {
    html = html.replace("<head>", `<head><base href="${base}">`);
  }
  return html;
}

function printHtml(html, filename) {
  return new Promise((resolve, reject) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      reject(new Error("POPUP_BLOCKED"));
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = filename;

    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
      resolve();
    };

    if (printWindow.document.fonts?.ready) {
      printWindow.document.fonts.ready.then(triggerPrint).catch(triggerPrint);
    } else {
      printWindow.onload = () => setTimeout(triggerPrint, 300);
      setTimeout(triggerPrint, 800);
    }
  });
}

async function generateInvoicePdf(data) {
  const raw = await loadTemplate();
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/html");
  const filename = buildInvoiceFilename(data);
  populateInvoice(doc, data);
  const html = buildPrintableHtml(doc, filename);
  await printHtml(html, filename);
}
