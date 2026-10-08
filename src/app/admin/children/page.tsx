import { Card, Notice, PageHeader } from "@/components/admin/admin-ui";
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
import { deleteChildAction } from "@/app/admin/children/actions";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Outcome messages. Uses `msg` because `status` is already the list filter. */
const STATUS_NOTICE: Record<string, { tone: "success" | "error" | "info"; text: string }> = {
  deleted: { tone: "success", text: "Data dihapus permanen." },
  "has-registrations": {
    tone: "error",
    text: "Tidak jadi dihapus: data ini punya riwayat pendaftaran. Menghapusnya akan memutus catatan pembayaran dan kehadiran.",
  },
  deactivated: { tone: "success", text: "Data dinonaktifkan." },
  activated: { tone: "success", text: "Data diaktifkan kembali." },
  error: { tone: "error", text: "Aksi gagal dijalankan." },
};

const PAGE_SIZE = 20;

export default async function AdminChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; msg?: string }>;
}) {
  const session = await requireAdmin();
  const { q, page: pageParam, msg } = await searchParams;
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

  // Which of these children already have registrations, and so cannot be
  // removed without breaking payment and attendance records.
  const ids = ((data ?? []) as unknown as { id: string }[]).map((row) => row.id);
  const { data: regRows } = ids.length
    ? await supabase.from("registrations").select("child_id").in("child_id", ids)
    : { data: [] };
  const registrationCount = new Map<string, number>();
  for (const row of (regRows ?? []) as { child_id: string }[]) {
    registrationCount.set(row.child_id, (registrationCount.get(row.child_id) ?? 0) + 1);
  }
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

      {msg && STATUS_NOTICE[msg] ? (
        <Notice tone={STATUS_NOTICE[msg].tone}>{STATUS_NOTICE[msg].text}</Notice>
      ) : null}

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
                <Th className="w-[9rem]">Aksi</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 ? (
                <EmptyRow colSpan={7}>Belum ada data anak.</EmptyRow>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <Td className="whitespace-nowrap font-mono text-xs font-bold text-ink">
                      {row.child_number}
                    </Td>
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
                    <Td>
                      {session.role === "SUPER_ADMIN" ? (
                        <DeleteDialog
                          action={deleteChildAction}
                          hidden={{ childId: row.id, code: row.child_number }}
                          code={row.child_number}
                          title="Hapus data anak?"
                          summary={[
                            { label: "Kode", value: row.child_number },
                            { label: "Nama", value: row.full_name },
                            { label: "Pendamping", value: row.customers?.full_name ?? "—" },
                            {
                              label: "Riwayat pendaftaran",
                              value: `${registrationCount.get(row.id) ?? 0}`,
                            },
                          ]}
                          consequences={["Data anak ini", "Catatan kehadiran dan sertifikatnya"]}
                          blockedReason={
                            (registrationCount.get(row.id) ?? 0) > 0
                              ? `Anak ini punya ${registrationCount.get(row.id)} riwayat pendaftaran, jadi datanya tidak boleh dihapus — menghapusnya akan memutus catatan pembayaran dan kehadiran. Untuk membersihkan data percobaan beserta seluruh riwayatnya, pakai skrip pembersihan di Supabase.`
                              : undefined
                          }
                        />
                      ) : null}
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
