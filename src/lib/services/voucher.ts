"use server";

/**
 * Pemeriksaan voucher. Katalognya tidak pernah meninggalkan database —
 * browser hanya boleh bertanya "kode ini bisa dipakai untuk keranjang ini?",
 * dan jawabannya dihitung di server.
 *
 * Dulu ini fungsi SECURITY DEFINER. Sekarang server action: syaratnya sama
 * persis, tapi kalau kode ini berjalan di browser, orang tinggal memanggil
 * database langsung dengan diskon karangan sendiri.
 */

import type { VoucherDefinition } from "@/lib/pricing";
import { db } from "@/lib/db";

export type VoucherLookup =
  | { ok: true; voucher: VoucherDefinition }
  | { ok: false; error: string };

const REASON_MESSAGE: Record<string, string> = {
  INVALID: "Kode voucher tidak valid.",
  NOT_STARTED: "Voucher ini belum berlaku.",
  EXPIRED: "Voucher ini sudah kedaluwarsa.",
  EXHAUSTED: "Kuota voucher ini sudah habis.",
  OTHER_EVENT: "Voucher ini tidak berlaku untuk event ini.",
};

export async function lookupVoucher(
  code: string,
  childrenCount: number,
  eventId: string,
): Promise<VoucherLookup> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { ok: false, error: "Masukkan kode voucher." };

  try {
    const voucher = await db.vouchers.findUnique({ where: { code: trimmed } });

    // Urutan pemeriksaan sama persis dengan fungsi SQL yang digantikan.
    // Tanggal dibandingkan pada hari kalender, bukan jam, karena kolomnya
    // bertipe date — voucher yang berlaku "sampai hari ini" harus masih bisa.
    if (!voucher || voucher.status !== "ACTIVE") {
      return { ok: false, error: REASON_MESSAGE.INVALID };
    }

    const today = new Date();
    const asDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

    if (voucher.valid_from && todayDay < asDay(voucher.valid_from)) {
      return { ok: false, error: REASON_MESSAGE.NOT_STARTED };
    }
    if (voucher.valid_until && todayDay > asDay(voucher.valid_until)) {
      return { ok: false, error: REASON_MESSAGE.EXPIRED };
    }
    if (voucher.max_uses !== null && voucher.used_count >= voucher.max_uses) {
      return { ok: false, error: REASON_MESSAGE.EXHAUSTED };
    }
    if (childrenCount < voucher.min_children) {
      return {
        ok: false,
        error: `Voucher ini butuh minimal ${voucher.min_children} anak dalam satu pendaftaran.`,
      };
    }
    if (voucher.event_id !== null && voucher.event_id !== eventId) {
      return { ok: false, error: REASON_MESSAGE.OTHER_EVENT };
    }

    return {
      ok: true,
      voucher: {
        code: voucher.code,
        type: voucher.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        value: Number(voucher.value),
        maxDiscount: voucher.max_discount == null ? null : Number(voucher.max_discount),
        description: voucher.description,
      },
    };
  } catch {
    return { ok: false, error: REASON_MESSAGE.INVALID };
  }
}

/** Mencatat pemakaian setelah baris pendaftaran ada. Sengaja best-effort. */
export async function redeemVoucher(
  code: string,
  registrationId: string,
  amount: number,
): Promise<void> {
  try {
    const trimmed = code.trim().toUpperCase();

    // Satu transaksi dengan baris voucher dikunci. Tanpa kunci, dua orang
    // menebus voucher terakhir pada saat yang sama sama-sama lolos
    // pemeriksaan kuota dan keduanya dapat diskon.
    await db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ code: string; status: string; max_uses: number | null; used_count: number }[]>`
        select code, status, max_uses, used_count from vouchers
         where code = ${trimmed} for update`;
      const voucher = locked[0];
      if (!voucher || voucher.status !== "ACTIVE") return;
      if (voucher.max_uses !== null && voucher.used_count >= voucher.max_uses) return;

      const inserted = await tx.voucher_redemptions.createMany({
        data: [{ voucher_code: voucher.code, registration_id: registrationId, amount }],
        skipDuplicates: true,
      });

      // Hanya menaikkan hitungan kalau penebusannya benar-benar baru;
      // pemanggilan ulang tidak boleh menghabiskan kuota dua kali.
      if (inserted.count > 0) {
        await tx.vouchers.update({
          where: { code: voucher.code },
          data: { used_count: { increment: 1 } },
        });
      }
    });
  } catch {
    // Penebusan yang gagal tidak boleh menggagalkan pendaftaran yang sudah ada.
  }
}
