/**
 * Certificate numbering.
 *
 * Format: `KB-<tahun>-<urutan 5 digit>` — e.g. `KB-2026-00125`.
 *
 * The sequence is per-year and must be unique. Today it is derived from the
 * certificates already held by the repository; once a database is wired in,
 * replace `nextCertificateNumber` with a sequence/identity column so numbering
 * stays unique under concurrent writes.
 */

export const CERTIFICATE_PREFIX = "KB";
const SEQUENCE_LENGTH = 5;

export function formatCertificateNumber(year: number, sequence: number): string {
  return `${CERTIFICATE_PREFIX}-${year}-${String(sequence).padStart(SEQUENCE_LENGTH, "0")}`;
}

export function parseCertificateNumber(
  value: string,
): { year: number; sequence: number } | null {
  const match = /^KB-(\d{4})-(\d{5})$/.exec(value.trim().toUpperCase());
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

export function isValidCertificateNumber(value: string): boolean {
  return parseCertificateNumber(value) !== null;
}

/** Next number in the year's sequence, given every number already issued. */
export function nextCertificateNumber(
  existing: readonly string[],
  year: number = new Date().getFullYear(),
): string {
  let highest = 0;
  for (const value of existing) {
    const parsed = parseCertificateNumber(value);
    if (parsed && parsed.year === year && parsed.sequence > highest) {
      highest = parsed.sequence;
    }
  }
  return formatCertificateNumber(year, highest + 1);
}
