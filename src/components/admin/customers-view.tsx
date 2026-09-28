"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, Users } from "lucide-react";
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
import { sourceLabel } from "@/lib/repositories/types";
import { downloadCsv, getCustomerRows, toCsv, type CustomerRow } from "@/lib/services/admin";
import { formatDateShort } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

export function CustomersView() {
  const { data, loading } = useCollection(() => getCustomerRows(), []);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [city, setCity] = useState("all");

  const rows = useMemo(() => data ?? [], [data]);

  const cities = useMemo(
    () => [...new Set(rows.map((r) => r.customer.city))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const c = row.customer;
      const matchesQuery =
        !q ||
        [c.fullName, c.customerNumber, c.email, c.whatsapp, c.city, c.domicile].some(
          (v) => (v ?? "").toLowerCase().includes(q),
        );
      return (
        matchesQuery &&
        (status === "all" || c.status === status) &&
        (city === "all" || c.city === city)
      );
    });
  }, [rows, query, status, city]);

  const columns: Column<CustomerRow>[] = [
    {
      key: "number",
      header: "Customer ID",
      render: (row) => (
        <Link
          href={`/admin/customers/${row.customer.id}`}
          className="font-mono text-xs font-bold text-brand hover:underline"
        >
          {row.customer.customerNumber}
        </Link>
      ),
    },
    {
      key: "name",
      header: "Nama Orang Tua",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{row.customer.fullName}</p>
          <p className="truncate text-xs text-muted">{row.customer.city}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Kontak",
      hideBelow: "md",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs text-ink-soft">{row.customer.whatsapp}</p>
          <p className="truncate text-xs text-muted">{row.customer.email}</p>
        </div>
      ),
    },
    {
      key: "children",
      header: "Anak",
      className: "text-center",
      render: (row) => <span className="tabular-nums">{row.childCount}</span>,
    },
    {
      key: "registrations",
      header: "Pendaftaran",
      className: "text-center",
      render: (row) => <span className="tabular-nums">{row.registrationCount}</span>,
    },
    {
      key: "paid",
      header: "Total Bayar",
      hideBelow: "lg",
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums">{formatRupiah(row.totalPaid)}</span>
      ),
    },
    {
      key: "last",
      header: "Terakhir Daftar",
      hideBelow: "lg",
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-muted">
          {row.lastRegistrationAt ? formatDateShort(row.lastRegistrationAt) : "—"}
        </span>
      ),
    },
    {
      key: "source",
      header: "Sumber",
      hideBelow: "lg",
      render: (row) => (
        <span className="text-xs text-muted">{sourceLabel[row.customer.source]}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.customer.status} />,
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <Link
          href={`/admin/customers/${row.customer.id}`}
          aria-label={`Lihat detail ${row.customer.fullName}`}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-brand/40 hover:text-brand"
        >
          <Eye className="size-4" aria-hidden />
        </Link>
      ),
    },
  ];

  function exportCsv() {
    const csv = toCsv(filtered, [
      { header: "Customer ID", value: (r) => r.customer.customerNumber },
      { header: "Nama", value: (r) => r.customer.fullName },
      { header: "Email", value: (r) => r.customer.email },
      { header: "WhatsApp", value: (r) => r.customer.whatsapp },
      { header: "Kota", value: (r) => r.customer.city },
      { header: "Alamat", value: (r) => r.customer.address },
      { header: "Pekerjaan", value: (r) => r.customer.occupation },
      { header: "Jumlah Anak", value: (r) => r.childCount },
      { header: "Jumlah Pendaftaran", value: (r) => r.registrationCount },
      { header: "Total Bayar", value: (r) => r.totalPaid },
      { header: "Sumber", value: (r) => sourceLabel[r.customer.source] },
      { header: "Status", value: (r) => r.customer.status },
    ]);
    downloadCsv("kelas-bermain-orang-tua.csv", csv);
  }

  return (
    <>
      <AdminPageHeader
        title="Orang Tua / Customer"
        description="Data induk keluarga. Satu customer bisa memiliki beberapa anak dan banyak pendaftaran."
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
          placeholder="Nama, nomor customer, email, WhatsApp…"
        />
        <FilterSelect
          label="Kota"
          value={city}
          onChange={setCity}
          options={[
            { value: "all", label: "Semua kota" },
            ...cities.map((c) => ({ value: c, label: c })),
          ]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "Semua" },
            { value: "active", label: "Aktif" },
            { value: "inactive", label: "Nonaktif" },
          ]}
        />
      </FilterBar>

      <ResultCount shown={filtered.length} total={rows.length} noun="customer" />

      <Panel>
        <DataTable
          rows={filtered}
          columns={columns}
          getKey={(row) => row.customer.id}
          loading={loading}
          caption="Daftar orang tua / customer"
          empty={
            <EmptyState
              icon={<Users className="size-6" aria-hidden />}
              title="Tidak ada customer"
              description="Coba ubah kata kunci atau filter."
              className="border-none bg-transparent"
            />
          }
        />
      </Panel>
    </>
  );
}
