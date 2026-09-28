"use client";

import Link from "next/link";
import { ArrowLeft, Baby, Mail, MapPin, Phone } from "lucide-react";
import { AdminPageHeader, DataTable, Panel, StatCard, StatusBadge, type Column } from "@/components/admin/ui";
import { DefinitionList, DetailTabs } from "@/components/admin/detail-tabs";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCollection } from "@/hooks/use-collection";
import { childrenRepo, customersRepo } from "@/lib/repositories";
import type { Child } from "@/lib/repositories/types";
import { sourceLabel } from "@/lib/repositories/types";
import { getPaymentRows, getRegistrationRows, type PaymentRow, type RegistrationRow } from "@/lib/services/admin";
import { formatDate, formatDateShort } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";
import { ageOfChild } from "@/lib/utils/age";

export function CustomerDetailView({ customerId }: { customerId: string }) {
  const { data, loading } = useCollection(async () => {
    const customer = customersRepo.find(customerId);
    if (!customer) return null;
    const kids = childrenRepo.where((c) => c.customerId === customer.id);
    const registrations = (await getRegistrationRows()).filter(
      (r) => r.registration.customerId === customer.id,
    );
    const payments = (await getPaymentRows()).filter((p) => p.payment.customerId === customer.id);
    return { customer, kids, registrations, payments };
  }, [customerId]);

  if (loading) {
    return <div className="shimmer h-64 rounded-xl bg-line-soft" />;
  }
  if (!data) {
    return (
      <EmptyState
        title="Customer tidak ditemukan"
        description={`Tidak ada data untuk id ${customerId}.`}
        action={
          <Link href="/admin/customers" className={buttonStyles()}>
            Kembali ke daftar
          </Link>
        }
      />
    );
  }

  const { customer, kids, registrations, payments } = data;
  const totalPaid = payments
    .filter((p) => p.payment.status === "PAID")
    .reduce((sum, p) => sum + p.payment.amount, 0);

  const childColumns: Column<Child>[] = [
    {
      key: "number",
      header: "Child ID",
      render: (child) => (
        <Link href={`/admin/children/${child.id}`} className="font-mono text-xs font-bold text-brand hover:underline">
          {child.childNumber}
        </Link>
      ),
    },
    { key: "name", header: "Nama", render: (child) => <span className="font-semibold text-ink">{child.fullName}</span> },
    { key: "age", header: "Usia", render: (child) => <span className="tabular-nums">{ageOfChild(child) ?? "—"}</span> },
    { key: "gender", header: "L/P", render: (child) => (child.gender === "L" ? "Laki-laki" : child.gender === "P" ? "Perempuan" : "—") },
    { key: "school", header: "Sekolah", hideBelow: "md", render: (child) => <span className="text-xs">{child.school}</span> },
    { key: "notes", header: "Catatan", hideBelow: "lg", render: (child) => <span className="text-xs text-muted">{child.specialNotes ?? "—"}</span> },
  ];

  const regColumns: Column<RegistrationRow>[] = [
    { key: "number", header: "No. Pendaftaran", render: (r) => <span className="whitespace-nowrap font-mono text-xs font-bold">{r.registration.registrationNumber}</span> },
    { key: "child", header: "Anak", render: (r) => r.child?.fullName ?? "—" },
    { key: "event", header: "Event", render: (r) => <span className="block max-w-[11rem] truncate text-xs">{r.event?.title ?? "—"}</span> },
    { key: "date", header: "Tanggal", hideBelow: "md", render: (r) => <span className="whitespace-nowrap text-xs text-muted">{formatDateShort(r.registration.registrationDate)}</span> },
    { key: "payment", header: "Bayar", render: (r) => <StatusBadge status={r.registration.paymentStatus} /> },
    { key: "attendance", header: "Hadir", hideBelow: "md", render: (r) => <StatusBadge status={r.registration.attendanceStatus} /> },
    { key: "cert", header: "Sertifikat", hideBelow: "lg", render: (r) => <StatusBadge status={r.registration.certificateStatus} /> },
  ];

  const payColumns: Column<PaymentRow>[] = [
    { key: "number", header: "Payment ID", render: (p) => <span className="whitespace-nowrap font-mono text-xs font-bold">{p.payment.paymentNumber}</span> },
    { key: "event", header: "Event", render: (p) => <span className="block max-w-[11rem] truncate text-xs">{p.event?.title ?? "—"}</span> },
    { key: "amount", header: "Nominal", render: (p) => <span className="whitespace-nowrap tabular-nums">{formatRupiah(p.payment.amount)}</span> },
    { key: "method", header: "Metode", hideBelow: "md", render: (p) => <StatusBadge status={p.payment.method} /> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.payment.status} /> },
    { key: "date", header: "Tanggal", hideBelow: "lg", render: (p) => <span className="whitespace-nowrap text-xs text-muted">{formatDateShort(p.payment.createdAt)}</span> },
  ];

  return (
    <>
      <AdminPageHeader
        breadcrumb={[{ href: "/admin/customers", label: "Orang Tua" }]}
        title={customer.fullName}
        description={
          <span className="font-mono text-xs">{customer.customerNumber}</span>
        }
        actions={
          <Link href="/admin/customers" className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <ArrowLeft className="size-4" aria-hidden />
            Kembali
          </Link>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <StatCard label="Anak" value={String(kids.length)} icon={<Baby className="size-4" aria-hidden />} tone="sun" />
        <StatCard label="Pendaftaran" value={String(registrations.length)} tone="pine" />
        <StatCard label="Total Dibayar" value={formatRupiah(totalPaid)} tone="brand" />
        <StatCard label="Status" value={customer.status === "active" ? "Aktif" : "Nonaktif"} tone="neutral" />
      </div>

      <DetailTabs
        tabs={[
          {
            key: "profile",
            label: "Profil",
            content: (
              <Panel title="Data Orang Tua">
                <DefinitionList
                  items={[
                    { label: "Nomor Customer", value: <span className="font-mono">{customer.customerNumber}</span> },
                    { label: "Nama Pendamping", value: customer.fullName },
                    { label: "WhatsApp", value: <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5 text-muted" aria-hidden />{customer.whatsapp}</span> },
                    { label: "Domisili", value: <span className="inline-flex items-center gap-1.5 text-right"><MapPin className="size-3.5 shrink-0 text-muted" aria-hidden />{customer.domicile || customer.city || "—"}</span> },
                    // Email, street address and occupation are no longer asked
                    // for at sign-up (PRD v2.0, R-02); only show what exists.
                    ...(customer.email
                      ? [{ label: "Email", value: <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5 text-muted" aria-hidden />{customer.email}</span> }]
                      : []),
                    ...(customer.address ? [{ label: "Alamat", value: customer.address }] : []),
                    ...(customer.occupation && customer.occupation !== "—"
                      ? [{ label: "Pekerjaan", value: customer.occupation }]
                      : []),
                    { label: "Sumber", value: sourceLabel[customer.source] },
                    { label: "Terdaftar", value: formatDate(customer.createdAt) },
                    { label: "Diperbarui", value: formatDate(customer.updatedAt) },
                  ]}
                />
              </Panel>
            ),
          },
          {
            key: "children",
            label: "Anak",
            count: kids.length,
            content: (
              <Panel>
                <DataTable rows={kids} columns={childColumns} getKey={(c) => c.id} caption="Anak dari customer ini" />
              </Panel>
            ),
          },
          {
            key: "registrations",
            label: "Pendaftaran",
            count: registrations.length,
            content: (
              <Panel>
                <DataTable rows={registrations} columns={regColumns} getKey={(r) => r.registration.id} caption="Riwayat pendaftaran" />
              </Panel>
            ),
          },
          {
            key: "payments",
            label: "Pembayaran",
            count: payments.length,
            content: (
              <Panel>
                <DataTable rows={payments} columns={payColumns} getKey={(p) => p.payment.id} caption="Riwayat pembayaran" />
              </Panel>
            ),
          },
        ]}
      />
    </>
  );
}
