import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Database, KeyRound, ShieldAlert } from "lucide-react";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { DefinitionList } from "@/components/admin/detail-tabs";
import { currentSession } from "@/lib/auth/actions";
import { can, permissionsOf, ROLE_LABEL, type Role } from "@/lib/auth/roles";
import { demoUsers } from "@/lib/auth/users";
import { siteConfig } from "@/data/site";
import { galleryDrive } from "@/data/gallery";

export const metadata: Metadata = { title: "Pengaturan" };

const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "STAFF"];

export default async function AdminSettingsPage() {
  const session = await currentSession();
  if (!session) redirect("/admin/login");
  if (!can(session.role, "settings")) {
    return (
      <>
        <AdminPageHeader title="Pengaturan" />
        <Panel>
          <div className="flex items-start gap-3 p-5">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
            <div>
              <p className="text-sm font-bold text-ink">Akses ditolak</p>
              <p className="mt-1 text-sm text-muted">
                Halaman pengaturan hanya bisa dibuka oleh Super Admin. Peran kamu saat ini{" "}
                {ROLE_LABEL[session.role]}.
              </p>
            </div>
          </div>
        </Panel>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Pengaturan"
        description="Konfigurasi sistem dan status integrasi. Perubahan nilai dilakukan lewat berkas data dan variabel lingkungan."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Identitas Situs">
          <DefinitionList
            items={[
              { label: "Nama", value: siteConfig.name },
              { label: "Nama Lengkap", value: siteConfig.legalName },
              { label: "Motto", value: siteConfig.motto },
              { label: "Area Layanan", value: siteConfig.serviceArea },
              { label: "Rentang Usia", value: siteConfig.ageRangeLabel },
              { label: "Email", value: siteConfig.email },
              { label: "URL", value: <span className="font-mono text-xs">{siteConfig.url}</span> },
              { label: "Jam Operasional", value: siteConfig.officeHours },
            ]}
          />
          <p className="border-t border-line px-5 py-3 text-xs text-muted">
            Diubah di <code>src/data/site.ts</code>.
          </p>
        </Panel>

        <Panel title="Peran & Hak Akses">
          <ul className="divide-y divide-line">
            {ROLES.map((role) => (
              <li key={role} className="px-5 py-3.5">
                <p className="text-sm font-bold text-ink">{ROLE_LABEL[role]}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {permissionsOf(role).map((permission) => (
                    <span
                      key={permission}
                      className="rounded-pill bg-canvas-deep px-2 py-0.5 text-[0.6875rem] font-semibold text-ink-soft"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3 text-xs text-muted">
            Diubah di <code>src/lib/auth/roles.ts</code>.
          </p>
        </Panel>

        <Panel title="Status Integrasi">
          <DefinitionList
            items={[
              { label: "Basis Data", value: <IntegrationBadge state="pending" label="Belum terhubung — localStorage" /> },
              { label: "Autentikasi", value: <IntegrationBadge state="pending" label="Mock, akun fixture" /> },
              { label: "Payment Gateway", value: <IntegrationBadge state="pending" label="Mock Gateway" /> },
              { label: "Penyimpanan Objek", value: <IntegrationBadge state="pending" label="Belum terpasang" /> },
              {
                label: "Folder Drive Galeri",
                value: galleryDrive.url ? (
                  <IntegrationBadge state="ready" label="Terhubung" />
                ) : (
                  <IntegrationBadge state="pending" label="Belum diatur" />
                ),
              },
              { label: "Instagram API", value: <IntegrationBadge state="pending" label="Konten statis" /> },
            ]}
          />
        </Panel>

        <Panel title="Akun Demo">
          <ul className="divide-y divide-line">
            {demoUsers.map((user) => (
              <li key={user.username} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                  <p className="truncate font-mono text-xs text-muted">{user.username}</p>
                </div>
                <span className="shrink-0 rounded-pill bg-brand-soft px-2.5 py-1 text-[0.6875rem] font-bold text-brand-ink">
                  {ROLE_LABEL[user.role]}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-2.5 border-t border-line bg-sun-soft/50 px-5 py-3.5">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-sun-dark" aria-hidden />
            <p className="text-xs leading-relaxed text-ink-soft">
              Akun ini fixture tanpa kata sandi terenkripsi. Ganti{" "}
              <code>src/lib/auth/*</code> dengan penyedia autentikasi sungguhan sebelum sistem
              dipakai untuk data asli.
            </p>
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title="Skema Basis Data yang Disiapkan">
        <div className="overflow-x-auto p-4 sm:p-5">
          <pre className="w-max whitespace-pre font-mono text-xs leading-relaxed text-ink-soft">
{`customers.id      -> children.customer_id
customers.id      -> registrations.customer_id
children.id       -> registrations.child_id
events.id         -> registrations.event_id
registrations.id  -> payments.registration_id
registrations.id  -> attendance.registration_id
registrations.id  -> certificates.registration_id
activities.id     -> gallery.activity_id
events.id         -> gallery.event_id`}
          </pre>
        </div>
        <p className="flex items-start gap-2.5 border-t border-line px-5 py-3.5 text-xs text-muted">
          <Database className="mt-0.5 size-4 shrink-0" aria-hidden />
          Tipe setiap tabel ada di <code>src/lib/repositories/types.ts</code>; penggantian
          sumber data cukup di <code>src/lib/repositories/index.ts</code>.
        </p>
      </Panel>
    </>
  );
}

function IntegrationBadge({ state, label }: { state: "ready" | "pending"; label: string }) {
  return (
    <span
      className={
        state === "ready"
          ? "inline-flex items-center rounded-pill bg-pine-soft px-2 py-0.5 text-[0.6875rem] font-bold text-pine-dark"
          : "inline-flex items-center rounded-pill bg-sun-soft px-2 py-0.5 text-[0.6875rem] font-bold text-sun-dark"
      }
    >
      {label}
    </span>
  );
}
