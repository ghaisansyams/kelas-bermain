import type { CollectionStore } from "./types";

/**
 * Browser-backed collection store used by the mock services.
 *
 * Writes go to `localStorage` and are mirrored in memory, so the app keeps
 * working when storage is unavailable (private windows, blocked site data) —
 * it just stops surviving a reload.
 */

const memory = new Map<string, string>();

function readRaw(key: string): string | null {
  const cached = memory.get(key);
  if (typeof window === "undefined") return cached ?? null;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored !== null) return stored;
  } catch {
    // Storage disabled — fall through to the in-memory mirror.
  }
  return cached ?? null;
}

function writeRaw(key: string, value: string): void {
  memory.set(key, value);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Quota or privacy mode: the in-memory mirror is the fallback.
  }
}

export function createStore<T>(key: string, seed: () => T[]): CollectionStore<T> {
  function all(): T[] {
    const raw = readRaw(key);
    if (raw === null) {
      const seeded = seed();
      writeRaw(key, JSON.stringify(seeded));
      return seeded;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : seed();
    } catch {
      return seed();
    }
  }

  function save(items: T[]): void {
    writeRaw(key, JSON.stringify(items));
  }

  function add(item: T): T {
    const items = all();
    items.push(item);
    save(items);
    return item;
  }

  return { all, save, add };
}

export const STORAGE_KEYS = {
  customers: "kb.customers.v2",
  children: "kb.children.v2",
  registrations: "kb.registrations.v2",
  payments: "kb.payments.v2",
  attendance: "kb.attendance.v2",
  certificates: "kb.certificates.v2",
  affiliates: "kb.affiliates.v1",
} as const;
