"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Baby, Download, Eye } from "lucide-react";
import {
  AdminPageHeader, DataTable, FilterBar, FilterSearch, FilterSelect,
  Panel, ResultCount, StatusBadge, type Column,
} from "@/components/admin/ui";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCollection } from "@/hooks/use-collection";
import { downloadCsv, getChildRows, toCsv, type ChildRow } from "@/lib/services/admin";
import { formatDateShort } from "@/lib/utils/date";

export function ChildrenView() {
  const { data, loading } = useCollection(() => getChildRows(), []);
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState("all");
  const [band, setBand] = useState("all");

  const rows = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const c = row.child;
      const matchesQuery =
        !q ||
        [c.fullName, c.childNumber, c.nickname, c.school, row.parent?.fullName].some((v) =>
          v?.toLowerCase().includes(q),
        );
      const matchesBand =
        band === "all" ||
        (band === "3-6" && row.age >= 3 && row.age <= 6) ||
        (band === "7-10" && row.age >= 7 && row.age <= 10) ||
        (band === "11-15" && row.age >= 11 && row.age <= 15);
      return matchesQuery && matchesBand && (gender === "all" || c.gender === gender);
    });
  }, [rows, query, gender, band]);

  const columns: Column<ChildRow>[] = [
    {
      key: "number",
      header: "Child ID",
      render: (row) => (
        <Link href={`/admin/children/${row.child.id}`} className="font-mono text-xs font-bold text-brand hover:underline">
          {row.child.childNumber}
        </Link>
      ),
    },
    {
      key: "name",
      header: "Nama Anak",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{row.child.fullName}</p>
          <p className="truncate text-xs text-muted">
            {row.child.gender === "L" ? "Laki-laki" : "Perempuan"} · {row.child.nickname}
          </p>
        </div>
      ),
    },
    {
      key: "parent",
      header: "Orang Tua",
      hideBelow: "md",
      render: (row) =>
        row.parent ? (
          <Link href={`/admin/customers/${row.parent.id}`} className="truncate text-xs text-ink-soft hover:text-brand">
            {row.parent.fullName}
          </Link>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    { key: "age", header: "Usia", className: "text-center", render: (row) => <span className="tabular-nums">{row.age}</span> },
    {
      key: "school",
      header: "Sekolah",
      hideBelow: "md",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs text-ink-soft">{row.child.school}</p>
          <p className="truncate text-xs text-muted">{row.child.grade}</p>
        </div>
      ),
    },
    { key: "classes", header: "Kelas Diikuti", className: "text-center", render: (row) => <span className="tabular-nums">{row.classCount}</span> },
    {
      key: "last",
      header: "Aktivitas Terakhir",
      hideBelow: "lg",
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-muted">
          {row.lastActivityAt ? formatDateShort(row.lastActivityAt) : "—"}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.child.status} /> },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Link
          href={`/admin/children/${row.child.id}`}
          aria-label={`Lihat detail ${row.child.fullName}`}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-brand/40 hover:text-brand"
        >
          <Eye className="size-4" aria-hidden />
        </Link>
      ),
    },
  ];

  function exportCsv() {
    downloadCsv(
      "kelas-bermain-anak.csv",
      toCsv(filtered, [
        { header: "Child ID", value: (r) => r.child.childNumber },
        { header: "Nama", value: (r) => r.child.fullName },
        { header: "Panggilan", value: (r) => r.child.nickname },
        { header: "Jenis Kelamin", value: (r) => (r.child.gender === "L" ? "Laki-laki" : "Perempuan") },
        { header: "Tanggal Lahir", value: (r) => r.child.dateOfBirth },
        { header: "Usia", value: (r) => r.age },
        { header: "Sekolah", value: (r) => r.child.school },
        { header: "Kelas", value: (r) => r.child.grade },
        { header: "Orang Tua", value: (r) => r.parent?.fullName ?? "" },
        { header: "Kontak Darurat", value: (r) => r.child.emergencyContact },
        { header: "Catatan Khusus", value: (r) => r.child.specialNotes ?? "" },
        { header: "Jumlah Kelas", value: (r) => r.classCount },
      ]),
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Anak"
        description="Setiap anak terhubung ke satu orang tua. Data orang tua tidak diduplikasi per anak."
        actions={
          <button type="button" onClick={exportCsv} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <Download className="size-4" aria-hidden />
            Ekspor CSV
          </button>
        }
      />

      <FilterBar>
        <FilterSearch value={query} onChange={setQuery} placeholder="Nama anak, nomor, sekolah, orang tua…" />
        <FilterSelect
          label="Kelompok Usia"
          value={band}
          onChange={setBand}
          options={[
            { value: "all", label: "Semua usia" },
            { value: "3-6", label: "3–6 tahun" },
            { value: "7-10", label: "7–10 tahun" },
            { value: "11-15", label: "11–15 tahun" },
          ]}
        />
        <FilterSelect
          label="Jenis Kelamin"
          value={gender}
          onChange={setGender}
          options={[
            { value: "all", label: "Semua" },
            { value: "L", label: "Laki-laki" },
            { value: "P", label: "Perempuan" },
          ]}
        />
      </FilterBar>

      <ResultCount shown={filtered.length} total={rows.length} noun="anak" />

      <Panel>
        <DataTable
          rows={filtered}
          columns={columns}
          getKey={(row) => row.child.id}
          loading={loading}
          caption="Daftar anak"
          empty={
            <EmptyState
              icon={<Baby className="size-6" aria-hidden />}
              title="Tidak ada data anak"
              description="Coba ubah kata kunci atau filter."
              className="border-none bg-transparent"
            />
          }
        />
      </Panel>
    </>
  );
}
