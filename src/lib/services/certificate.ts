import {
  certificatesRepo,
  childrenRepo,
  lookups,
  registrationsRepo,
} from "@/lib/repositories";
import type { CertificateRecord } from "@/lib/repositories/types";
import { events } from "@/data/events";
import { nextCertificateNumber } from "@/lib/utils/certificate";

/**
 * Certificate service.
 *
 * A certificate is issued once, only after attendance is recorded, and the same
 * number is returned on every later request. Numbering lives in
 * `lib/utils/certificate.ts` — move that to a database sequence when the real
 * backend lands so numbers stay unique under concurrent writes.
 */

const DEFAULT_SIGNATORY = {
  name: "Kak Rangga",
  role: "Lead Facilitator, Kelas Bermain",
};

export type IssueResult =
  | { ok: true; certificate: CertificateRecord; alreadyIssued: boolean }
  | { ok: false; error: string };

const MOCK_LATENCY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function issueCertificate(registrationId: string): Promise<IssueResult> {
  await delay(MOCK_LATENCY_MS);

  const registration =
    registrationsRepo.find(registrationId) ?? lookups.registrationByNumber(registrationId);
  if (!registration) return { ok: false, error: "Data pendaftaran tidak ditemukan." };

  const existing = lookups.certificateByRegistration(registration.id);
  if (existing) return { ok: true, certificate: existing, alreadyIssued: true };

  if (registration.attendanceStatus !== "PRESENT") {
    return {
      ok: false,
      error: "Sertifikat baru bisa diterbitkan setelah kehadiran tercatat.",
    };
  }

  const event = events.find((e) => e.id === registration.eventId);
  if (!event) return { ok: false, error: "Data kelas tidak ditemukan." };
  if (!event.certificate.available) {
    return { ok: false, error: "Kelas ini tidak menerbitkan sertifikat." };
  }

  const child = childrenRepo.find(registration.childId);
  const certificate: CertificateRecord = {
    number: nextCertificateNumber(certificatesRepo.all().map((c) => c.number)),
    registrationId: registration.id,
    childId: registration.childId,
    eventId: registration.eventId,
    participantName: child?.fullName ?? "Peserta Kelas Bermain",
    eventTitle: event.title,
    eventDate: event.startDate,
    organizer: event.organizer,
    template: event.certificate.template,
    issuedAt: new Date().toISOString(),
    status: "issued",
    signatory: DEFAULT_SIGNATORY,
  };

  certificatesRepo.create(certificate);
  registrationsRepo.update(registration.id, { certificateStatus: "ISSUED" });
  return { ok: true, certificate, alreadyIssued: false };
}

export async function getCertificate(value: string): Promise<CertificateRecord | null> {
  await delay(250);
  return (
    certificatesRepo.find(value) ??
    certificatesRepo.all().find((c) => c.registrationId === value) ??
    null
  );
}

/** Public verification: accepts a certificate number or a registration number. */
export async function verifyCertificate(query: string): Promise<
  { ok: true; certificate: CertificateRecord } | { ok: false; error: string }
> {
  await delay(500);
  const trimmed = query.trim();
  if (trimmed.length < 6) {
    return { ok: false, error: "Masukkan nomor sertifikat atau nomor pendaftaran." };
  }

  const byNumber = certificatesRepo.find(trimmed);
  const registration = lookups.registrationByNumber(trimmed);
  const certificate =
    byNumber ?? (registration ? lookups.certificateByRegistration(registration.id) : null);

  if (!certificate) {
    return {
      ok: false,
      error: "Sertifikat tidak ditemukan. Periksa kembali nomor yang kamu masukkan.",
    };
  }
  if (certificate.status === "revoked") {
    return { ok: false, error: "Sertifikat ini sudah dibatalkan oleh penyelenggara." };
  }
  return { ok: true, certificate };
}

export async function listCertificates(): Promise<CertificateRecord[]> {
  return certificatesRepo.all();
}
