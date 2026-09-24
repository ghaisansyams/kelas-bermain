import { registrationsRepository } from "@/lib/repositories/registrations";
import type { Registration } from "@/lib/repositories/types";
import { normalizePhone } from "@/lib/utils/validation";

/**
 * Mock attendance service.
 *
 * Participants confirm attendance with the registration ID they received when
 * signing up. `source` already distinguishes a typed submission from a scanned
 * one, so QR check-in can be added later by calling this with `source: "qr"`
 * and the id decoded from the code — no new flow required.
 */

export interface AttendanceInput {
  registrationId: string;
  fullName: string;
  /** Email or WhatsApp number used at registration. */
  contact: string;
  eventSlug: string;
  source?: "form" | "qr";
}

export interface AttendanceSuccess {
  ok: true;
  registration: Registration;
  /** True when the participant had already checked in earlier. */
  alreadyRecorded: boolean;
}

export interface AttendanceFailure {
  ok: false;
  error: string;
  field?: "registrationId" | "fullName" | "contact";
}

export type AttendanceResult = AttendanceSuccess | AttendanceFailure;

const MOCK_LATENCY_MS = 600;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function contactMatches(registration: Registration, contact: string): boolean {
  const value = contact.trim().toLowerCase();
  if (registration.email.toLowerCase() === value) return true;
  return normalizePhone(registration.whatsapp) === normalizePhone(contact);
}

export async function submitAttendance(
  input: AttendanceInput,
): Promise<AttendanceResult> {
  await delay(MOCK_LATENCY_MS);

  const registration = registrationsRepository.findById(input.registrationId);
  if (!registration) {
    return {
      ok: false,
      field: "registrationId",
      error: "ID pendaftaran tidak ditemukan. Periksa kembali kode yang kamu terima.",
    };
  }
  if (registration.eventSlug !== input.eventSlug) {
    return {
      ok: false,
      field: "registrationId",
      error: `ID ini terdaftar untuk event lain (${registration.eventTitle}).`,
    };
  }
  if (!contactMatches(registration, input.contact)) {
    return {
      ok: false,
      field: "contact",
      error: "Email atau nomor WhatsApp tidak cocok dengan data pendaftaran.",
    };
  }

  if (registration.attendedAt) {
    return { ok: true, registration, alreadyRecorded: true };
  }

  const updated = registrationsRepository.update(registration.id, {
    attendedAt: new Date().toISOString(),
  });

  return { ok: true, registration: updated ?? registration, alreadyRecorded: false };
}

/** Admin-facing read for an attendance list. */
export async function listAttendance(eventSlug: string): Promise<Registration[]> {
  await delay(120);
  return registrationsRepository
    .findByEvent(eventSlug)
    .filter((registration) => Boolean(registration.attendedAt));
}
