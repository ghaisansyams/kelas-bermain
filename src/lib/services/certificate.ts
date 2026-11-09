"use server";

/**
 * Certificate service.
 *
 * Reads the same `certificates` table the ERP writes to, so a certificate
 * issued in the admin is findable on the public checker straight away.
 *
 * Issuing lives in the admin (`admin_issue_certificate`), not here: a
 * certificate is proof of attendance, so only someone who can see the
 * attendance record may mint one.
 */

import type { CertificateRecord } from "@/lib/repositories/types";
import { db } from "@/lib/db";
import { normaliseConfig, type CertificateTemplate } from "@/lib/cms/certificate-template";
import { phoneKey } from "@/lib/utils/validation";

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
    const query = trimmed.toUpperCase();

    // Nomor sertifikat dulu, lalu nomor pendaftaran: orang tua lebih sering
    // memegang nomor pendaftarannya daripada nomor sertifikatnya.
    let cert = await db.certificates.findFirst({
      where: { number: { equals: query, mode: "insensitive" } },
    });

    if (!cert) {
      cert = await db.certificates.findFirst({
        where: {
          registrations: { registration_number: { equals: query, mode: "insensitive" } },
        },
        orderBy: { issued_at: "desc" },
      });
    }

    if (!cert) return { ok: false, error: REASON_MESSAGE.NOT_FOUND };
    if (cert.status === "revoked") return { ok: false, error: REASON_MESSAGE.REVOKED };

    return {
      ok: true,
      certificate: toRecord({
        number: cert.number,
        registrationId: cert.registration_id,
        childId: cert.child_id,
        eventId: cert.event_id,
        participantName: cert.participant_name,
        eventTitle: cert.event_title,
        eventDate: cert.event_date,
        organizer: cert.organizer,
        template: cert.template,
        issuedAt: cert.issued_at?.toISOString() ?? "",
        status: cert.status,
        signatoryName: cert.signatory_name,
        signatoryRole: cert.signatory_role,
      }),
    };
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
    // Nama yang diminta menang, lalu template bawaan. Urutan yang sama
    // dengan fungsi SQL yang digantikan.
    const row =
      (name
        ? await db.certificate_templates.findFirst({
            where: { status: "PUBLISHED", name },
          })
        : null) ??
      (await db.certificate_templates.findFirst({
        where: { status: "PUBLISHED" },
        orderBy: { is_default: "desc" },
      }));

    if (!row) return null;
    // Without artwork there is nothing to overlay, so the built-in card is
    // the better fallback than an empty page with two floating strings.
    const backgroundUrl = String(row.background_url ?? "");
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
    const rows = await db.certificate_templates.findMany({
      where: { status: "PUBLISHED" },
      select: { name: true, config: true, is_default: true },
    });
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

/* ------------------------------------------------------------------ */
/* Orang tua mengunduh sertifikat anaknya                              */
/* ------------------------------------------------------------------ */

export interface OwnedCertificate {
  number: string;
  participantName: string;
  eventTitle: string;
  /** "YYYY-MM-DD" */
  eventDate: string;
  /** Nama desain yang dipakai saat terbit, supaya hasil unduhan sama dengan aslinya. */
  template: string;
}

export type OwnedCertificatesResult =
  | { ok: true; certificates: OwnedCertificate[] }
  | { ok: false; error: string };

// Pembatas sederhana per proses: nomor WhatsApp mudah ditebak, jadi pencarian
// ini dibatasi supaya tidak bisa dipakai menelusuri data keluarga lain.
const attempts: number[] = [];
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

/**
 * Mencari sertifikat milik satu keluarga.
 *
 * Dua hal harus cocok: nomor WhatsApp yang dipakai saat mendaftar, DAN
 * (nomor pendaftaran ATAU nama anak/pendamping). Nomor telepon bukan rahasia
 * dan nomor pendaftaran berurutan, jadi satu saja tidak cukup. Pesan gagalnya
 * sama untuk semua sebab, supaya tidak bisa dipakai memeriksa apakah suatu
 * nomor pernah mendaftar.
 *
 * Yang dikembalikan semua sertifikat terbit milik keluarga itu — anak
 * kedua dan kelas lain ikut muncul tanpa perlu dicari satu per satu.
 */
export async function findCertificatesForFamily(input: {
  whatsapp: string;
  /** Nomor pendaftaran (KB-REG-…) atau nama anak/pendamping. */
  reference: string;
}): Promise<OwnedCertificatesResult> {
  const now = Date.now();
  while (attempts.length && now - attempts[0] > WINDOW_MS) attempts.shift();
  if (attempts.length >= MAX_ATTEMPTS) {
    return { ok: false, error: "Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi." };
  }
  attempts.push(now);

  const NOT_FOUND = {
    ok: false as const,
    error:
      "Data tidak ditemukan. Pastikan nomor WhatsApp dan nomor pendaftaran (atau nama anak) sama seperti saat mendaftar.",
  };

  const key = phoneKey(String(input.whatsapp ?? ""));
  const reference = String(input.reference ?? "").trim();
  if (key.length < 8 || reference.length < 2) return NOT_FOUND;

  try {
    const customers = await db.customers.findMany({
      where: { whatsapp: { contains: key.slice(-8) } },
      select: { id: true, full_name: true, whatsapp: true },
      take: 20,
    });
    const owners = customers.filter((customer) => phoneKey(customer.whatsapp) === key);
    if (owners.length === 0) return NOT_FOUND;

    const registrations = await db.registrations.findMany({
      where: { customer_id: { in: owners.map((customer) => customer.id) } },
      select: {
        id: true,
        registration_number: true,
        customer_id: true,
        children: { select: { full_name: true } },
      },
      take: 200,
    });

    const wanted = reference.toLowerCase();
    const ownerName = new Map(owners.map((c) => [c.id, c.full_name.trim().toLowerCase()]));
    const matched = registrations.filter(
      (row) =>
        row.registration_number.toLowerCase() === wanted ||
        row.children.full_name.trim().toLowerCase() === wanted ||
        ownerName.get(row.customer_id) === wanted,
    );
    if (matched.length === 0) return NOT_FOUND;

    // Satu keluarga yang sudah terbukti: semua pendaftarannya ikut dicari.
    const familyIds = new Set(matched.map((row) => row.customer_id));
    const registrationIds = registrations
      .filter((row) => familyIds.has(row.customer_id))
      .map((row) => row.id);

    const rows = await db.certificates.findMany({
      where: { registration_id: { in: registrationIds }, status: "issued" },
      orderBy: { issued_at: "desc" },
    });

    return {
      ok: true,
      certificates: rows.map((cert) => ({
        number: cert.number,
        participantName: cert.participant_name,
        eventTitle: cert.event_title,
        eventDate: cert.event_date.toISOString().slice(0, 10),
        template: cert.template,
      })),
    };
  } catch {
    return { ok: false, error: "Gagal mencari sertifikat. Coba lagi sebentar lagi." };
  }
}
