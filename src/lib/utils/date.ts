import type { EventLifecycle } from "@/lib/types";

const LONG = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const SHORT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const DAY_MONTH = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Jakarta",
});

const WEEKDAY = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  timeZone: "Asia/Jakarta",
});

export function formatDate(iso: string): string {
  return LONG.format(new Date(iso));
}

export function formatDateShort(iso: string): string {
  return SHORT.format(new Date(iso));
}

export function formatWeekday(iso: string): string {
  return WEEKDAY.format(new Date(iso));
}

/**
 * "10 Oktober 2026" for a single day, "12 – 14 Desember 2026" for a range.
 */
export function formatDateRange(startIso: string, endIso?: string): string {
  if (!endIso || startIso.slice(0, 10) === endIso.slice(0, 10)) {
    return formatDate(startIso);
  }
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth();
  if (sameMonth) {
    const startDay = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(start);
    return `${startDay} – ${formatDate(endIso)}`;
  }
  return `${DAY_MONTH.format(start)} – ${formatDate(endIso)}`;
}

/** Day-of-month and short month, for the date chip on event cards. */
export function dateChip(iso: string): { day: string; month: string } {
  const date = new Date(iso);
  return {
    day: new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(date),
    month: new Intl.DateTimeFormat("id-ID", {
      month: "short",
      timeZone: "Asia/Jakarta",
    })
      .format(date)
      .replace(".", ""),
  };
}

const DAY_MS = 86_400_000;

/**
 * Where an event sits relative to `now`.
 *
 * Always call this on the server and pass the result down, so the client never
 * recomputes it against a different clock and trips a hydration mismatch.
 */
export function resolveLifecycle(
  startIso: string,
  endIso: string,
  now: Date = new Date(),
): EventLifecycle {
  const start = new Date(startIso).getTime();
  // An event runs until the end of its last day.
  const end = new Date(endIso).getTime() + DAY_MS;
  const current = now.getTime();
  if (current < start) return "upcoming";
  if (current > end) return "past";
  return "ongoing";
}

export function daysUntil(iso: string, now: Date = new Date()): number {
  const diff = new Date(iso).getTime() - now.getTime();
  return Math.ceil(diff / DAY_MS);
}

export function isDeadlinePassed(iso: string, now: Date = new Date()): boolean {
  return now.getTime() > new Date(iso).getTime() + DAY_MS;
}
