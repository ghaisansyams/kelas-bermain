"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Award, Download, ExternalLink } from "lucide-react";
import {
  AdminPageHeader, DataTable, FilterBar, FilterSearch, FilterSelect,
  Panel, ResultCount, StatusBadge, type Column,
} from "@/components/admin/ui";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCollection } from "@/hooks/use-collection";
import { events } from "@/data/events";
import { downloadCsv, getCertificateRows, toCsv, type CertificateRow } from "@/lib/services/admin";
import { formatDateShort } from "@/lib/utils/date";

export function CertificatesView() {
  const { data, loading } = useCollection(() => getCertificateRows(), []);
  const [query, setQuery] = useState("");
  const [eventId, setEventId] = useState("all");

  const rows = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !q ||
        [row.certificate.number, row.certificate.participantName, row.certificate.eventTitle].some(
          (v) => v.toLowerCase().includes(q),
        );
      return matchesQuery && (eventId === "all" || row.certificate.eventId === eventId);
    });
  }, [rows, query, eventId]);

  const columns: Column<CertificateRow>[] = [
    {
      key: "number",
      header: "Nomor Sertifikat",
      render: (row) => (
        <Link
          href={`/certificate/${row.certificate.number}`}
          className="whitespace-nowrap font-mono text-xs font-bold text-brand hover:underline"
        >
          {row.certificate.number}
        </Link>
      ),
    },
    {
      key: "participant",
      header: "Peserta",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{row.certificate.participantName}</p>
          <p className="truncate text-xs text-muted">{row.customer?.fullName ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "event",
      header: "Event",
      render: (row) => (
        <span className="block max-w-[12rem] truncate text-xs text-ink-soft">
          {row.certificate.eventTitle}
        </span>
      ),
    },
    {
      key: "eventDate",
      header: "Tanggal Event",
      hideBelow: "md",
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-muted">
          {formatDateShort(row.certificate.eventDate)}
        </span>
      ),
    },
    {
      key: "issued",
      header: "Terbit",
      hideBelow: "lg",
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-muted">
          {formatDateShort(row.certificate.issuedAt)}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.certificate.status} /> },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Link
          href={`/certificate/${row.certificate.number}`}
          aria-label={`Buka sertifikat ${row.certificate.number}`}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-brand/40 hover:text-brand"
        >
          <ExternalLink className="size-4" aria-hidden />
        </Link>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Sertifikat"
        description="Sertifikat terbit otomatis setelah kehadiran tercatat, dengan nomor unik berformat KB-<tahun>-<urutan>."
        actions={
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "kelas-bermain-sertifikat.csv",
                toCsv(filtered, [
                  { header: "Nomor", value: (r) => r.certificate.number },
                  { header: "Peserta", value: (r) => r.certificate.participantName },
                  { header: "Orang Tua", value: (r) => r.customer?.fullName ?? "" },
                  { header: "Event", value: (r) => r.certificate.eventTitle },
                  { header: "Tanggal Event", value: (r) => r.certificate.eventDate },
                  { header: "Terbit", value: (r) => r.certificate.issuedAt.slice(0, 10) },
                  { header: "Status", value: (r) => r.certificate.status },
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
        <FilterSearch value={query} onChange={setQuery} placeholder="Nomor sertifikat, nama peserta…" />
        <FilterSelect
          label="Event"
          value={eventId}
          onChange={setEventId}
          options={[{ value: "all", label: "Semua event" }, ...events.map((e) => ({ value: e.id, label: e.title }))]}
        />
      </FilterBar>

      <ResultCount shown={filtered.length} total={rows.length} noun="sertifikat" />

      <Panel>
        <DataTable
          rows={filtered}
          columns={columns}
          getKey={(row) => row.certificate.number}
          loading={loading}
          caption="Daftar sertifikat"
          empty={
            <EmptyState
              icon={<Award className="size-6" aria-hidden />}
              title="Belum ada sertifikat"
              description="Sertifikat muncul setelah kehadiran peserta tercatat."
              className="border-none bg-transparent"
            />
          }
        />
      </Panel>
    </>
  );
}
