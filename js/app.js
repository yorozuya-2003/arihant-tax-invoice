const itemsContainer = document.getElementById("items-container");
const addItemBtn = document.getElementById("add-item-btn");
const form = document.getElementById("invoice-form");
const formError = document.getElementById("form-error");
const submitBtn = document.getElementById("submit-btn");
const dateInput = document.getElementById("date");

let itemCount = 0;

function todayIso() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function formatDisplayDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function showError(message) {
  formError.textContent = message;
  formError.classList.add("visible");
}

function clearError() {
  formError.textContent = "";
  formError.classList.remove("visible");
}

function createItemCard() {
  itemCount += 1;
  const card = document.createElement("div");
  card.className = "item-card";
  card.dataset.itemId = String(itemCount);
  card.innerHTML = `
    <div class="item-card-header">
      <span class="item-card-title">Item ${itemCount}</span>
      <span class="item-card-amount item-amount-value">₹0.00</span>
    </div>
    <div class="field">
      <label>Description</label>
      <input type="text" class="item-description" required>
    </div>
    <div class="field-row">
      <div class="field">
        <label>HSN code</label>
        <input type="text" class="item-hsn">
      </div>
      <div class="field">
        <label>Quantity</label>
        <input type="number" class="item-qty" min="0" step="0.01" value="1" inputmode="decimal" required>
      </div>
    </div>
    <div class="field item-rate-row">
      <div class="field">
        <label>Rate (₹ per unit)</label>
        <input type="number" class="item-rate" min="0" step="0.01" value="0" inputmode="decimal" required>
      </div>
      <button type="button" class="btn btn-link remove-item-btn" aria-label="Remove item">Remove</button>
    </div>
  `;

  card.querySelector(".remove-item-btn").addEventListener("click", () => {
    if (itemsContainer.children.length <= 1) {
      showError("At least one item is required.");
      return;
    }
    card.remove();
    renumberItems();
    clearError();
  });

  card.querySelectorAll(".item-qty, .item-rate").forEach((input) => {
    input.addEventListener("input", () => updateItemAmount(card));
  });

  itemsContainer.appendChild(card);
  updateItemAmount(card);
}

function renumberItems() {
  [...itemsContainer.querySelectorAll(".item-card")].forEach((card, index) => {
    card.querySelector(".item-card-title").textContent = `Item ${index + 1}`;
  });
}

function updateItemAmount(card) {
  const qty = Number(card.querySelector(".item-qty").value) || 0;
  const rate = Number(card.querySelector(".item-rate").value) || 0;
  const amount = qty * rate;
  card.querySelector(".item-amount-value").textContent = `₹${formatAmount(amount)}`;
}

function collectItems() {
  return [...itemsContainer.querySelectorAll(".item-card")].map((card) => ({
    description: card.querySelector(".item-description").value.trim(),
    hsn: card.querySelector(".item-hsn").value.trim(),
    qty: Number(card.querySelector(".item-qty").value) || 0,
    rate: Number(card.querySelector(".item-rate").value) || 0,
  }));
}

function collectFormData() {
  const taxType = form.querySelector('input[name="taxType"]:checked')?.value || "cgst_sgst";
  return {
    partyName: form.partyName.value.trim(),
    partyGstin: form.partyGstin.value.trim(),
    state: form.state.value.trim(),
    stateCode: form.stateCode.value.trim(),
    shipTo: form.shipTo.value.trim(),
    invoiceNo: form.invoiceNo.value.trim(),
    date: formatDisplayDate(form.date.value),
    vehicleNo: form.vehicleNo.value.trim(),
    containerNo: form.containerNo.value.trim(),
    grNo: form.grNo.value.trim(),
    ewayBillNo: form.ewayBillNo.value.trim(),
    transportName: form.transportName.value.trim(),
    taxType,
    taxRate: Number(form.taxRate.value) || 0,
    otherCharge: Number(form.otherCharge.value) || 0,
    items: collectItems(),
  };
}

function validate(data) {
  if (!data.partyName) return "Please enter the customer name.";
  if (!data.invoiceNo) return "Please enter the invoice number.";
  if (!form.date.value) return "Please select a date.";

  const validItems = data.items.filter((item) => item.description && item.qty > 0);
  if (validItems.length === 0) {
    return "Please add at least one item with description and quantity.";
  }

  const invalidRate = validItems.some((item) => item.rate <= 0);
  if (invalidRate) return "Please enter a rate greater than zero for each item.";

  return "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const data = collectFormData();
  const error = validate(data);
  if (error) {
    showError(error);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Preparing invoice…";

  try {
    await generateInvoicePdf(data);
  } catch (err) {
    console.error(err);
    showError("Could not open invoice for printing. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Generate invoice";
  }
});

addItemBtn.addEventListener("click", () => {
  createItemCard();
  clearError();
});

dateInput.value = todayIso();
createItemCard();
