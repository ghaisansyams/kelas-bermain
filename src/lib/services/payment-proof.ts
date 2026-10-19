"use server";

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Orang tua menyerahkan bukti transfer.
 *
 * Batas yang tidak boleh dilanggar: ini hanya bisa memindahkan pembayaran ke
 * WAITING_VERIFICATION, tidak pernah ke PAID. Membiarkan browser melunasi
 * pembayarannya sendiri mengubah "saya sudah transfer" jadi "saya mengetik
 * satu permintaan jaringan". Admin yang memutuskan.
 *
 * Dulu aturan itu dijaga fungsi SECURITY DEFINER yang tidak mengizinkan nilai
 * lain. Sekarang dijaga berkas ini — dan berkas ini berjalan di server, jadi
 * tidak ada jalan memanggilnya dengan status karangan sendiri.
 *
 * Berkasnya mendarat di disk, bukan Supabase Storage. Di luar public/ dengan
 * sengaja: tangkapan layar aplikasi bank orang tidak boleh jadi URL yang bisa
 * ditebak siapa pun.
 */

const UPLOAD_DIR = process.env.PAYMENT_PROOF_DIR || "storage/bukti-pembayaran";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export type ProofResult = { ok: true } | { ok: false; error: string };

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function uploadPaymentProof(token: string, file: File): Promise<ProofResult> {
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, error: "Kirim foto (JPG, PNG, WEBP) atau PDF." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Ukuran berkas maksimal 5 MB." };
  }

  try {
    // Nama acak, bukan nama asli berkasnya: nama unggahan datang dari
    // pengguna dan bisa berisi jalur yang menembus keluar folder.
    const name = `${randomUUID()}.${EXTENSION[file.type]}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));

    return await submitProof(token, name);
  } catch {
    return { ok: false, error: "Berkas gagal diunggah. Coba lagi atau kirim lewat WhatsApp." };
  }
}

/** Mencatat klaim tanpa berkas — untuk "sudah saya kirim lewat WhatsApp". */
export async function submitProof(token: string, proofPath?: string): Promise<ProofResult> {
  try {
    const registration = await db.registrations.findFirst({
      where: { access_token: token },
      select: { id: true, payments: { select: { id: true, status: true }, take: 1 } },
    });

    if (!registration) return { ok: false, error: "Pendaftaran tidak ditemukan." };

    const payment = registration.payments[0];
    if (!payment) return { ok: false, error: "Belum ada tagihan untuk pendaftaran ini." };

    // Sudah lunas, dibatalkan atau direfund: tidak ada yang perlu diklaim,
    // dan membuka kembali baris lunas membatalkan keputusan admin.
    if (["PAID", "REFUNDED", "CANCELLED"].includes(payment.status)) {
      return { ok: true };
    }

    await db.$transaction([
      db.payments.update({
        where: { id: payment.id },
        data: {
          status: "WAITING_VERIFICATION",
          ...(proofPath ? { proof_url: proofPath } : {}),
          proof_submitted_at: new Date(),
          // Bukti baru menghapus penolakan lama, supaya admin melihatnya
          // sebagai antrean baru dan bukan kasus yang sudah selesai.
          rejected_at: null,
          rejection_reason: null,
        },
      }),
      db.registrations.update({
        where: { id: registration.id },
        data: { payment_status: "WAITING_VERIFICATION" },
      }),
      db.activity_logs.create({
        data: {
          action: "PAYMENT_PROOF_SENT",
          entity: "payments",
          entity_id: payment.id,
          old_value: { status: payment.status },
          new_value: { status: "WAITING_VERIFICATION", hasFile: Boolean(proofPath) },
        },
      }),
    ]);

    return { ok: true };
  } catch {
    return { ok: false, error: "Status belum bisa diperbarui. Coba muat ulang halaman." };
  }
}
