import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { PAYMENT_PROOF_DIR } from "@/lib/config/storage";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/utils/format";

/**
 * Penghapusan data pendaftaran sampai ke akarnya.
 *
 * Satu pendaftaran punya ekor: pembayaran, bukti transfer, kehadiran,
 * sertifikat, pemakaian voucher, dan catatan keuangan. Kalau salah satu
 * tertinggal, laporan keuangan atau kuota event tetap menghitung data yang
 * sudah tidak ada. Semua dihapus di sini, di dalam satu transaksi, supaya
 * hasilnya selalu semuanya atau tidak sama sekali.
 */

type Tx = Prisma.TransactionClient;

export interface DeletionStats {
  registrations: number;
  payments: number;
  paidPayments: number;
  paidTotal: number;
  certificates: number;
}

export const emptyStats = (): DeletionStats => ({
  registrations: 0,
  payments: 0,
  paidPayments: 0,
  paidTotal: 0,
  certificates: 0,
});

/** Kolom yang menentukan siapa pemilik sebuah pendaftaran. */
export type OwnerField = "customer_id" | "child_id" | "event_id";

/**
 * Hitungan per pemilik untuk daftar yang sedang ditampilkan: dua kueri untuk
 * seluruh halaman, bukan satu per baris.
 */
export async function statsByOwner(
  field: OwnerField,
  ids: string[],
): Promise<Map<string, DeletionStats>> {
  const result = new Map<string, DeletionStats>();
  if (ids.length === 0) return result;

  const rows = await db.registrations.findMany({
    where: { [field]: { in: ids } } as Prisma.registrationsWhereInput,
    select: {
      customer_id: true,
      child_id: true,
      event_id: true,
      payments: { select: { amount: true, status: true } },
      certificates: { select: { number: true } },
    },
  });

  for (const row of rows) {
    const key = row[field];
    const stats = result.get(key) ?? emptyStats();
    stats.registrations += 1;
    stats.payments += row.payments.length;
    for (const payment of row.payments) {
      if (payment.status === "PAID") {
        stats.paidPayments += 1;
        stats.paidTotal += Number(payment.amount);
      }
    }
    stats.certificates += row.certificates.length;
    result.set(key, stats);
  }
  return result;
}

/** Daftar "ikut terhapus" untuk dialog konfirmasi. */
export function describeStats(stats: DeletionStats | undefined): string[] {
  if (!stats || stats.registrations === 0) return [];
  const lines = [`${stats.registrations} pendaftaran anak beserta catatan kehadirannya`];
  if (stats.payments > 0) {
    lines.push(
      stats.paidPayments > 0
        ? `${stats.payments} pembayaran, termasuk ${stats.paidPayments} yang sudah lunas (${formatRupiah(stats.paidTotal)}) — angka itu hilang dari laporan keuangan`
        : `${stats.payments} pembayaran yang belum lunas`,
    );
  }
  if (stats.certificates > 0) lines.push(`${stats.certificates} sertifikat yang sudah terbit`);
  return lines;
}

/** Cocok tanpa peduli huruf besar-kecil dan spasi di ujung. */
export function confirmationMatches(typed: unknown, expected: string): boolean {
  return String(typed ?? "").trim().toLowerCase() === expected.trim().toLowerCase();
}

/**
 * Menghapus pendaftaran beserta seluruh ekornya, di dalam transaksi milik
 * pemanggil. Mengembalikan berkas bukti transfer yang harus dihapus dari disk
 * SETELAH transaksi berhasil: berkas tidak ikut digulung kalau transaksinya
 * gagal, jadi tidak boleh dihapus lebih dulu.
 */
export async function deleteRegistrations(
  tx: Tx,
  registrationIds: string[],
): Promise<{ stats: DeletionStats; proofFiles: string[] }> {
  const stats = emptyStats();
  if (registrationIds.length === 0) return { stats, proofFiles: [] };

  const payments = await tx.payments.findMany({
    where: { registration_id: { in: registrationIds } },
    select: { id: true, amount: true, status: true, proof_url: true },
  });
  const redemptions = await tx.voucher_redemptions.findMany({
    where: { registration_id: { in: registrationIds } },
    select: { voucher_code: true },
  });

  stats.registrations = registrationIds.length;
  stats.payments = payments.length;
  stats.certificates = await tx.certificates.count({
    where: { registration_id: { in: registrationIds } },
  });
  for (const payment of payments) {
    if (payment.status === "PAID") {
      stats.paidPayments += 1;
      stats.paidTotal += Number(payment.amount);
    }
  }

  // Catatan keuangan merujuk ke pendaftaran atau ke pembayarannya.
  await tx.financial_transactions.deleteMany({
    where: { reference_id: { in: [...registrationIds, ...payments.map((payment) => payment.id)] } },
  });

  // Voucher yang dipakai pendaftaran ini kembali bisa dipakai.
  const perVoucher = new Map<string, number>();
  for (const redemption of redemptions) {
    perVoucher.set(redemption.voucher_code, (perVoucher.get(redemption.voucher_code) ?? 0) + 1);
  }
  for (const [code, used] of perVoucher) {
    await tx.$executeRaw`update vouchers set used_count = greatest(used_count - ${used}, 0) where code = ${code}`;
  }

  // Pembayaran, kehadiran, sertifikat, dan catatan voucher ikut terhapus lewat
  // ON DELETE CASCADE dari pendaftaran.
  await tx.payments.deleteMany({ where: { registration_id: { in: registrationIds } } });
  await tx.registrations.deleteMany({ where: { id: { in: registrationIds } } });

  return {
    stats,
    proofFiles: payments.map((payment) => payment.proof_url).filter((name): name is string => Boolean(name)),
  };
}

/** Menghapus berkas bukti transfer dari disk; yang sudah tidak ada dilewati. */
export async function removeProofFiles(names: string[]): Promise<void> {
  const dir = path.resolve(PAYMENT_PROOF_DIR);
  for (const name of names) {
    // Hanya nama berkas biasa di dalam folder bukti: tidak ada jalur, tidak
    // ada "..", jadi tidak mungkin menyentuh berkas lain.
    if (!/^[0-9a-f-]{36}\.(png|jpe?g|webp|pdf)$/i.test(name)) continue;
    try {
      await fs.unlink(path.join(dir, path.basename(name)));
    } catch {
      /* sudah tidak ada */
    }
  }
}
