"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Download, Eye, QrCode } from "lucide-react";
import {
  AdminPageHeader, DataTable, FilterBar, FilterSearch, FilterSelect,
  Panel, ResultCount, StatusBadge, type Column,
} from "@/components/admin/ui";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCollection } from "@/hooks/use-collection";
import { EVENT_CATEGORIES } from "@/lib/types";
import { downloadCsv, getEventRows, toCsv, type EventRow } from "@/lib/services/admin";
import { formatDateShort } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

const LIFECYCLE_LABEL: Record<string, string> = {
  upcoming: "Akan Datang",
  ongoing: "Berlangsung",
  past: "Selesai",
};

export function EventsView() {
  const { data, loading } = useCollection(() => getEventRows(), []);
  const [query, setQuery] = useState("");
  const [lifecycle, setLifecycle] = useState("all");
  const [category, setCategory] = useState("all");
  const [published, setPublished] = useState("all");

  const rows = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !q ||
        [row.event.title, row.event.slug, row.event.location.city].some((v) =>
          v.toLowerCase().includes(q),
        );
      return (
        matchesQuery &&
        (lifecycle === "all" || row.lifecycle === lifecycle) &&
        (category === "all" || row.event.category === category) &&
        (published === "all" || String(row.event.published) === published)
      );
    });
  }, [rows, query, lifecycle, category, published]);

  const columns: Column<EventRow>[] = [
    {
      key: "title",
      header: "Event",
      render: (row) => (
        <div className="min-w-0">
          <Link
            href={`/admin/events/${row.event.id}`}
            className="block max-w-[14rem] truncate font-semibold text-ink hover:text-brand"
          >
            {row.event.title}
          </Link>
          <p className="truncate font-mono text-[0.6875rem] text-muted">{row.event.slug}</p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Tanggal",
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-ink-soft">
          {formatDateShort(row.event.startDate)}
        </span>
      ),
    },
    {
      key: "city",
      header: "Lokasi",
      hideBelow: "md",
      render: (row) => <span className="text-xs text-muted">{row.event.location.city}</span>,
    },
    {
      key: "category",
      header: "Kategori",
      hideBelow: "lg",
      render: (row) => <span className="text-xs text-ink-soft">{row.event.category}</span>,
    },
    {
      key: "price",
      header: "Biaya",
      render: (row) => (
        <div className="min-w-0 whitespace-nowrap">
          <p className="text-xs font-semibold text-ink">
            {row.event.registration.type === "FREE"
              ? "Gratis"
              : formatRupiah(row.event.registration.price ?? 0)}
          </p>
          <p className="text-[0.6875rem] text-muted">
            {row.event.registration.method === "NONE"
              ? "—"
              : row.event.registration.method === "WEBSITE"
                ? "Website"
                : "Pihak Ketiga"}
          </p>
        </div>
      ),
    },
    {
      key: "quota",
      header: "Kuota",
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-xs">
          {row.registrationCount} / {row.event.capacity}
        </span>
      ),
    },
    {
      key: "revenue",
      header: "Pendapatan",
      hideBelow: "lg",
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums text-xs">
          {formatRupiah(row.revenue)}
        </span>
      ),
    },
    {
      key: "lifecycle",
      header: "Jadwal",
      render: (row) => (
        <span className="whitespace-nowrap rounded-pill bg-canvas-deep px-2 py-0.5 text-[0.6875rem] font-bold text-ink-soft">
          {LIFECYCLE_LABEL[row.lifecycle]}
        </span>
      ),
    },
    {
      key: "published",
      header: "Publikasi",
      hideBelow: "md",
      render: (row) => <StatusBadge status={row.event.published ? "active" : "inactive"} />,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex gap-1.5">
          <Link
            href={`/admin/events/${row.event.id}/qr`}
            aria-label={`QR registrasi ${row.event.title}`}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-brand/40 hover:text-brand"
          >
            <QrCode className="size-4" aria-hidden />
          </Link>
          <Link
            href={`/admin/events/${row.event.id}`}
            aria-label={`Detail ${row.event.title}`}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-brand/40 hover:text-brand"
          >
            <Eye className="size-4" aria-hidden />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Event"
        description="Kelola jadwal, kuota, biaya, dan metode pembayaran setiap kelas. Setiap event punya QR pendaftarannya sendiri."
        actions={
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "kelas-bermain-event.csv",
                toCsv(filtered, [
                  { header: "Judul", value: (r) => r.event.title },
                  { header: "Slug", value: (r) => r.event.slug },
                  { header: "Tanggal", value: (r) => r.event.startDate },
                  { header: "Kota", value: (r) => r.event.location.city },
                  { header: "Kategori", value: (r) => r.event.category },
                  { header: "Tipe", value: (r) => r.event.registration.type },
                  { header: "Metode", value: (r) => r.event.registration.method },
                  { header: "Harga", value: (r) => r.event.registration.price ?? 0 },
                  { header: "Kapasitas", value: (r) => r.event.capacity },
                  { header: "Pendaftaran", value: (r) => r.registrationCount },
                  { header: "Lunas", value: (r) => r.paidCount },
                  { header: "Hadir", value: (r) => r.attendedCount },
                  { header: "Pendapatan", value: (r) => r.revenue },
                  { header: "Publikasi", value: (r) => (r.event.published ? "published" : "draft") },
                ]),
              )
            }
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            <Download className="size-4" aria-hidden />
            Ekspor CSV
          </button>
        }
      />

      <FilterBar>
        <FilterSearch value={query} onChange={setQuery} placeholder="Judul, slug, kota…" />
        <FilterSelect
          label="Jadwal"
          value={lifecycle}
          onChange={setLifecycle}
          options={[
            { value: "all", label: "Semua" },
            { value: "upcoming", label: "Akan Datang" },
            { value: "ongoing", label: "Berlangsung" },
            { value: "past", label: "Selesai" },
          ]}
        />
        <FilterSelect
          label="Kategori"
          value={category}
          onChange={setCategory}
          options={[
            { value: "all", label: "Semua" },
            ...EVENT_CATEGORIES.map((c) => ({ value: c, label: c })),
          ]}
        />
        <FilterSelect
          label="Publikasi"
          value={published}
          onChange={setPublished}
          options={[
            { value: "all", label: "Semua" },
            { value: "true", label: "Tayang" },
            { value: "false", label: "Draft" },
          ]}
        />
      </FilterBar>

      <ResultCount shown={filtered.length} total={rows.length} noun="event" />

      <Panel>
        <DataTable
          rows={filtered}
          columns={columns}
          getKey={(row) => row.event.id}
          loading={loading}
          caption="Daftar event"
          empty={
            <EmptyState
              icon={<CalendarDays className="size-6" aria-hidden />}
              title="Tidak ada event"
              description="Coba ubah kata kunci atau filter."
              className="border-none bg-transparent"
            />
          }
        />
      </Panel>
    </>
  );
}
