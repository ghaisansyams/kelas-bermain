/**
 * Certificate service.
 *
 * Reads the same `certificates` table the ERP writes to, through the
 * `verify_certificate` SECURITY DEFINER function — so a certificate issued in
 * the admin is findable on the public checker straight away. It used to read
 * the old in-memory repositories, which real sign-ups never write to, meaning
 * every lookup of a genuinely issued certificate failed.
 *
 * Issuing lives in the admin (`admin_issue_certificate`), not here: a
 * certificate is proof of attendance, so only someone who can see the
 * attendance record may mint one.
 */

import type { CertificateRecord } from "@/lib/repositories/types";
import { getSupabase } from "@/lib/supabase/client";

const REASON_MESSAGE: Record<string, string> = {
  TOO_SHORT: "Masukkan nomor sertifikat atau nomor pendaftaran.",
  NOT_FOUND: "Sertifikat tidak ditemukan. Periksa kembali nomor yang kamu masukkan.",
  REVOKED: "Sertifikat ini sudah dibatalkan oleh penyelenggara.",
};

export type VerifyResult =
  | { ok: true; certificate: CertificateRecord }
  | { ok: false; error: string };

function toRecord(row: Record<string, unknown>): CertificateRecord {
  return {
    number: String(row.number),
    registrationId: String(row.registrationId),
    childId: String(row.childId),
    eventId: String(row.eventId),
    participantName: String(row.participantName),
    eventTitle: String(row.eventTitle),
    eventDate: String(row.eventDate),
    organizer: String(row.organizer),
    template: row.template === "playful" ? "playful" : "classic",
    issuedAt: String(row.issuedAt),
    status: row.status === "revoked" ? "revoked" : "issued",
    signatory: {
      name: String(row.signatoryName ?? ""),
      role: String(row.signatoryRole ?? ""),
    },
  };
}

/** Public verification: accepts a certificate number or a registration number. */
export async function verifyCertificate(query: string): Promise<VerifyResult> {
  const trimmed = query.trim();
  if (trimmed.length < 6) return { ok: false, error: REASON_MESSAGE.TOO_SHORT };

  try {
    const { data, error } = await getSupabase().rpc("verify_certificate", { p_query: trimmed });

    if (error || !data || typeof data !== "object") {
      return { ok: false, error: REASON_MESSAGE.NOT_FOUND };
    }

    const result = data as Record<string, unknown>;
    if (result.ok !== true) {
      const reason = String(result.reason ?? "NOT_FOUND");
      return { ok: false, error: REASON_MESSAGE[reason] ?? REASON_MESSAGE.NOT_FOUND };
    }

    return { ok: true, certificate: toRecord(result) };
  } catch {
    return { ok: false, error: REASON_MESSAGE.NOT_FOUND };
  }
}

/** Same lookup, for the certificate display page. */
export async function getCertificate(value: string): Promise<CertificateRecord | null> {
  const result = await verifyCertificate(value);
  return result.ok ? result.certificate : null;
}
