"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { asAdmin } from "@/lib/admin/actor";
import { requireRole } from "@/lib/admin/auth";
import { hashPassword } from "@/lib/auth/session";
import { db } from "@/lib/db";

const ERRORS: Record<string, string> = {
  USER_NOT_FOUND: "not-found",
  FORBIDDEN: "forbidden",
  INVALID_ROLE: "invalid",
  INVALID_STATUS: "invalid",
  CANNOT_DEMOTE_SELF: "self",
  CANNOT_REVOKE_SELF: "self",
  LAST_SUPER_ADMIN: "last-super",
};

const ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cukup panjang untuk tidak ditebak, cukup pendek untuk diketik. */
const MIN_PASSWORD = 10;

function back(status: string): never {
  redirect(`/admin/users?status=${status}`);
}

function mapError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const key = Object.keys(ERRORS).find((code) => message.includes(code));
  return key ? ERRORS[key] : "error";
}

/**
 * Memberi hak admin, dan membuat akun loginnya kalau belum ada.
 *
 * Akun login disimpan di tabel `users` milik aplikasi sendiri, jadi tidak ada
 * dashboard lain tempat membuatnya — kalau ini tidak bisa membuat akun, tidak
 * ada cara menambah admin sama sekali. Hanya SUPER_ADMIN yang sampai ke sini.
 *
 * Kata sandi awal ditentukan SUPER_ADMIN dan disampaikan langsung ke orangnya.
 * Tidak ada tautan reset lewat email: aplikasi ini tidak punya pengirim email,
 * dan tautan reset yang bisa dibocorkan lebih berbahaya daripada tidak ada.
 */
export async function grantAccessAction(formData: FormData) {
  const session = await requireRole("SUPER_ADMIN");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "STAFF");
  const password = String(formData.get("password") ?? "");

  if (!EMAIL.test(email) || !ROLES.includes(role)) back("invalid");

  let outcome = "granted";
  try {
    const existing = await db.users.findFirst({ where: { email }, select: { id: true } });

    // Akun baru wajib punya kata sandi; akun yang sudah ada tidak diubah
    // kata sandinya lewat jalur ini.
    if (!existing && password.length < MIN_PASSWORD) {
      outcome = "weak-password";
    } else {
      // Dihash di luar transaksi: bcrypt memakan ratusan milidetik, dan
      // menahan transaksi terbuka selama itu menahan koneksi database.
      const hash = existing ? null : await hashPassword(password);

      await db.$transaction(async (tx) => {
        const userId = existing?.id ?? randomUUID();

        if (!existing) {
          await tx.users.create({
            data: {
              id: userId,
              email,
              encrypted_password: hash,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
        }

        await tx.admin_users.upsert({
          where: { user_id: userId },
          create: {
            user_id: userId,
            full_name: fullName || email.split("@")[0],
            role,
            status: "ACTIVE",
          },
          update: { full_name: fullName || undefined, role, status: "ACTIVE" },
        });

        await tx.activity_logs.create({
          data: {
            user_id: session.userId,
            action: existing ? "UPDATE_ADMIN" : "GRANT_ADMIN",
            entity: "admin_users",
            entity_id: userId,
            old_value: Prisma.DbNull,
            // Hanya email dan peran. Tidak pernah kata sandinya, hash-nya
            // pun tidak: log aktivitas dibaca banyak orang.
            new_value: { email, role, createdAccount: !existing },
          },
        });
      });
    }
  } catch {
    outcome = "error";
  }

  if (outcome !== "granted") back(outcome);

  revalidatePath("/admin/users");
  back("granted");
}

export async function updateUserAction(formData: FormData) {
  const session = await requireRole("SUPER_ADMIN");
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  const status = String(formData.get("status") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!UUID.test(userId)) back("error");

  // Fungsi database memeriksa sendiri: tidak boleh menurunkan diri sendiri,
  // dan tidak boleh menghapus Super Admin terakhir.
  let failure: string | null = null;
  try {
    await asAdmin(
      session,
      (tx) =>
        tx.$executeRaw`select admin_update_user(${userId}::uuid, ${role}, ${status}, ${fullName || null})`,
    );

    // Dinonaktifkan: sesi yang sedang berjalan ikut mati sekarang juga.
    if (status === "INACTIVE") await db.sessions.deleteMany({ where: { user_id: userId } });
  } catch (error) {
    failure = mapError(error);
  }
  if (failure) back(failure);

  revalidatePath("/admin/users");
  back("updated");
}

export async function revokeAccessAction(formData: FormData) {
  const session = await requireRole("SUPER_ADMIN");
  const userId = String(formData.get("userId") ?? "");
  if (!UUID.test(userId)) back("error");

  let failure: string | null = null;
  try {
    await asAdmin(session, (tx) => tx.$executeRaw`select admin_revoke_access(${userId}::uuid)`);
    // Mencabut akses harus berlaku seketika, bukan setelah sesinya kedaluwarsa.
    await db.sessions.deleteMany({ where: { user_id: userId } });
  } catch (error) {
    failure = mapError(error);
  }
  if (failure) back(failure);

  revalidatePath("/admin/users");
  back("revoked");
}

/**
 * Mengganti kata sandi seorang admin. Pengganti "lupa kata sandi": tidak ada
 * email pemulihan, jadi Super Admin yang menggantinya langsung.
 *
 * Semua sesi orang itu dihapus. Kata sandi diganti karena dicurigai bocor
 * atau lupa; yang sedang login dengan kata sandi lama tidak boleh tetap masuk.
 */
export async function resetPasswordAction(formData: FormData) {
  const session = await requireRole("SUPER_ADMIN");
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!UUID.test(userId)) back("error");
  if (password.length < MIN_PASSWORD) back("weak-password");

  let failed = false;
  try {
    const hash = await hashPassword(password);
    await db.$transaction([
      db.users.update({
        where: { id: userId },
        data: { encrypted_password: hash, updated_at: new Date() },
      }),
      db.sessions.deleteMany({ where: { user_id: userId } }),
      db.activity_logs.create({
        data: {
          user_id: session.userId,
          action: "RESET_PASSWORD",
          entity: "users",
          entity_id: userId,
          old_value: Prisma.DbNull,
          new_value: Prisma.DbNull,
        },
      }),
    ]);
  } catch {
    failed = true;
  }
  if (failed) back("error");

  revalidatePath("/admin/users");
  back("password-reset");
}
