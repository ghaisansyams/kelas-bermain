import Link from "next/link";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import {
  EmptyRow,
  FilterBar,
  Pagination,
  SearchField,
  SelectField,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/data-table";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/date";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const { q, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("customers")
    .select("id, customer_number, full_name, whatsapp, email, domicile, source, status, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) query = query.or(`full_name.ilike.%${q}%,whatsapp.ilike.%${q}%,customer_number.ilike.%${q}%`);
  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  const rows = (data ?? []) as {
    id: string;
    customer_number: string;
    full_name: string;
    whatsapp: string;
    email: string;
    domicile: string;
    source: string;
    status: string;
    created_at: string;
  }[];

  return (
    <div className="space-y-5">
      <PageHeader title="Peserta" description="Master data pendamping / orang tua." />

      <FilterBar action="/admin/customers">
        <SearchField value={q} />
        <SelectField
          name="status"
          label="Status"
          value={status}
          options={[
            { value: "", label: "Semua" },
            { value: "active", label: "Aktif" },
            { value: "inactive", label: "Nonaktif" },
          ]}
        />
      </FilterBar>

      {error ? (
        <Card>
          <p className="text-sm text-brand-ink">
            Data gagal dimuat. Pastikan supabase/admin-schema.sql sudah dijalankan.
          </p>
        </Card>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr className="border-b border-line">
                <Th>Kode</Th>
                <Th>Nama</Th>
                <Th>WhatsApp</Th>
                <Th>Domisili</Th>
                <Th>Status</Th>
                <Th>Terdaftar</Th>
                <Th>Aksi</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 ? (
                <EmptyRow colSpan={7}>Belum ada data peserta.</EmptyRow>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <Td className="font-mono text-xs font-bold text-ink">{row.customer_number}</Td>
                    <Td className="font-semibold text-ink">{row.full_name}</Td>
                    <Td>{row.whatsapp}</Td>
                    <Td>{row.domicile || "—"}</Td>
                    <Td>
                      <StatusBadge tone={row.status === "active" ? "green" : "grey"}>
                        {row.status === "active" ? "Aktif" : "Nonaktif"}
                      </StatusBadge>
                    </Td>
                    <Td>{formatDate(row.created_at)}</Td>
                    <Td>
                      <Link
                        href={`/admin/customers/${row.id}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        Detail
                      </Link>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </TableShell>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={count ?? 0}
            basePath="/admin/customers"
            params={{ q, status }}
          />
        </>
      )}
    </div>
  );
}
