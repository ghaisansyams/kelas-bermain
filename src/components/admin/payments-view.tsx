"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Wallet } from "lucide-react";
import {
  AdminPageHeader, DataTable, FilterBar, FilterSearch, FilterSelect,
  Panel, ResultCount, StatCard, StatusBadge, type Column,
} from "@/components/admin/ui";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCollection } from "@/hooks/use-collection";
import { events } from "@/data/events";
import type { PaymentStatus } from "@/lib/repositories/types";
import { downloadCsv, getPaymentRows, toCsv, type PaymentRow } from "@/lib/services/admin";
import { setPaymentStatus } from "@/lib/services/payment";
import { formatDateShort } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

const STATUSES: PaymentStatus[] = ["PENDING", "PAID", "FAILED", "EXPIRED", "CANCELLED"];

export function PaymentsView() {
  const { data, loading, reload } = useCollection(() => getPaymentRows(), []);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [eventId, setEventId] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);

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
        [row.payment.paymentNumber, row.payment.reference, row.customer?.fullName].some((v) =>
          v?.toLowerCase().includes(q),
        );
      return (
        matchesQuery &&
        (status === "all" || row.payment.status === status) &&
        (method === "all" || row.payment.method === method) &&
        (eventId === "all" || row.payment.eventId === eventId)
      );
    });
  }, [rows, query, status, method, eventId]);

  const totals = useMemo(() => {
    const paid = filtered.filter((r) => r.payment.status === "PAID");
    const pending = filtered.filter((r) => r.payment.status === "PENDING");
    return {
      paid: paid.reduce((sum, r) => sum + r.payment.amount, 0),
      pendingAmount: pending.reduce((sum, r) => sum + r.payment.amount, 0),
      pendingCount: pending.length,
    };
  }, [filtered]);

  async function changeStatus(paymentId: string, next: PaymentStatus) {
    setUpdating(paymentId);
    await setPaymentStatus(paymentId, next);
    await reload();
    setUpdating(null);
  }

  const columns: Column<PaymentRow>[] = [
    {
      key: "number",
      header: "Payment ID",
      render: (row) => (
        <span className="whitespace-nowrap font-mono text-xs font-bold text-ink">
          {row.payment.paymentNumber}
        </span>
      ),
    },
    {
      key: "registration",
      header: "Pendaftaran",
      hideBelow: "md",
      render: (row) => (
        <span className="whitespace-nowrap font-mono text-xs text-muted">
          {row.registration?.registrationNumber ?? "—"}
        </span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => (
        <span className="block max-w-[10rem] truncate text-sm font-semibold text-ink">
          {row.customer?.fullName ?? "—"}
        </span>
      ),
    },
    {
      key: "event",
      header: "Event",
      hideBelow: "md",
      render: (row) => (
        <span className="block max-w-[11rem] truncate text-xs text-ink-soft">
          {row.event?.title ?? "—"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Nominal",
      render: (row) => (
        <span className="whitespace-nowrap font-semibold tabular-nums">
          {formatRupiah(row.payment.amount)}
        </span>
      ),
    },
    {
      key: "method",
      header: "Metode",
      hideBelow: "lg",
      render: (row) => (
        <div className="min-w-0">
          <StatusBadge status={row.payment.method} />
          <p className="mt-0.5 truncate text-[0.6875rem] text-muted">{row.payment.provider}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.payment.status} /> },
    {
      key: "date",
      header: "Tanggal",
      hideBelow: "lg",
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-muted">
          {formatDateShort(row.payment.paidAt ?? row.payment.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Ubah Status",
      render: (row) =>
        updating === row.payment.id ? (
          <Loader2 className="size-4 animate-spin text-muted" aria-hidden />
        ) : (
          <select
            aria-label={`Ubah status ${row.payment.paymentNumber}`}
            value={row.payment.status}
            onChange={(e) => changeStatus(row.payment.id, e.target.value as PaymentStatus)}
            className="h-8 rounded-lg border border-line bg-canvas px-2 text-xs font-medium text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ),
    },
  ];

  function exportCsv() {
    downloadCsv(
      "kelas-bermain-pembayaran.csv",
      toCsv(filtered, [
        { header: "Payment ID", value: (r) => r.payment.paymentNumber },
        { header: "Pendaftaran", value: (r) => r.registration?.registrationNumber ?? "" },
        { header: "Customer", value: (r) => r.customer?.fullName ?? "" },
        { header: "Event", value: (r) => r.event?.title ?? "" },
        { header: "Nominal", value: (r) => r.payment.amount },
        { header: "Metode", value: (r) => r.payment.method },
        { header: "Provider", value: (r) => r.payment.provider },
        { header: "Status", value: (r) => r.payment.status },
        { header: "Dibuat", value: (r) => r.payment.createdAt.slice(0, 10) },
        { header: "Dibayar", value: (r) => r.payment.paidAt?.slice(0, 10) ?? "" },
      ]),
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Pembayaran"
        description="Pembayaran lewat website diproses gerbang simulasi; pembayaran pihak ketiga dikonfirmasi manual di sini."
        actions={
          <button type="button" onClick={exportCsv} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <Download className="size-4" aria-hidden />
            Ekspor CSV
          </button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Lunas" value={formatRupiah(totals.paid)} detail="Sesuai filter aktif" tone="pine" />
        <StatCard label="Menunggu Pembayaran" value={formatRupiah(totals.pendingAmount)} detail={`${totals.pendingCount} transaksi`} tone="sun" />
        <StatCard label="Transaksi" value={String(filtered.length)} detail={`dari ${rows.length} total`} tone="neutral" />
      </div>

      <FilterBar>
        <FilterSearch value={query} onChange={setQuery} placeholder="Payment ID, referensi, nama customer…" />
        <FilterSelect
          label="Event"
          value={eventId}
          onChange={setEventId}
          options={[{ value: "all", label: "Semua event" }, ...events.map((e) => ({ value: e.id, label: e.title }))]}
        />
        <FilterSelect
          label="Metode"
          value={method}
          onChange={setMethod}
          options={[
            { value: "all", label: "Semua" },
            { value: "WEBSITE", label: "Website" },
            { value: "THIRD_PARTY", label: "Pihak Ketiga" },
          ]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[{ value: "all", label: "Semua" }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
        />
      </FilterBar>

      <ResultCount shown={filtered.length} total={rows.length} noun="pembayaran" />

      <Panel>
        <DataTable
          rows={filtered}
          columns={columns}
          getKey={(row) => row.payment.id}
          loading={loading}
          caption="Daftar pembayaran"
          empty={
            <EmptyState
              icon={<Wallet className="size-6" aria-hidden />}
              title="Tidak ada pembayaran"
              description="Coba ubah kata kunci atau filter."
              className="border-none bg-transparent"
            />
          }
        />
      </Panel>
    </>
  );
}
