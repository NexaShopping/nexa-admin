// Formatting ONLY. Never arithmetic. Every total, tax, and discount arrives from the server
// already computed as a decimal string ("1234.50") — see nexa-docs/docs/CONVENTIONS.md §Money.
// This formats the string directly (Indian digit grouping) without ever converting to a
// JS number, so there is no float in the money path even for display.

export function formatMoney(amount: string, symbol = "₹"): string {
  const negative = amount.startsWith("-");
  const [intRaw = "0", decRaw = "00"] = amount.replace("-", "").split(".");
  // Indian grouping: last 3 digits, then groups of 2.
  const last3 = intRaw.slice(-3);
  const rest = intRaw.slice(0, -3);
  const grouped = rest
    ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`
    : last3;
  const dec = `${decRaw}00`.slice(0, 2);
  return `${negative ? "-" : ""}${symbol}${grouped}.${dec}`;
}
