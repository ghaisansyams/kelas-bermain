import { Card, PageHeader } from "@/components/admin/admin-ui";
import {
  EmptyRow,
  FilterBar,
  Pagination,
  SearchField,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/data-table";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function AdminChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin();
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("children")
    .select(
      "id, child_number, full_name, nickname, age_years, age_months, school, status, customer_id, customers(full_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) query = query.or(`full_name.ilike.%${q}%,nickname.ilike.%${q}%,child_number.ilike.%${q}%`);

  const { data, count, error } = await query;
  const rows = (data ?? []) as unknown as {
    id: string;
    child_number: string;
    full_name: string;
    nickname: string;
    age_years: number | null;
    age_months: number | null;
    school: string;
    status: string;
    customer_id: string;
    customers: { full_name: string } | null;
  }[];

  return (
    <div className="space-y-5">
      <PageHeader title="Anak" description="Master data anak, terhubung ke pendampingnya." />

      <FilterBar action="/admin/children">
        <SearchField value={q} />
      </FilterBar>

      {error ? (
        <Card>
          <p className="text-sm text-brand-ink">Data gagal dimuat.</p>
        </Card>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr className="border-b border-line">
                <Th>Kode</Th>
                <Th>Nama</Th>
                <Th>Panggilan</Th>
                <Th>Usia</Th>
                <Th>Pendamping</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 ? (
                <EmptyRow colSpan={6}>Belum ada data anak.</EmptyRow>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <Td className="font-mono text-xs font-bold text-ink">{row.child_number}</Td>
                    <Td className="font-semibold text-ink">{row.full_name}</Td>
                    <Td>{row.nickname || "—"}</Td>
                    <Td>
                      {row.age_years !== null
                        ? `${row.age_years} tahun${row.age_months ? ` ${row.age_months} bulan` : ""}`
                        : "—"}
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/customers/${row.customer_id}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        {row.customers?.full_name ?? "—"}
                      </Link>
                    </Td>
                    <Td>
                      <StatusBadge tone={row.status === "active" ? "green" : "grey"}>
                        {row.status === "active" ? "Aktif" : "Nonaktif"}
                      </StatusBadge>
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
            basePath="/admin/children"
            params={{ q }}
          />
        </>
      )}
    </div>
  );
}
