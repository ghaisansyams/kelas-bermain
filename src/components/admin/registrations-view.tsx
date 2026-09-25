"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Download } from "lucide-react";
import {
  AdminPageHeader,
  DataTable,
  FilterBar,
  FilterSearch,
  FilterSelect,
  Panel,
  ResultCount,
  StatusBadge,
  type Column,
} from "@/components/admin/ui";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCollection } from "@/hooks/use-collection";
import { events } from "@/data/events";
import { sourceLabel } from "@/lib/repositories/types";
import {
  downloadCsv,
  getRegistrationRows,
  toCsv,
  type RegistrationRow,
} from "@/lib/services/admin";
import { formatDateShort } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

export function RegistrationsView() {
  const { data, loading } = useCollection(() => getRegistrationRows(), []);
  const [query, setQuery] = useState("");
  const [eventId, setEventId] = useState("all");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [attendance, setAttendance] = useState("all");

  // Deep links from global search arrive with ?q=
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
  }, []);

  const rows = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !q ||
        [
          row.registration.registrationNumber,
          row.customer?.fullName,
          row.child?.fullName,
          row.customer?.email,
          row.customer?.whatsapp,
        ].some((v) => v?.toLowerCase().includes(q));
      return (
        matchesQuery &&
        (eventId === "all" || row.registration.eventId === eventId) &&
        (status === "all" || row.registration.status === status) &&
        (payment === "all" || row.registration.paymentStatus === payment) &&
        (attendance === "all" || row.registration.attendanceStatus === attendance)
      );
    });
  }, [rows, query, eventId, status, payment, attendance]);

  const columns: Column<RegistrationRow>[] = [
    {
      key: "number",
      header: "No. Pendaftaran",
      render: (row) => (
        <span className="whitespace-nowrap font-mono text-xs font-bold text-ink">
          {row.registration.registrationNumber}
        </span>
      ),
    },
    {
      key: "child",
      header: "Anak",
      render: (row) => (
        <div className="min-w-0">
          {row.child ? (
            <Link
              href={`/admin/children/${row.child.id}`}
              className="truncate font-semibold text-ink hover:text-brand"
            >
              {row.child.fullName}
            </Link>
          ) : (
            <span className="text-muted">—</span>
          )}
          <p className="truncate text-xs text-muted">{row.child?.school}</p>
        </div>
      ),
    },
    {
      key: "parent",
      header: "Orang Tua",
      hideBelow: "md",
      render: (row) =>
        row.customer ? (
          <Link
            href={`/admin/customers/${row.customer.id}`}
            className="truncate text-xs text-ink-soft hover:text-brand"
          >
            {row.customer.fullName}
          </Link>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "event",
      header: "Event",
      render: (row) => (
        <span className="block max-w-[12rem] truncate text-xs text-ink-soft">
          {row.event?.title ?? "—"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Tanggal",
      hideBelow: "lg",
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-muted">
          {formatDateShort(row.registration.registrationDate)}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Nominal",
      hideBelow: "lg",
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-xs">
          {row.registration.amount > 0 ? formatRupiah(row.registration.amount) : "Gratis"}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Pembayaran",
      render: (row) => <StatusBadge status={row.registration.paymentStatus} />,
    },
    {
      key: "attendance",
      header: "Kehadiran",
      hideBelow: "md",
      render: (row) => <StatusBadge status={row.registration.attendanceStatus} />,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.registration.status} />,
    },
    {
      key: "source",
      header: "Sumber",
      hideBelow: "lg",
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-muted">
          {sourceLabel[row.registration.source]}
        </span>
      ),
    },
  ];

  function exportCsv() {
    const csv = toCsv(filtered, [
      { header: "No. Pendaftaran", value: (r) => r.registration.registrationNumber },
      { header: "Tanggal", value: (r) => r.registration.registrationDate.slice(0, 10) },
      { header: "Anak", value: (r) => r.child?.fullName ?? "" },
      { header: "Sekolah", value: (r) => r.child?.school ?? "" },
      { header: "Orang Tua", value: (r) => r.customer?.fullName ?? "" },
      { header: "WhatsApp", value: (r) => r.customer?.whatsapp ?? "" },
      { header: "Email", value: (r) => r.customer?.email ?? "" },
      { header: "Event", value: (r) => r.event?.title ?? "" },
      { header: "Nominal", value: (r) => r.registration.amount },
      { header: "Metode", value: (r) => r.registration.paymentMethod },
      { header: "Pembayaran", value: (r) => r.registration.paymentStatus },
      { header: "Kehadiran", value: (r) => r.registration.attendanceStatus },
      { header: "Sertifikat", value: (r) => r.registration.certificateStatus },
      { header: "Status", value: (r) => r.registration.status },
      { header: "Sumber", value: (r) => sourceLabel[r.registration.source] },
    ]);
    downloadCsv("kelas-bermain-pendaftaran.csv", csv);
  }

  return (
    <>
      <AdminPageHeader
        title="Pendaftaran"
        description="Seluruh pendaftaran dari situs publik dan QR Code, lengkap dengan status pembayaran dan kehadiran."
        actions={
          <button type="button" onClick={exportCsv} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <Download className="size-4" aria-hidden />
            Ekspor CSV
          </button>
        }
      />

      <FilterBar>
        <FilterSearch
          value={query}
          onChange={setQuery}
          placeholder="Nomor, nama anak, orang tua, email, WhatsApp…"
        />
        <FilterSelect
          label="Event"
          value={eventId}
          onChange={setEventId}
          options={[
            { value: "all", label: "Semua event" },
            ...events.map((e) => ({ value: e.id, label: e.title })),
          ]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "Semua" },
            { value: "REGISTERED", label: "Terdaftar" },
            { value: "CONFIRMED", label: "Terkonfirmasi" },
            { value: "COMPLETED", label: "Selesai" },
            { value: "CANCELLED", label: "Dibatalkan" },
          ]}
        />
        <FilterSelect
          label="Pembayaran"
          value={payment}
          onChange={setPayment}
          options={[
            { value: "all", label: "Semua" },
            { value: "NOT_REQUIRED", label: "Tanpa Bayar" },
            { value: "PENDING", label: "Menunggu" },
            { value: "PAID", label: "Lunas" },
            { value: "FAILED", label: "Gagal" },
            { value: "EXPIRED", label: "Kedaluwarsa" },
          ]}
        />
        <FilterSelect
          label="Kehadiran"
          value={attendance}
          onChange={setAttendance}
          options={[
            { value: "all", label: "Semua" },
            { value: "NOT_ATTENDED", label: "Belum Hadir" },
            { value: "PRESENT", label: "Hadir" },
            { value: "ABSENT", label: "Tidak Hadir" },
          ]}
        />
      </FilterBar>

      <ResultCount shown={filtered.length} total={rows.length} noun="pendaftaran" />

      <Panel>
        <DataTable
          rows={filtered}
          columns={columns}
          getKey={(row) => row.registration.id}
          loading={loading}
          caption="Daftar pendaftaran"
          empty={
            <EmptyState
              icon={<ClipboardList className="size-6" aria-hidden />}
              title="Tidak ada pendaftaran"
              description="Coba ubah kata kunci atau filter yang dipakai."
              className="border-none bg-transparent"
            />
          }
        />
      </Panel>
    </>
  );
}
