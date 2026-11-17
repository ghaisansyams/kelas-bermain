import { describeChildAge } from "@/lib/utils/age";
import { formatDate } from "@/lib/utils/date";
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
import { describeStats, statsByOwner, type DeletionStats } from "@/lib/admin/delete-records";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Outcome messages. Uses `msg` because `status` is already the list filter. */
const STATUS_NOTICE: Record<string, { tone: "success" | "error" | "info"; text: string }> = {
  deleted: { tone: "success", text: "Data dipindahkan ke menu Terhapus. Masih bisa dipulihkan selama 30 hari." },
  "wrong-confirm": {
    tone: "error",
    text: "Tulisan konfirmasi tidak cocok, jadi tidak ada yang dihapus.",
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

  const where = q
    ? {
        OR: [
          { full_name: { contains: q, mode: "insensitive" as const } },
          { nickname: { contains: q, mode: "insensitive" as const } },
          { child_number: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  type ChildRow = {
    id: string;
    child_number: string;
    full_name: string;
    nickname: string;
    date_of_birth: Date | null;
    age_years: number | null;
    age_months: number | null;
    school: string;
    status: string;
    customer_id: string;
    customers: { full_name: string } | null;
  };

  let rows: ChildRow[] = [];
  let count = 0;
  let error = false;
  const stats = new Map<string, DeletionStats>();

  try {
    const [list, total] = await Promise.all([
      db.children.findMany({
        where,
        select: {
          id: true,
          child_number: true,
          full_name: true,
          nickname: true,
          date_of_birth: true,
          age_years: true,
          age_months: true,
          school: true,
          status: true,
          customer_id: true,
          customers: { select: { full_name: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.children.count({ where }),
    ]);
    rows = list;
    count = total;

    // Hitungan untuk dialog hapus: satu kueri untuk seluruh halaman.
    for (const [id, value] of await statsByOwner("child_id", rows.map((row) => row.id))) {
      stats.set(id, value);
    }
  } catch {
    error = true;
  }

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
                <Th>Tanggal lahir</Th>
                <Th>Usia</Th>
                <Th>Pendamping</Th>
                <Th>Status</Th>
                <Th className="w-[9rem]">Aksi</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 ? (
                <EmptyRow colSpan={8}>Belum ada data anak.</EmptyRow>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <Td className="whitespace-nowrap font-mono text-xs font-bold text-ink">
                      {row.child_number}
                    </Td>
                    <Td className="font-semibold text-ink">{row.full_name}</Td>
                    <Td>{row.nickname || "—"}</Td>
                    <Td className="whitespace-nowrap">
                      {describeChildAge(row).birth
                        ? formatDate(describeChildAge(row).birth as string)
                        : "—"}
                    </Td>
                    <Td className="whitespace-nowrap">{describeChildAge(row).age}</Td>
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
                              value: `${stats.get(row.id)?.registrations ?? 0}`,
                            },
                          ]}
                          consequences={[
                            "Data anak ini",
                            ...describeStats(stats.get(row.id)),
                            ...((stats.get(row.id)?.payments ?? 0) > 0
                              ? [
                                  "Kalau pendaftaran anak ini memegang tagihan paket satu keluarga, tagihan itu ikut hilang walau anak lain di paket yang sama masih ada",
                                ]
                              : []),
                            "Kalau cuma ingin menyembunyikan dari daftar, nonaktifkan saja",
                          ]}
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
