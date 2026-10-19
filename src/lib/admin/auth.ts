import "server-only";

import { redirect } from "next/navigation";
import { getAdminSession, type AdminRole, type AdminSession } from "@/lib/auth/session";

/**
 * Gerbang hak akses admin.
 *
 * Dulu ini membaca Supabase Auth lalu mencocokkan ke admin_users dengan RLS
 * sebagai jaring pengaman di belakangnya. Sekarang tidak ada RLS: Prisma
 * memegang kredensial database penuh, jadi berkas inilah satu-satunya yang
 * memutuskan siapa boleh apa. Setiap halaman admin dan setiap server action
 * harus memanggilnya — tidak ada tombol tersembunyi yang bisa dianggap
 * pengaman.
 */

export type { AdminRole, AdminSession };
export { getAdminSession };

/** Mengalihkan ke halaman masuk kalau pengunjungnya bukan admin aktif. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login?error=unauthorized");
  return session;
}

const RANK: Record<AdminRole, number> = { STAFF: 1, ADMIN: 2, SUPER_ADMIN: 3 };

export function hasRole(role: AdminRole, minimum: AdminRole): boolean {
  return RANK[role] >= RANK[minimum];
}

/** Dipakai di server action yang tidak boleh dijangkau STAFF. */
export async function requireRole(minimum: AdminRole): Promise<AdminSession> {
  const session = await requireAdmin();
  if (!hasRole(session.role, minimum)) redirect("/admin?error=forbidden");
  return session;
}
