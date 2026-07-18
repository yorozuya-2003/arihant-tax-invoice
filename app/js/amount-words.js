/**
 * Convert a number to Indian Rupees in words (e.g. "Rupees One Thousand Only").
 */
function amountToWords(num) {
  const n = Math.round(Number(num) * 100) / 100;
  if (!Number.isFinite(n) || n < 0) return "";

  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);

  let words = "Rupees " + convertIndian(rupees);
  if (paise > 0) {
    words += " and " + convertIndian(paise) + " Paise";
  }
  return words + " Only";
}

function convertIndian(n) {
  if (n === 0) return "Zero";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(num) {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  }

  function threeDigits(num) {
    if (num < 100) return twoDigits(num);
    return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + twoDigits(num % 100) : "");
  }

  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (remainder) parts.push(threeDigits(remainder));

  return parts.join(" ");
}

function splitRsPaise(amount) {
  const n = Math.round(Number(amount) * 100) / 100;
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  return {
    rs: rupees.toLocaleString("en-IN"),
    p: String(paise).padStart(2, "0"),
  };
}

function formatAmount(amount) {
  return Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
