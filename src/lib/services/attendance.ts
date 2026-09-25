import { attendanceRepo, lookups, registrationsRepo } from "@/lib/repositories";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/repositories/types";
import { childrenRepo, customersRepo } from "@/lib/repositories";
import { nextId } from "@/lib/utils/numbering";

/**
 * Attendance service.
 *
 * Check-in is verified against the registration number plus a contact the
 * family gave at sign-up. `method` already distinguishes a typed submission
 * from a scanned one, so QR check-in only needs to call this with
 * `method: "qr"` and the id decoded from the code — no new flow required.
 */

export interface CheckInInput {
  registrationNumber: string;
  /** Email or WhatsApp used at registration. */
  contact: string;
  eventId?: string;
  method?: AttendanceRecord["method"];
}

export interface CheckInSuccess {
  ok: true;
  registrationNumber: string;
  childName: string;
  eventId: string;
  alreadyRecorded: boolean;
  certificateAvailable: boolean;
}

export interface CheckInFailure {
  ok: false;
  error: string;
  field?: "registrationNumber" | "contact";
}

export type CheckInResult = CheckInSuccess | CheckInFailure;

const MOCK_LATENCY_MS = 600;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePhone(value: string): string {
  return value.replace(/[\s\-().]/g, "");
}

export async function checkIn(input: CheckInInput): Promise<CheckInResult> {
  await delay(MOCK_LATENCY_MS);

  const registration = lookups.registrationByNumber(input.registrationNumber);
  if (!registration) {
    return {
      ok: false,
      field: "registrationNumber",
      error: "Nomor pendaftaran tidak ditemukan. Periksa kembali kode yang kamu terima.",
    };
  }
  if (input.eventId && registration.eventId !== input.eventId) {
    return {
      ok: false,
      field: "registrationNumber",
      error: "Nomor ini terdaftar untuk kelas lain.",
    };
  }
  if (registration.status === "CANCELLED") {
    return { ok: false, error: "Pendaftaran ini sudah dibatalkan." };
  }

  const customer = customersRepo.find(registration.customerId);
  const child = childrenRepo.find(registration.childId);
  const value = input.contact.trim().toLowerCase();
  const contactMatches =
    customer !== null &&
    (customer.email.toLowerCase() === value ||
      normalizePhone(customer.whatsapp) === normalizePhone(input.contact));

  if (!contactMatches) {
    return {
      ok: false,
      field: "contact",
      error: "Email atau nomor WhatsApp tidak cocok dengan data pendaftaran.",
    };
  }

  const existing = lookups.attendanceByRegistration(registration.id);
  const now = new Date().toISOString();

  if (existing && existing.status === "PRESENT") {
    return {
      ok: true,
      registrationNumber: registration.registrationNumber,
      childName: child?.fullName ?? "Peserta",
      eventId: registration.eventId,
      alreadyRecorded: true,
      certificateAvailable: registration.certificateStatus !== "NOT_ELIGIBLE",
    };
  }

  if (existing) {
    attendanceRepo.update(existing.id, {
      status: "PRESENT",
      checkedInAt: now,
      method: input.method ?? "form",
    });
  } else {
    const record: AttendanceRecord = {
      id: nextId("att", attendanceRepo.all().map((a) => a.id)),
      registrationId: registration.id,
      eventId: registration.eventId,
      childId: registration.childId,
      status: "PRESENT",
      checkedInAt: now,
      method: input.method ?? "form",
    };
    attendanceRepo.create(record);
  }

  registrationsRepo.update(registration.id, {
    attendanceStatus: "PRESENT",
    certificateStatus: "AVAILABLE",
    status: "COMPLETED",
  });

  return {
    ok: true,
    registrationNumber: registration.registrationNumber,
    childName: child?.fullName ?? "Peserta",
    eventId: registration.eventId,
    alreadyRecorded: false,
    certificateAvailable: true,
  };
}

/** Admin-side toggle from the attendance table. */
export async function setAttendance(
  registrationId: string,
  status: AttendanceStatus,
  recordedBy = "Admin",
): Promise<AttendanceRecord | null> {
  const registration = registrationsRepo.find(registrationId);
  if (!registration) return null;

  const existing = lookups.attendanceByRegistration(registrationId);
  const now = new Date().toISOString();
  const patch = {
    status,
    checkedInAt: status === "PRESENT" ? now : undefined,
    method: "manual" as const,
    recordedBy,
  };

  const record = existing
    ? attendanceRepo.update(existing.id, patch)
    : attendanceRepo.create({
        id: nextId("att", attendanceRepo.all().map((a) => a.id)),
        registrationId,
        eventId: registration.eventId,
        childId: registration.childId,
        ...patch,
      });

  registrationsRepo.update(registrationId, {
    attendanceStatus: status,
    certificateStatus: status === "PRESENT" ? "AVAILABLE" : "NOT_ELIGIBLE",
  });
  return record;
}

export async function listAttendance(eventId?: string): Promise<AttendanceRecord[]> {
  return eventId
    ? attendanceRepo.where((a) => a.eventId === eventId)
    : attendanceRepo.all();
}
