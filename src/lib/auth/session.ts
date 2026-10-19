import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * Sesi admin, menggantikan Supabase Auth.
 *
 * Bentuknya sederhana karena kebutuhannya sederhana: hanya admin yang login,
 * orang tua tidak pernah punya akun. Satu baris di tabel `sessions`, dirujuk
 * oleh cookie httpOnly. Tidak ada JWT — token yang bisa dibaca browser berarti
 * token yang tidak bisa dicabut, dan mencabut akses admin harus bisa seketika.
 *
 * Hash passwordnya bcrypt, format yang sama dengan yang dipakai Supabase, dan
 * hash lama ikut pindah saat migrasi. Jadi password yang sudah ada tetap
 * berlaku — tidak ada admin yang terkunci di luar setelah pindah.
 *
 * Yang hilang bersama Supabase Auth dan TIDAK digantikan di sini: reset
 * password lewat email, OAuth, dan MFA. Tidak ada satu pun yang dipakai
 * sistem ini sebelumnya.
 */

const COOKIE = "kb_session";
/** Sepanjang hari kerja, bukan sebulan: ini membuka akses ke uang. */
const MAX_AGE_SECONDS = 60 * 60 * 12;

export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "STAFF";

export interface AdminSession {
  userId: string;
  email: string;
  fullName: string;
  role: AdminRole;
}

/* ------------------------------------------------------------------ */
/* Password                                                            */
/* ------------------------------------------------------------------ */

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    // Hash rusak atau format tak dikenal: itu gagal, bukan lolos.
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Masuk dan keluar                                                    */
/* ------------------------------------------------------------------ */

export type SignInResult = { ok: true } | { ok: false; error: string };

export async function signIn(
  email: string,
  password: string,
  userAgent?: string,
): Promise<SignInResult> {
  const trimmed = email.trim().toLowerCase();

  const user = await db.users.findFirst({
    where: { email: trimmed },
    select: { id: true, encrypted_password: true },
  });

  // Tetap jalankan bcrypt walau penggunanya tidak ada. Membalas cepat untuk
  // email yang tidak terdaftar memberi tahu penebak mana email yang nyata.
  const hash = user?.encrypted_password ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const passwordOk = await verifyPassword(password, hash);

  if (!user || !passwordOk) {
    return { ok: false, error: "Email atau kata sandi salah." };
  }

  // Hak admin tinggal di tabel terpisah: punya akun bukan berarti boleh masuk.
  const admin = await db.admin_users.findFirst({
    where: { user_id: user.id, status: "ACTIVE" },
    select: { full_name: true, role: true },
  });

  if (!admin) {
    return { ok: false, error: "Akun ini tidak punya akses admin." };
  }

  const id = randomUUID();
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);

  await db.sessions.create({
    data: { id, user_id: user.id, expires_at: expiresAt, user_agent: userAgent?.slice(0, 255) },
  });

  const jar = await cookies();
  jar.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return { ok: true };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;

  if (id) {
    // Dihapus dari database, bukan hanya dari browser. Cookie yang terlanjur
    // disalin orang lain harus ikut mati.
    await db.sessions.deleteMany({ where: { id } }).catch(() => {});
  }

  jar.delete(COOKIE);
}

/* ------------------------------------------------------------------ */
/* Membaca sesi                                                        */
/* ------------------------------------------------------------------ */

export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;

  const session = await db.sessions.findUnique({
    where: { id },
    select: {
      expires_at: true,
      users: {
        select: {
          id: true,
          email: true,
          admin_users: { select: { full_name: true, role: true, status: true } },
        },
      },
    },
  });

  if (!session) return null;

  if (session.expires_at.getTime() < Date.now()) {
    await db.sessions.deleteMany({ where: { id } }).catch(() => {});
    return null;
  }

  const admin = session.users.admin_users;
  // Hak dicabut atau akun dinonaktifkan: sesi yang sudah telanjur ada tidak
  // boleh tetap berlaku sampai kedaluwarsa sendiri.
  if (!admin || admin.status !== "ACTIVE") return null;

  return {
    userId: session.users.id,
    email: session.users.email ?? "",
    fullName: admin.full_name || session.users.email || "Admin",
    role: admin.role as AdminRole,
  };
}

/** Membuang sesi yang sudah lewat masa berlakunya. Dipanggil saat login. */
export async function pruneExpiredSessions(): Promise<void> {
  await db.sessions.deleteMany({ where: { expires_at: { lt: new Date() } } }).catch(() => {});
}
