"use server";

import { db } from "@/lib/db";

/**
 * Program affiliate.
 *
 * `applyAsAffiliate` dan `findAffiliateByCode` adalah satu-satunya dua hal
 * yang dipanggil situs publik, dan keduanya sengaja sempit soal apa yang
 * dikembalikan: pendaftaran tidak pernah memantulkan rekening banknya sendiri,
 * dan pencarian kode tidak pernah mengembalikan rekening, WhatsApp, atau
 * domisili sama sekali.
 *
 * Kode dibuat trigger affiliates_assign_code begitu admin mengubah status ke
 * ACTIVE di halaman Affiliate, jadi tidak ada yang perlu mengarang kode atau
 * memeriksa apakah sudah dipakai.
 */

export interface AffiliateApplication {
  fullName: string;
  whatsapp: string;
  email?: string;
  domicile: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  reason?: string;
}

export type AffiliateResult =
  | { ok: true; affiliateNumber: string }
  | { ok: false; error: string; field?: string };

export async function applyAsAffiliate(
  input: AffiliateApplication,
): Promise<AffiliateResult> {
  try {
    const whatsapp = input.whatsapp.trim();

    // Yang masih PENDING atau sudah ACTIVE tidak boleh mendaftar lagi; yang
    // ditolak atau dinonaktifkan boleh mencoba sekali lagi.
    const existing = await db.affiliates.findFirst({
      where: { whatsapp, status: { in: ["PENDING", "ACTIVE"] } },
      select: { id: true },
    });
    if (existing) {
      return {
        ok: false,
        field: "whatsapp",
        error:
          "Nomor WhatsApp ini sudah mendaftar sebagai affiliator. Tim kami akan menghubungi kamu.",
      };
    }

    const created = await db.affiliates.create({
      data: {
        full_name: input.fullName.trim(),
        whatsapp,
        email: input.email?.trim().toLowerCase() || null,
        domicile: input.domicile.trim(),
        bank_name: input.bankName.trim(),
        bank_account_number: input.bankAccountNumber.replace(/\D/g, ""),
        bank_account_name: input.bankAccountName.trim(),
        reason: input.reason?.trim() || null,
      },
      select: { affiliate_number: true },
    });

    return { ok: true, affiliateNumber: created.affiliate_number };
  } catch {
    return { ok: false, error: "Gagal mengirim pendaftaran. Coba lagi sebentar lagi." };
  }
}

export interface AffiliateLookup {
  code: string;
  fullName: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED";
}

/** For the registration form's live "Kode FIKA7QM2 milik ... ✓" hint. */
export async function findAffiliateByCode(code: string): Promise<AffiliateLookup | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  try {
    // Hanya tiga kolom. Rekening, WhatsApp, dan domisili tidak pernah keluar
    // dari pencarian ini — siapa pun bisa mengetik kode apa saja ke formulir.
    const row = await db.affiliates.findFirst({
      where: { code: { equals: trimmed, mode: "insensitive" } },
      select: { code: true, full_name: true, status: true },
    });
    if (!row || !row.code) return null;
    return {
      code: row.code,
      fullName: row.full_name,
      status: row.status as AffiliateLookup["status"],
    };
  } catch {
    return null;
  }
}
