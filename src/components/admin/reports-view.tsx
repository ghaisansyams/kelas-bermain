"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { AdminPageHeader, FilterBar, FilterSelect, Panel, StatCard } from "@/components/admin/ui";
import { buttonStyles } from "@/components/ui/button";
import { useCollection } from "@/hooks/use-collection";
import { events } from "@/data/events";
import { affiliateStatusLabel, sourceLabel } from "@/lib/repositories/types";
import {
  downloadCsv,
  getCertificateRows,
  getChildRows,
  getCustomerRows,
  getPaymentRows,
  getRegistrationRows,
  toCsv,
} from "@/lib/services/admin";
import { listAffiliates, statsForAffiliate } from "@/lib/services/affiliate";
import { formatRupiah } from "@/lib/utils/format";
import { ageOfChild } from "@/lib/utils/age";

type ReportKey =
  | "registrations"
  | "customers"
  | "children"
  | "payments"
  | "attendance"
  | "events"
  | "affiliates";

const REPORTS: { key: ReportKey; title: string; description: string }[] = [
  { key: "registrations", title: "Laporan Pendaftaran", description: "Seluruh pendaftaran dengan status pembayaran, kehadiran, dan sertifikat." },
  { key: "customers", title: "Laporan Orang Tua", description: "Data induk keluarga beserta jumlah anak dan total pembayaran." },
  { key: "children", title: "Laporan Anak", description: "Daftar anak, usia, sekolah, dan jumlah kelas yang diikuti." },
  { key: "payments", title: "Laporan Pembayaran", description: "Transaksi berdasarkan metode, provider, dan status." },
  { key: "attendance", title: "Laporan Kehadiran", description: "Kehadiran peserta per event." },
  { key: "events", title: "Laporan Event", description: "Ringkasan per event: pendaftaran, kehadiran, dan pendapatan." },
  { key: "affiliates", title: "Laporan Affiliate", description: "Per affiliator: peserta masuk, peserta lunas, dan estimasi komisi." },
];

export function ReportsView() {
  const [eventId, setEventId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");

  const { data, loading } = useCollection(
    async () => ({
      registrations: await getRegistrationRows(),
      customers: await getCustomerRows(),
      children: await getChildRows(),
      payments: await getPaymentRows(),
      certificates: await getCertificateRows(),
      affiliates: await listAffiliates(),
    }),
    [],
  );

  const scoped = useMemo(() => {
    if (!data) return null;
    const inRange = (iso: string) => {
      const day = iso.slice(0, 10);
      return (!from || day >= from) && (!to || day <= to);
    };
    const registrations = data.registrations.filter(
      (r) =>
        (eventId === "all" || r.registration.eventId === eventId) &&
        inRange(r.registration.registrationDate) &&
        (paymentStatus === "all" || r.registration.paymentStatus === paymentStatus),
    );
    const payments = data.payments.filter(
      (p) =>
        (eventId === "all" || p.payment.eventId === eventId) &&
        inRange(p.payment.createdAt) &&
        (paymentStatus === "all" || p.payment.status === paymentStatus),
    );
    return { ...data, registrations, payments };
  }, [data, eventId, from, to, paymentStatus]);

  function exportReport(key: ReportKey) {
    if (!scoped) return;
    switch (key) {
      case "registrations":
        downloadCsv(
          "laporan-pendaftaran.csv",
          toCsv(scoped.registrations, [
            { header: "No. Pendaftaran", value: (r) => r.registration.registrationNumber },
            { header: "Tanggal", value: (r) => r.registration.registrationDate.slice(0, 10) },
            { header: "Anak", value: (r) => r.child?.fullName ?? "" },
            { header: "Orang Tua", value: (r) => r.customer?.fullName ?? "" },
            { header: "Event", value: (r) => r.event?.title ?? "" },
            { header: "Nominal", value: (r) => r.registration.amount },
            { header: "Pembayaran", value: (r) => r.registration.paymentStatus },
            { header: "Kehadiran", value: (r) => r.registration.attendanceStatus },
            { header: "Sertifikat", value: (r) => r.registration.certificateStatus },
            { header: "Sumber", value: (r) => sourceLabel[r.registration.source] },
          ]),
        );
        break;
      case "customers":
        downloadCsv(
          "laporan-orang-tua.csv",
          toCsv(scoped.customers, [
            { header: "Customer ID", value: (r) => r.customer.customerNumber },
            { header: "Nama", value: (r) => r.customer.fullName },
            { header: "WhatsApp", value: (r) => r.customer.whatsapp },
            { header: "Domisili", value: (r) => r.customer.domicile || r.customer.city },
            { header: "Email", value: (r) => r.customer.email },
            { header: "Jumlah Anak", value: (r) => r.childCount },
            { header: "Jumlah Pendaftaran", value: (r) => r.registrationCount },
            { header: "Total Bayar", value: (r) => r.totalPaid },
          ]),
        );
        break;
      case "children":
        downloadCsv(
          "laporan-anak.csv",
          toCsv(scoped.children, [
            { header: "Child ID", value: (r) => r.child.childNumber },
            { header: "Nama", value: (r) => r.child.fullName },
            { header: "Usia", value: (r) => ageOfChild(r.child) ?? "" },
            { header: "Nama Panggilan", value: (r) => r.child.nickname },
            { header: "Jenis Kelamin", value: (r) => (r.child.gender === "L" ? "Laki-laki" : r.child.gender === "P" ? "Perempuan" : "") },
            { header: "Sekolah", value: (r) => r.child.school },
            { header: "Orang Tua", value: (r) => r.parent?.fullName ?? "" },
            { header: "Jumlah Kelas", value: (r) => r.classCount },
          ]),
        );
        break;
      case "payments":
        downloadCsv(
          "laporan-pembayaran.csv",
          toCsv(scoped.payments, [
            { header: "Payment ID", value: (r) => r.payment.paymentNumber },
            { header: "Customer", value: (r) => r.customer?.fullName ?? "" },
            { header: "Event", value: (r) => r.event?.title ?? "" },
            { header: "Nominal", value: (r) => r.payment.amount },
            { header: "Metode", value: (r) => r.payment.method },
            { header: "Provider", value: (r) => r.payment.provider },
            { header: "Status", value: (r) => r.payment.status },
            { header: "Tanggal", value: (r) => r.payment.createdAt.slice(0, 10) },
          ]),
        );
        break;
      case "attendance":
        downloadCsv(
          "laporan-kehadiran.csv",
          toCsv(scoped.registrations, [
            { header: "No. Pendaftaran", value: (r) => r.registration.registrationNumber },
            { header: "Anak", value: (r) => r.child?.fullName ?? "" },
            { header: "Event", value: (r) => r.event?.title ?? "" },
            { header: "Tanggal Event", value: (r) => r.event?.startDate ?? "" },
            { header: "Kehadiran", value: (r) => r.registration.attendanceStatus },
          ]),
        );
        break;
      case "events":
        downloadCsv(
          "laporan-event.csv",
          toCsv(events, [
            { header: "Judul", value: (e) => e.title },
            { header: "Tanggal", value: (e) => e.startDate },
            { header: "Kota", value: (e) => e.location.city },
            { header: "Tipe", value: (e) => e.registration.type },
            { header: "Metode", value: (e) => e.registration.method },
            { header: "Harga", value: (e) => e.registration.price ?? 0 },
            { header: "Kapasitas", value: (e) => e.capacity },
            {
              header: "Pendaftaran",
              value: (e) =>
                scoped.registrations.filter((r) => r.registration.eventId === e.id).length,
            },
            {
              header: "Pendapatan",
              value: (e) =>
                scoped.payments
                  .filter((p) => p.payment.eventId === e.id && p.payment.status === "PAID")
                  .reduce((sum, p) => sum + p.payment.amount, 0),
            },
          ]),
        );
        break;
      case "affiliates":
        downloadCsv(
          "laporan-affiliate.csv",
          toCsv(scoped.affiliates, [
            { header: "No. Affiliate", value: (a) => a.affiliateNumber },
            { header: "Nama", value: (a) => a.fullName },
            { header: "Kode", value: (a) => a.code || "" },
            { header: "WhatsApp", value: (a) => a.whatsapp },
            { header: "Status", value: (a) => affiliateStatusLabel[a.status] },
            { header: "Peserta Masuk", value: (a) => statsForAffiliate(a.code).referrals },
            { header: "Peserta Lunas", value: (a) => statsForAffiliate(a.code).paidReferrals },
            {
              header: "Estimasi Komisi",
              value: (a) => statsForAffiliate(a.code).estimatedCommission,
            },
            { header: "Terdaftar", value: (a) => a.appliedAt.slice(0, 10) },
          ]),
        );
        break;
    }
  }

  const revenue =
    scoped?.payments
      .filter((p) => p.payment.status === "PAID")
      .reduce((sum, p) => sum + p.payment.amount, 0) ?? 0;

  return (
    <>
      <AdminPageHeader
        title="Laporan"
        description="Saring lalu unduh sebagai CSV. Berkas memakai BOM UTF-8 agar huruf Indonesia tidak rusak di Excel."
      />

      <FilterBar>
        <FilterSelect
          label="Event"
          value={eventId}
          onChange={setEventId}
          options={[{ value: "all", label: "Semua event" }, ...events.map((e) => ({ value: e.id, label: e.title }))]}
        />
        <div className="min-w-[8.5rem] flex-1 sm:flex-none">
          <label htmlFor="from" className="mb-1 block text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
            Dari
          </label>
          <input
            id="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
          />
        </div>
        <div className="min-w-[8.5rem] flex-1 sm:flex-none">
          <label htmlFor="to" className="mb-1 block text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
            Sampai
          </label>
          <input
            id="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
          />
        </div>
        <FilterSelect
          label="Status Bayar"
          value={paymentStatus}
          onChange={setPaymentStatus}
          options={[
            { value: "all", label: "Semua" },
            { value: "PAID", label: "Lunas" },
            { value: "PENDING", label: "Menunggu" },
            { value: "FAILED", label: "Gagal" },
            { value: "NOT_REQUIRED", label: "Tanpa Bayar" },
          ]}
        />
      </FilterBar>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Pendaftaran Tersaring" value={String(scoped?.registrations.length ?? 0)} tone="brand" />
        <StatCard label="Transaksi Tersaring" value={String(scoped?.payments.length ?? 0)} tone="sun" />
        <StatCard label="Pendapatan Lunas" value={formatRupiah(revenue)} tone="pine" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((report) => (
          <Panel key={report.key}>
            <div className="flex h-full flex-col p-4 sm:p-5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <FileSpreadsheet className="size-[1.125rem]" aria-hidden />
              </span>
              <h2 className="mt-3 text-sm font-extrabold text-ink">{report.title}</h2>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-muted">
                {report.description}
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => exportReport(report.key)}
                className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-4 w-full" })}
              >
                <Download className="size-4" aria-hidden />
                Unduh CSV
              </button>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
