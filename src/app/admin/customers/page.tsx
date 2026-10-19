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
import { db } from "@/lib/db";
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

  const where = {
    ...(q
      ? {
          OR: [
            { full_name: { contains: q, mode: "insensitive" as const } },
            { whatsapp: { contains: q, mode: "insensitive" as const } },
            { customer_number: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    // Hanya dua nilai yang sah; apa pun lain di URL diabaikan, bukan dipakai
    // menyaring daftar sampai kosong.
    ...(status === "active" || status === "inactive" ? { status } : {}),
  };

  type CustomerRow = {
    id: string;
    customer_number: string;
    full_name: string;
    whatsapp: string;
    email: string;
    domicile: string;
    source: string;
    status: string;
    created_at: Date;
  };

  let rows: CustomerRow[] = [];
  let count = 0;
  let error = false;
  const registrationCount = new Map<string, number>();

  try {
    const [list, total] = await Promise.all([
      db.customers.findMany({
        where,
        select: {
          id: true,
          customer_number: true,
          full_name: true,
          whatsapp: true,
          email: true,
          domicile: true,
          source: true,
          status: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.customers.count({ where }),
    ]);
    rows = list;
    count = total;

    // Satu kueri tambahan, bukan satu per baris: pendamping mana yang sudah
    // punya pendaftaran, sehingga tidak bisa dihapus.
    const grouped = await db.registrations.groupBy({
      by: ["customer_id"],
      _count: { _all: true },
      where: { customer_id: { in: rows.map((row) => row.id) } },
    });
    for (const row of grouped) registrationCount.set(row.customer_id, row._count._all);
  } catch {
    error = true;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Pendamping" description="Data orang tua atau wali yang mendaftarkan anak. Anaknya sendiri ada di menu Anak." />

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
            Data gagal dimuat. Coba muat ulang halaman ini.
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
                    <Td>{formatDate(row.created_at.toISOString())}</Td>
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
                            title="Hapus data pendamping?"
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
                                ? `Pendamping ini punya ${registrationCount.get(row.id)} riwayat pendaftaran, jadi datanya tidak boleh dihapus — menghapusnya akan memutus catatan pembayaran dan kehadiran. Buka Detail pendamping ini untuk menonaktifkannya — datanya tetap tersimpan utuh.`
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
            total={count}
            basePath="/admin/customers"
            params={{ q, status }}
          />
        </>
      )}
    </div>
  );
}
