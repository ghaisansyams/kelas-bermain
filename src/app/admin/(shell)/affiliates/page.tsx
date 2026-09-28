import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { AffiliatesView } from "@/components/admin/affiliates-view";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { currentSession } from "@/lib/auth/actions";
import { can, ROLE_LABEL } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Affiliate" };

export default async function AdminAffiliatesPage() {
  const session = await currentSession();
  if (!session) redirect("/admin/login");

  if (!can(session.role, "affiliates")) {
    return (
      <>
        <AdminPageHeader title="Affiliate" />
        <Panel>
          <div className="flex items-start gap-3 p-5">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
            <div>
              <p className="text-sm font-bold text-ink">Akses ditolak</p>
              <p className="mt-1 text-sm text-muted">
                Halaman ini hanya bisa dibuka oleh Admin dan Super Admin. Peran kamu saat
                ini {ROLE_LABEL[session.role]}.
              </p>
            </div>
          </div>
        </Panel>
      </>
    );
  }

  return (
    <AffiliatesView verifiedBy={session.name} canSeeBank={session.role === "SUPER_ADMIN"} />
  );
}
