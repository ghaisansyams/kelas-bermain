import "server-only";

import { PrismaClient } from "@prisma/client";

/**
 * Satu klien Prisma untuk seluruh proses.
 *
 * Next.js memuat ulang modul tiap perubahan berkas saat pengembangan. Tanpa
 * penyimpanan di globalThis, setiap muat ulang membuat klien baru lengkap
 * dengan kolam koneksinya sendiri, dan Postgres kehabisan slot koneksi
 * setelah beberapa menit menulis kode.
 *
 * Berkas ini server-only dengan sengaja. Prisma memegang kredensial database
 * penuh — tidak ada RLS yang menjaga di belakangnya seperti dulu — jadi dia
 * tidak boleh ikut terbawa ke bundel browser dalam keadaan apa pun.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
