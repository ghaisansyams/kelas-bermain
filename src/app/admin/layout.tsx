import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Renders the admin chrome only for signed-in admins. Pages still call
 * `requireAdmin()` themselves — this layout is presentation, not the gate.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) return <>{children}</>;
  return <AdminShell session={session}>{children}</AdminShell>;
}
