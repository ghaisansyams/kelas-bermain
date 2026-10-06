import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "STAFF";

export interface AdminSession {
  userId: string;
  email: string;
  fullName: string;
  role: AdminRole;
}

/** Everything an admin page may do is gated on this — never on hidden buttons. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("admin_users")
    .select("full_name, role, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data || data.status !== "ACTIVE") return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: data.full_name || user.email || "Admin",
    role: data.role as AdminRole,
  };
}

/** Redirects to the login page when the visitor is not an active admin. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login?error=unauthorized");
  return session;
}

const RANK: Record<AdminRole, number> = { STAFF: 1, ADMIN: 2, SUPER_ADMIN: 3 };

export function hasRole(role: AdminRole, minimum: AdminRole): boolean {
  return RANK[role] >= RANK[minimum];
}

/** Use inside server actions that STAFF must not reach. */
export async function requireRole(minimum: AdminRole): Promise<AdminSession> {
  const session = await requireAdmin();
  if (!hasRole(session.role, minimum)) redirect("/admin?error=forbidden");
  return session;
}
