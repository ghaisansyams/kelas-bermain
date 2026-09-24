import { certificatesRepository } from "@/lib/repositories/certificates";
import { registrationsRepository } from "@/lib/repositories/registrations";
import type { CertificateRecord } from "@/lib/repositories/types";
import { nextCertificateNumber } from "@/lib/utils/certificate";

/**
 * Mock certificate service.
 *
 * A certificate is issued once — attendance has to be recorded first, and the
 * number is reused on every later request. Numbering is delegated to
 * `lib/utils/certificate.ts`; move that to a database sequence when the real
 * backend lands so numbers stay unique under concurrent writes.
 */

const DEFAULT_SIGNATORY = {
  name: "Putri Anggraini",
  role: "Program Director, Kelas Bermain",
};

export interface IssueInput {
  registrationId: string;
  template?: CertificateRecord["template"];
  organizer?: string;
}

export type CertificateResult =
  | { ok: true; certificate: CertificateRecord; alreadyIssued: boolean }
  | { ok: false; error: string };

const MOCK_LATENCY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function issueCertificate(input: IssueInput): Promise<CertificateResult> {
  await delay(MOCK_LATENCY_MS);

  const registration = registrationsRepository.findById(input.registrationId);
  if (!registration) {
    return { ok: false, error: "Data pendaftaran tidak ditemukan." };
  }
  if (!registration.attendedAt) {
    return {
      ok: false,
      error: "Sertifikat baru bisa diterbitkan setelah kehadiran tercatat.",
    };
  }

  const existing = certificatesRepository.findByRegistrationId(registration.id);
  if (existing) return { ok: true, certificate: existing, alreadyIssued: true };

  const certificate: CertificateRecord = {
    number: nextCertificateNumber(certificatesRepository.numbers()),
    registrationId: registration.id,
    participantName: registration.fullName,
    eventTitle: registration.eventTitle,
    eventDate: registration.eventDate,
    organizer: input.organizer ?? "Kelas Bermain",
    template: input.template ?? "classic",
    issuedAt: new Date().toISOString(),
    status: "issued",
    signatory: DEFAULT_SIGNATORY,
  };

  certificatesRepository.create(certificate);
  registrationsRepository.update(registration.id, {
    certificateNumber: certificate.number,
  });

  return { ok: true, certificate, alreadyIssued: false };
}

export async function getCertificate(value: string): Promise<CertificateRecord | null> {
  await delay(300);
  return (
    certificatesRepository.findByNumber(value) ??
    certificatesRepository.findByRegistrationId(value)
  );
}

/** Public verification: accepts a certificate number or a registration ID. */
export async function verifyCertificate(query: string): Promise<
  | { ok: true; certificate: CertificateRecord }
  | { ok: false; error: string }
> {
  await delay(500);
  const trimmed = query.trim();
  if (trimmed.length < 6) {
    return { ok: false, error: "Masukkan nomor sertifikat atau ID pendaftaran." };
  }
  const certificate =
    certificatesRepository.findByNumber(trimmed) ??
    certificatesRepository.findByRegistrationId(trimmed);

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
  await delay(120);
  return certificatesRepository.all();
}
