"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader, DataTable, Panel, StatCard, StatusBadge, type Column } from "@/components/admin/ui";
import { DefinitionList, DetailTabs } from "@/components/admin/detail-tabs";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCollection } from "@/hooks/use-collection";
import { certificatesRepo, childrenRepo, customersRepo } from "@/lib/repositories";
import type { CertificateRecord } from "@/lib/repositories/types";
import { getRegistrationRows, type RegistrationRow } from "@/lib/services/admin";
import { formatDate, formatDateShort } from "@/lib/utils/date";
import { certificatesEnabled } from "@/lib/features";
import { cn } from "@/lib/utils/cn";
import { ageOfChild } from "@/lib/utils/age";

export function ChildDetailView({ childId }: { childId: string }) {
  const { data, loading } = useCollection(async () => {
    const child = childrenRepo.find(childId);
    if (!child) return null;
    const parent = customersRepo.find(child.customerId);
    const registrations = (await getRegistrationRows()).filter(
      (r) => r.registration.childId === child.id,
    );
    const certs = certificatesRepo.where((c) => c.childId === child.id);
    return { child, parent, registrations, certs };
  }, [childId]);

  if (loading) return <div className="shimmer h-64 rounded-xl bg-line-soft" />;
  if (!data) {
    return (
      <EmptyState
        title="Data anak tidak ditemukan"
        description={`Tidak ada data untuk id ${childId}.`}
        action={
          <Link href="/admin/children" className={buttonStyles()}>
            Kembali ke daftar
          </Link>
        }
      />
    );
  }

  const { child, parent, registrations, certs } = data;
  const attended = registrations.filter((r) => r.registration.attendanceStatus === "PRESENT").length;
  const age = ageOfChild(child);

  const regColumns: Column<RegistrationRow>[] = [
    { key: "number", header: "No. Pendaftaran", render: (r) => <span className="whitespace-nowrap font-mono text-xs font-bold">{r.registration.registrationNumber}</span> },
    { key: "event", header: "Event", render: (r) => <span className="block max-w-[12rem] truncate text-xs">{r.event?.title ?? "—"}</span> },
    { key: "date", header: "Tanggal", hideBelow: "md", render: (r) => <span className="whitespace-nowrap text-xs text-muted">{formatDateShort(r.registration.registrationDate)}</span> },
    { key: "payment", header: "Bayar", render: (r) => <StatusBadge status={r.registration.paymentStatus} /> },
    { key: "attendance", header: "Hadir", render: (r) => <StatusBadge status={r.registration.attendanceStatus} /> },
    { key: "cert", header: "Sertifikat", hideBelow: "md", render: (r) => <StatusBadge status={r.registration.certificateStatus} /> },
  ];

  const certColumns: Column<CertificateRecord>[] = [
    {
      key: "number",
      header: "Nomor",
      render: (c) => (
        <Link href={`/certificate/${c.number}`} className="whitespace-nowrap font-mono text-xs font-bold text-brand hover:underline">
          {c.number}
        </Link>
      ),
    },
    { key: "event", header: "Event", render: (c) => <span className="block max-w-[12rem] truncate text-xs">{c.eventTitle}</span> },
    { key: "date", header: "Tanggal Event", hideBelow: "md", render: (c) => <span className="whitespace-nowrap text-xs text-muted">{formatDateShort(c.eventDate)}</span> },
    { key: "issued", header: "Terbit", hideBelow: "md", render: (c) => <span className="whitespace-nowrap text-xs text-muted">{formatDateShort(c.issuedAt)}</span> },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
  ];

  return (
    <>
      <AdminPageHeader
        breadcrumb={[{ href: "/admin/children", label: "Anak" }]}
        title={child.fullName}
        description={<span className="font-mono text-xs">{child.childNumber}</span>}
        actions={
          <Link href="/admin/children" className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <ArrowLeft className="size-4" aria-hidden />
            Kembali
          </Link>
        }
      />

      <div className={cn("mb-4 grid gap-3", certificatesEnabled ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
        <StatCard label="Usia" value={age === null ? "—" : `${age} th`} tone="sun" />
        <StatCard label="Kelas Diikuti" value={String(registrations.length)} tone="pine" />
        <StatCard label="Kehadiran" value={String(attended)} tone="sky" />
        {certificatesEnabled ? (
          <StatCard label="Sertifikat" value={String(certs.length)} tone="grape" />
        ) : null}
      </div>

      <DetailTabs
        tabs={[
          {
            key: "profile",
            label: "Profil",
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Data Anak">
                  <DefinitionList
                    items={[
                      { label: "Nomor Anak", value: <span className="font-mono">{child.childNumber}</span> },
                      { label: "Nama Lengkap", value: child.fullName },
                      { label: "Nama Panggilan", value: child.nickname },
                      // Gender, birthday, school and grade left the sign-up
                      // form in PRD v2.0 (R-02); show them only when known.
                      { label: "Jenis Kelamin", value: child.gender === "L" ? "Laki-laki" : child.gender === "P" ? "Perempuan" : "Tidak dicatat" },
                      { label: "Tanggal Lahir", value: child.dateOfBirth ? formatDate(child.dateOfBirth) : "Tidak dicatat" },
                      { label: "Usia", value: age === null ? "Tidak dicatat" : `${age} tahun` },
                      { label: "Sekolah", value: child.school || "Tidak dicatat" },
                      { label: "Kelas", value: child.grade || "—" },
                      { label: "Catatan Khusus", value: child.specialNotes ?? "—" },
                      { label: "Kontak Darurat", value: child.emergencyContact },
                    ]}
                  />
                </Panel>
                <Panel title="Orang Tua / Wali">
                  {parent ? (
                    <DefinitionList
                      items={[
                        {
                          label: "Nama",
                          value: (
                            <Link href={`/admin/customers/${parent.id}`} className="text-brand hover:underline">
                              {parent.fullName}
                            </Link>
                          ),
                        },
                        { label: "Nomor Customer", value: <span className="font-mono">{parent.customerNumber}</span> },
                        { label: "WhatsApp", value: parent.whatsapp },
                        { label: "Domisili", value: parent.domicile || parent.city || "—" },
                        // Email and street address are no longer asked for at
                        // sign-up (PRD v2.0, R-02); show them only when known.
                        ...(parent.email ? [{ label: "Email", value: parent.email }] : []),
                        ...(parent.address ? [{ label: "Alamat", value: parent.address }] : []),
                      ]}
                    />
                  ) : (
                    <p className="p-5 text-sm text-muted">Data orang tua tidak ditemukan.</p>
                  )}
                </Panel>
              </div>
            ),
          },
          {
            key: "registrations",
            label: "Kelas Diikuti",
            count: registrations.length,
            content: (
              <Panel>
                <DataTable rows={registrations} columns={regColumns} getKey={(r) => r.registration.id} caption="Kelas yang diikuti anak" />
              </Panel>
            ),
          },
          ...(certificatesEnabled
            ? [
                {
                  key: "certificates",
                  label: "Sertifikat",
                  count: certs.length,
                  content: (
                    <Panel>
                      <DataTable rows={certs} columns={certColumns} getKey={(c) => c.number} caption="Sertifikat anak" />
                    </Panel>
                  ),
                },
              ]
            : []),
        ]}
      />
    </>
  );
}
