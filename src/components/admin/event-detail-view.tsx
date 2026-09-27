"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ExternalLink, QrCode } from "lucide-react";
import { AdminPageHeader, DataTable, Panel, StatCard, StatusBadge, type Column } from "@/components/admin/ui";
import { DefinitionList, DetailTabs } from "@/components/admin/detail-tabs";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCollection } from "@/hooks/use-collection";
import { certificatesRepo } from "@/lib/repositories";
import type { CertificateRecord } from "@/lib/repositories/types";
import { events } from "@/data/events";
import { getPaymentRows, getRegistrationRows, type PaymentRow, type RegistrationRow } from "@/lib/services/admin";
import { registrationPath } from "@/lib/services/qr";
import { formatDate, formatDateRange, formatDateShort } from "@/lib/utils/date";
import { formatRupiah, formatTimeRange } from "@/lib/utils/format";
import { certificatesEnabled } from "@/lib/features";
import { cn } from "@/lib/utils/cn";

export function EventDetailView({ eventId }: { eventId: string }) {
  const { data, loading } = useCollection(async () => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return null;
    const registrations = (await getRegistrationRows()).filter(
      (r) => r.registration.eventId === event.id,
    );
    const payments = (await getPaymentRows()).filter((p) => p.payment.eventId === event.id);
    const certs = certificatesRepo.where((c) => c.eventId === event.id);
    return { event, registrations, payments, certs };
  }, [eventId]);

  if (loading) return <div className="shimmer h-64 rounded-xl bg-line-soft" />;
  if (!data) {
    return (
      <EmptyState
        title="Event tidak ditemukan"
        description={`Tidak ada event dengan id ${eventId}.`}
        action={
          <Link href="/admin/events" className={buttonStyles()}>
            Kembali ke daftar
          </Link>
        }
      />
    );
  }

  const { event, registrations, payments, certs } = data;
  const paid = payments.filter((p) => p.payment.status === "PAID");
  const attended = registrations.filter((r) => r.registration.attendanceStatus === "PRESENT").length;
  const revenue = paid.reduce((sum, p) => sum + p.payment.amount, 0);

  const regColumns: Column<RegistrationRow>[] = [
    { key: "number", header: "No. Pendaftaran", render: (r) => <span className="whitespace-nowrap font-mono text-xs font-bold">{r.registration.registrationNumber}</span> },
    { key: "child", header: "Anak", render: (r) => r.child?.fullName ?? "—" },
    { key: "parent", header: "Orang Tua", hideBelow: "md", render: (r) => <span className="text-xs">{r.customer?.fullName ?? "—"}</span> },
    { key: "payment", header: "Bayar", render: (r) => <StatusBadge status={r.registration.paymentStatus} /> },
    { key: "attendance", header: "Hadir", render: (r) => <StatusBadge status={r.registration.attendanceStatus} /> },
    { key: "date", header: "Tanggal", hideBelow: "lg", render: (r) => <span className="whitespace-nowrap text-xs text-muted">{formatDateShort(r.registration.registrationDate)}</span> },
  ];

  const payColumns: Column<PaymentRow>[] = [
    { key: "number", header: "Payment ID", render: (p) => <span className="whitespace-nowrap font-mono text-xs font-bold">{p.payment.paymentNumber}</span> },
    { key: "customer", header: "Customer", render: (p) => p.customer?.fullName ?? "—" },
    { key: "amount", header: "Nominal", render: (p) => <span className="whitespace-nowrap tabular-nums">{formatRupiah(p.payment.amount)}</span> },
    { key: "method", header: "Metode", hideBelow: "md", render: (p) => <StatusBadge status={p.payment.method} /> },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.payment.status} /> },
  ];

  const certColumns: Column<CertificateRecord>[] = [
    { key: "number", header: "Nomor", render: (c) => <Link href={`/certificate/${c.number}`} className="whitespace-nowrap font-mono text-xs font-bold text-brand hover:underline">{c.number}</Link> },
    { key: "participant", header: "Peserta", render: (c) => c.participantName },
    { key: "issued", header: "Terbit", hideBelow: "md", render: (c) => <span className="whitespace-nowrap text-xs text-muted">{formatDateShort(c.issuedAt)}</span> },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
  ];

  const isFree = event.registration.type === "FREE";

  return (
    <>
      <AdminPageHeader
        breadcrumb={[{ href: "/admin/events", label: "Event" }]}
        title={event.title}
        description={
          <span className="font-mono text-xs">
            {event.id} · {event.slug}
          </span>
        }
        actions={
          <>
            <Link href={`/admin/events/${event.id}/qr`} className={buttonStyles({ size: "sm" })}>
              <QrCode className="size-4" aria-hidden />
              QR Registrasi
            </Link>
            <a
              href={`/event/${event.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <ExternalLink className="size-4" aria-hidden />
              Halaman Publik
            </a>
            <Link href="/admin/events" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              <ArrowLeft className="size-4" aria-hidden />
              Kembali
            </Link>
          </>
        }
      />

      <div className={cn("mb-4 grid gap-3 sm:grid-cols-2", certificatesEnabled ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
        <StatCard label="Pendaftaran" value={String(registrations.length)} detail={`Kuota ${event.capacity}`} tone="brand" />
        <StatCard label="Lunas" value={String(paid.length)} tone="pine" />
        <StatCard label="Hadir" value={String(attended)} tone="sky" />
        {certificatesEnabled ? (
          <StatCard label="Sertifikat" value={String(certs.length)} tone="grape" />
        ) : null}
        <StatCard label="Pendapatan" value={formatRupiah(revenue)} tone="sun" />
      </div>

      <DetailTabs
        tabs={[
          {
            key: "overview",
            label: "Ikhtisar",
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Detail Event">
                  <DefinitionList
                    items={[
                      { label: "Judul", value: event.title },
                      { label: "Slug", value: <span className="font-mono text-xs">{event.slug}</span> },
                      { label: "Kategori", value: event.category },
                      { label: "Tanggal", value: formatDateRange(event.startDate, event.endDate) },
                      { label: "Waktu", value: formatTimeRange(event.timeStart, event.timeEnd, event.timezone) },
                      { label: "Lokasi", value: `${event.location.venue}, ${event.location.city}` },
                      { label: "Rentang Usia", value: `${event.ageRange[0]}–${event.ageRange[1]} tahun` },
                      { label: "Kapasitas", value: `${event.registered} / ${event.capacity}` },
                      { label: "Penyelenggara", value: event.organizer },
                      { label: "Publikasi", value: <StatusBadge status={event.published ? "active" : "inactive"} /> },
                    ]}
                  />
                </Panel>

                <div className="space-y-4">
                  <Panel title="Pendaftaran & Pembayaran">
                    <DefinitionList
                      items={[
                        { label: "Tipe", value: isFree ? "Gratis" : "Berbayar" },
                        {
                          label: "Metode Pembayaran",
                          value: <StatusBadge status={event.registration.method} />,
                        },
                        { label: "Harga", value: isFree ? "—" : formatRupiah(event.registration.price ?? 0) },
                        { label: "Batas Daftar", value: formatDate(event.registration.deadline) },
                        {
                          label: "URL Pihak Ketiga",
                          value: event.registration.thirdPartyUrl ? (
                            <a
                              href={event.registration.thirdPartyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all text-xs text-brand hover:underline"
                            >
                              {event.registration.thirdPartyUrl}
                            </a>
                          ) : (
                            "—"
                          ),
                        },
                        {
                          label: "Tautan QR",
                          value: <span className="font-mono text-xs">{registrationPath(event.slug)}</span>,
                        },
                        { label: "Sertifikat", value: event.certificate.available ? "Tersedia" : "Tidak tersedia" },
                      ]}
                    />
                  </Panel>

                  <Panel title="Cover">
                    <div className="p-4">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-canvas-deep">
                        <Image
                          src={event.poster?.src ?? event.cover.src}
                          alt={event.poster?.alt ?? event.cover.alt}
                          fill
                          sizes="(max-width: 1024px) 90vw, 400px"
                          className={event.poster ? "object-contain" : "object-cover"}
                        />
                      </div>
                    </div>
                  </Panel>
                </div>
              </div>
            ),
          },
          {
            key: "registrations",
            label: "Pendaftaran",
            count: registrations.length,
            content: (
              <Panel>
                <DataTable rows={registrations} columns={regColumns} getKey={(r) => r.registration.id} caption="Pendaftaran event ini" />
              </Panel>
            ),
          },
          {
            key: "payments",
            label: "Pembayaran",
            count: payments.length,
            content: (
              <Panel>
                <DataTable rows={payments} columns={payColumns} getKey={(p) => p.payment.id} caption="Pembayaran event ini" />
              </Panel>
            ),
          },
          {
            key: "certificates",
            label: "Sertifikat",
            count: certs.length,
            content: (
              <Panel>
                <DataTable rows={certs} columns={certColumns} getKey={(c) => c.number} caption="Sertifikat event ini" />
              </Panel>
            ),
          },
        ]}
      />
    </>
  );
}
