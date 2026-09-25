import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { currentSession, logout } from "@/lib/auth/actions";

export const metadata: Metadata = {
  title: {
    default: "Kelas Bermain Management",
    template: "%s · Kelas Bermain Management",
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await currentSession();
  // Middleware already gates this; the check keeps the type narrow and covers
  // any future route that slips past the matcher.
  if (!session) redirect("/admin/login");

  return (
    <AdminShell
      user={{ name: session.name, role: session.role }}
      logoutAction={logout}
    >
      {children}
    </AdminShell>
  );
}
