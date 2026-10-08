"use client";

import type { RegistrationSource } from "@/lib/repositories/types";
import type { ChildFormValues, ParentFormValues } from "@/lib/utils/validation";

/**
 * Keeps a half-filled registration alive across a refresh.
 *
 * Parents fill this form on a phone, often while doing something else. A
 * stray refresh, a notification that swaps apps, a tab the browser evicts to
 * free memory — any of those used to wipe every field and send them back to
 * the first step. There is no account to log into, so the only place to keep
 * it is the device itself.
 *
 * Stored per event, so filling in one class does not overwrite another. Only
 * what the parent typed is saved — never a price or a discount amount. The
 * voucher code comes back, but it is looked up again on restore: a total
 * kept in localStorage is a total the parent could edit.
 */

const PREFIX = "kb.registration.draft.";
/** Dropped after this long: an abandoned form should not resurface next month. */
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 3;

export interface RegistrationDraft {
  version: 1;
  savedAt: number;
  mode: "PERSONAL" | "GROUP";
  groups: { companion: ParentFormValues; children: ChildFormValues[] }[];
  heardFrom: RegistrationSource | "";
  affiliateCode: string;
  /** Code only. Re-validated against the database on restore. */
  voucherCode: string;
  /** "participants" or "confirm" only — never a step past submission. */
  stepKey: "participants" | "confirm";
}

function keyFor(eventId: string): string {
  return `${PREFIX}${eventId}`;
}

export function saveDraft(eventId: string, draft: Omit<RegistrationDraft, "version" | "savedAt">) {
  try {
    const payload: RegistrationDraft = { ...draft, version: 1, savedAt: Date.now() };
    window.localStorage.setItem(keyFor(eventId), JSON.stringify(payload));
  } catch {
    // Private mode, blocked storage, quota — the form still works, it just
    // will not survive a refresh. Never surface this to the parent.
  }
}

export function loadDraft(eventId: string): RegistrationDraft | null {
  try {
    const raw = window.localStorage.getItem(keyFor(eventId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RegistrationDraft;
    if (parsed.version !== 1 || !Array.isArray(parsed.groups) || parsed.groups.length === 0) {
      return null;
    }
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearDraft(eventId);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(eventId: string) {
  try {
    window.localStorage.removeItem(keyFor(eventId));
  } catch {
    // Nothing to do; the age check will drop it eventually.
  }
}

/** True when the parent has actually typed something worth restoring. */
export function draftHasContent(draft: RegistrationDraft): boolean {
  return draft.groups.some(
    (group) =>
      group.companion.fullName.trim() ||
      group.companion.whatsapp.trim() ||
      group.children.some((child) => child.fullName.trim()),
  );
}
