import Link from "next/link";
import { Card, Notice, PageHeader } from "@/components/admin/admin-ui";
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
import { deleteCustomerAction } from "@/app/admin/customers/actions";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/date";

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

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; msg?: string }>;
}) {
  const session = await requireAdmin();
  const { q, status, page: pageParam, msg } = await searchParams;
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

  // One extra query instead of one per row: which of these customers already
  // have registrations, and therefore cannot be removed.
  const ids = ((data ?? []) as { id: string }[]).map((row) => row.id);
  const { data: regRows } = ids.length
    ? await supabase.from("registrations").select("customer_id").in("customer_id", ids)
    : { data: [] };
  const registrationCount = new Map<string, number>();
  for (const row of (regRows ?? []) as { customer_id: string }[]) {
    registrationCount.set(row.customer_id, (registrationCount.get(row.customer_id) ?? 0) + 1);
  }
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

      {msg && STATUS_NOTICE[msg] ? (
        <Notice tone={STATUS_NOTICE[msg].tone}>{STATUS_NOTICE[msg].text}</Notice>
      ) : null}

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
                <Th className="w-[12rem]">Aksi</Th>
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
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/customers/${row.id}`}
                          className="whitespace-nowrap font-semibold text-brand hover:underline"
                        >
                          Detail
                        </Link>
                        {session.role === "SUPER_ADMIN" ? (
                          <DeleteDialog
                            action={deleteCustomerAction}
                            hidden={{ customerId: row.id, code: row.customer_number }}
                            code={row.customer_number}
                            title="Hapus data peserta?"
                            summary={[
                              { label: "Kode", value: row.customer_number },
                              { label: "Nama", value: row.full_name },
                              { label: "WhatsApp", value: row.whatsapp },
                              {
                                label: "Riwayat pendaftaran",
                                value: `${registrationCount.get(row.id) ?? 0}`,
                              },
                            ]}
                            consequences={[
                              "Data pendamping ini",
                              "Semua data anak yang terdaftar atas namanya",
                            ]}
                            blockedReason={
                              (registrationCount.get(row.id) ?? 0) > 0
                                ? `Peserta ini punya ${registrationCount.get(row.id)} riwayat pendaftaran, jadi datanya tidak boleh dihapus — menghapusnya akan memutus catatan pembayaran dan kehadiran. Buka Detail peserta ini untuk menonaktifkannya — datanya tetap tersimpan utuh.`
                                : undefined
                            }
                          />
                        ) : null}
                      </div>
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
