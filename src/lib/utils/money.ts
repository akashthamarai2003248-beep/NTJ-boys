/** Money helpers. Amounts are stored as whole rupees (integers). */

/** Format 85500 → "₹85,500" (Indian grouping) */
export function formatINR(amount: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(amount))}`;
}

/** Format 85500 → "85,500" without the rupee glyph */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(amount));
}

/** Parse user-entered money text into integer rupees. Accepts ₹, commas, decimals. */
export function parseRupees(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export const isPositiveAmount = (n: number) => Number.isFinite(n) && n > 0;

/** Upper-case Indian amount in words (used by receipts later) */
const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = [
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${TENS[t]}-${ONES[o]}` : TENS[t];
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const head = h ? `${ONES[h]} hundred` : "";
  return [head, rest ? twoDigits(rest) : ""].filter(Boolean).join(" ");
}

/** Indian system: crore / lakh / thousand */
export function rupeesInWords(amount: number): string {
  const rupees = Math.round(amount);
  if (rupees === 0) return "zero";
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${crore > 1 ? threeDigits(crore) : "one"} crore`);
  if (lakh) parts.push(`${lakh > 1 ? threeDigits(lakh) : "one"} lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} thousand`);
  if (rest) parts.push(threeDigits(rest));
  const words = parts.join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
