import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AdminSession } from "@/lib/admin/auth";

/**
 * Menjalankan fungsi database admin atas nama seorang admin.
 *
 * Fungsi admin_* (konfirmasi pembayaran, refund, terbitkan sertifikat,
 * publikasi CMS) memeriksa is_admin() DI DALAM database, dan pemeriksaan itu
 * sengaja dipertahankan: hak akses dijaga dua lapis, jadi satu pemanggil yang
 * lupa memeriksa di aplikasi tidak membuka lubang.
 *
 * is_admin() bertanya "siapa yang sedang bertindak" lewat auth.uid(), yang
 * kini membaca pengaturan app.user_id. Pengaturan itu hanya berlaku di dalam
 * SATU transaksi (set_config dengan is_local = true), dan karena itu fungsi ini
 * membungkus semuanya dalam transaksi. Tanpa transaksi, pengaturan itu bisa
 * bocor ke permintaan lain yang kebetulan memakai koneksi yang sama dan
 * bertindak atas nama admin yang salah.
 *
 * Wajib menerima AdminSession, bukan string id: satu-satunya cara mendapatkan
 * session adalah requireAdmin(), jadi memanggil ini tanpa lolos pemeriksaan
 * hak akses tidak akan lolos kompilasi.
 */
export async function asAdmin<T>(
  session: AdminSession,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.user_id', ${session.userId}, true)`;
    return work(tx);
  });
}
