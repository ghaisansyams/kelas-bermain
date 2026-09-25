/**
 * Human-readable record numbers.
 *
 * Every sequence is derived from the rows already stored. In production these
 * become database sequences / identity columns so numbers stay unique under
 * concurrent writes — replace the `next*` helpers and nothing else.
 */

export const PREFIX = "KB";

function padSeq(value: number, width = 5): string {
  return String(value).padStart(width, "0");
}

function highest(values: readonly string[], pattern: RegExp): number {
  let max = 0;
  for (const value of values) {
    const match = pattern.exec(value.trim().toUpperCase());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max;
}

/** KB-CUS-00001 */
export function nextCustomerNumber(existing: readonly string[]): string {
  return `${PREFIX}-CUS-${padSeq(highest(existing, /^KB-CUS-(\d+)$/) + 1)}`;
}

/** KB-CHD-00001 */
export function nextChildNumber(existing: readonly string[]): string {
  return `${PREFIX}-CHD-${padSeq(highest(existing, /^KB-CHD-(\d+)$/) + 1)}`;
}

/** KB-REG-2026-00001 */
export function nextRegistrationNumber(
  existing: readonly string[],
  year: number = new Date().getFullYear(),
): string {
  const pattern = new RegExp(`^KB-REG-${year}-(\\d+)$`);
  return `${PREFIX}-REG-${year}-${padSeq(highest(existing, pattern) + 1)}`;
}

/** KB-PAY-2026-00001 */
export function nextPaymentNumber(
  existing: readonly string[],
  year: number = new Date().getFullYear(),
): string {
  const pattern = new RegExp(`^KB-PAY-${year}-(\\d+)$`);
  return `${PREFIX}-PAY-${year}-${padSeq(highest(existing, pattern) + 1)}`;
}

/**
 * Internal ids stay opaque and short.
 *
 * `highest` compares upper-cased values, so the pattern is upper-cased too —
 * a lowercase prefix here would never match and every new record would be
 * handed `-001`, colliding with the first seeded row.
 */
export function nextId(prefix: string, existing: readonly string[]): string {
  const pattern = new RegExp(`^${prefix.toUpperCase()}-(\\d+)$`);
  return `${prefix}-${padSeq(highest(existing, pattern) + 1, 3)}`;
}
