import type { Child } from "@/lib/repositories/types";

/**
 * A child's age in whole years.
 *
 * Two sources, in order of trust:
 *  1. `dateOfBirth` — exact, never goes stale. Seeded rows have it.
 *  2. `ageYears`/`ageMonths` as stated at sign-up, advanced by the time
 *     elapsed since. The intake form asks for an age rather than a birthday,
 *     so without this a record would quietly keep the age it was born with.
 */
export function ageOfChild(child: Child, now: Date = new Date()): number | null {
  if (child.dateOfBirth) return yearsSince(child.dateOfBirth, now);

  if (child.ageYears === undefined) return null;
  const statedMonths = child.ageYears * 12 + (child.ageMonths ?? 0);
  const elapsed = child.ageRecordedAt ? monthsBetween(child.ageRecordedAt, now) : 0;
  return Math.floor((statedMonths + elapsed) / 12);
}

/** "3 tahun 8 bulan" — how parents state it on the intake form. */
export function formatAge(years: number, months: number): string {
  if (months <= 0) return `${years} tahun`;
  return `${years} tahun ${months} bulan`;
}

export function yearsSince(isoDate: string, now: Date = new Date()): number {
  const birth = new Date(isoDate);
  let age = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function monthsBetween(isoDate: string, now: Date): number {
  const from = new Date(isoDate);
  if (Number.isNaN(from.getTime())) return 0;
  const months =
    (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  return Math.max(0, months);
}
