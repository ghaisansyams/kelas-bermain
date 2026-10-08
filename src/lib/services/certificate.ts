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
import { normaliseConfig, type CertificateTemplate } from "@/lib/cms/certificate-template";

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

/**
 * The published template a certificate should be rendered with. Falls back to
 * null, in which case the viewer keeps using the built-in card — so a site
 * with no templates still shows every certificate it has issued.
 */
export async function getCertificateTemplate(
  name?: string,
): Promise<CertificateTemplate | null> {
  try {
    const { data, error } = await getSupabase().rpc("get_certificate_template", {
      p_name: name ?? null,
    });
    if (error || !data || typeof data !== "object") return null;

    const row = data as Record<string, unknown>;
    // Without artwork there is nothing to overlay, so the built-in card is
    // the better fallback than an empty page with two floating strings.
    const backgroundUrl = String(row.backgroundUrl ?? "");
    if (!backgroundUrl) return null;

    return {
      id: String(row.id),
      name: String(row.name),
      description: "",
      backgroundUrl,
      orientation: row.orientation === "PORTRAIT" ? "PORTRAIT" : "LANDSCAPE",
      config: normaliseConfig(row.config),
      status: "PUBLISHED",
      isDefault: true,
    };
  } catch {
    return null;
  }
}

/**
 * The published template for one event, or the general one when that event
 * has none. Returns the template's name, which is what gets stored on the
 * certificate so an old document keeps rendering with the design it was
 * issued under.
 */
export async function findTemplateNameForEvent(eventId: string): Promise<string> {
  try {
    const { data, error } = await getSupabase()
      .from("certificate_templates")
      .select("name, config, is_default")
      .eq("status", "PUBLISHED");

    if (error || !Array.isArray(data)) return "classic";

    const rows = data as { name: string; config: unknown; is_default: boolean }[];
    const forEvent = rows.find(
      (row) => normaliseConfig(row.config).eventId === eventId,
    );
    if (forEvent) return forEvent.name;

    const general = rows.find((row) => !normaliseConfig(row.config).eventId);
    return general?.name ?? rows.find((row) => row.is_default)?.name ?? "classic";
  } catch {
    return "classic";
  }
}
