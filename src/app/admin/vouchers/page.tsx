import Link from "next/link";
import {
  deleteVoucherAction,
  saveVoucherAction,
  toggleVoucherAction,
} from "@/app/admin/vouchers/actions";
import { Card, Notice, PageHeader, StatCard } from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyRow, StatusBadge, TableShell, Td, Th } from "@/components/admin/data-table";
import { VoucherForm, type VoucherFormValues } from "@/components/admin/voucher-form";
import { requireAdmin } from "@/lib/admin/auth";
import { getEvents } from "@/lib/services/content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

interface VoucherRow {
  code: string;
  description: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  max_discount: number | null;
  max_uses: number | null;
  used_count: number;
  min_children: number;
  event_id: string | null;
  valid_from: string | null;
  valid_until: string | null;
  status: "ACTIVE" | "INACTIVE";
}

const NOTICES: Record<string, { tone: "success" | "error" | "info"; text: string }> = {
  created: { tone: "success", text: "Voucher dibuat." },
  updated: { tone: "success", text: "Voucher diperbarui." },
  deleted: { tone: "success", text: "Voucher dihapus." },
  invalid: { tone: "error", text: "Periksa kode dan nilai potongan." },
  used: {
    tone: "info",
    text: "Voucher ini sudah pernah dipakai, jadi tidak bisa dihapus. Nonaktifkan saja.",
  },
  error: { tone: "error", text: "Aksi gagal dijalankan." },
};

function toFormValues(row: VoucherRow): VoucherFormValues {
  return {
    code: row.code,
    description: row.description,
    type: row.type,
    value: Number(row.value),
    maxDiscount: row.max_discount == null ? null : Number(row.max_discount),
    maxUses: row.max_uses,
    minChildren: row.min_children,
    eventId: row.event_id ?? "",
    validFrom: row.valid_from ?? "",
    validUntil: row.valid_until ?? "",
    status: row.status,
  };
}

function periodLabel(row: VoucherRow): string {
  if (!row.valid_from && !row.valid_until) return "Tanpa batas";
  const from = row.valid_from ? formatDate(row.valid_from) : "—";
  const until = row.valid_until ? formatDate(row.valid_until) : "—";
  return `${from} → ${until}`;
}

export default async function AdminVouchersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; edit?: string }>;
}) {
  await requireAdmin();
  const { status, edit } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [{ data, error }, events] = await Promise.all([
    supabase.from("vouchers").select("*").order("created_at", { ascending: false }).limit(200),
    getEvents(),
  ]);

  const rows = (data ?? []) as unknown as VoucherRow[];
  const active = rows.filter((row) => row.status === "ACTIVE").length;
  const redeemed = rows.reduce((total, row) => total + row.used_count, 0);
  const editing = edit ? rows.find((row) => row.code === edit) : undefined;
  const notice = status ? NOTICES[status] : undefined;
  const eventOptions = events.map((event) => ({ id: event.id, title: event.title }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Voucher"
        description="Kode yang bisa dipakai pendaftar di langkah Konfirmasi. Daftar kode tidak pernah dikirim ke browser — pendaftar hanya bisa menanyakan satu kode."
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      {error ? (
        <Notice tone="error">
          Tabel voucher belum ada. Jalankan supabase/voucher-users-schema.sql di SQL Editor.
        </Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total voucher" value={String(rows.length)} />
        <StatCard label="Aktif" value={String(active)} />
        <StatCard label="Total dipakai" value={String(redeemed)} />
      </div>

      <div className="space-y-2">
        <h2 className="text-base font-extrabold text-ink">
          {editing ? `Ubah voucher ${editing.code}` : "Buat voucher baru"}
        </h2>
        <VoucherForm
          action={saveVoucherAction}
          initial={editing ? toFormValues(editing) : undefined}
          events={eventOptions}
        />
        {editing ? (
          <Link
            href="/admin/vouchers"
            className="inline-flex text-sm font-semibold text-muted hover:text-brand"
          >
            Batal mengubah, kembali ke form voucher baru
          </Link>
        ) : null}
      </div>

      <TableShell>
        <thead>
          <tr className="border-b border-line">
            <Th>Kode</Th>
            <Th>Potongan</Th>
            <Th>Syarat</Th>
            <Th>Periode</Th>
            <Th>Dipakai</Th>
            <Th>Status</Th>
            <Th>Aksi</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <EmptyRow colSpan={7}>Belum ada voucher.</EmptyRow>
          ) : (
            rows.map((row) => {
              const eventTitle = row.event_id
                ? (events.find((event) => event.id === row.event_id)?.title ?? row.event_id)
                : "Semua event";
              return (
                <tr key={row.code}>
                  <Td>
                    <span className="font-mono text-xs font-bold text-ink">{row.code}</span>
                    {row.description ? (
                      <span className="mt-0.5 block text-xs text-muted">{row.description}</span>
                    ) : null}
                  </Td>
                  <Td className="font-semibold text-ink">
                    {row.type === "FIXED"
                      ? formatRupiah(Number(row.value))
                      : `${Number(row.value)}%`}
                    {row.type === "PERCENTAGE" && row.max_discount ? (
                      <span className="mt-0.5 block text-xs font-medium text-muted">
                        maks {formatRupiah(Number(row.max_discount))}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="text-xs">
                    Min {row.min_children} anak
                    <span className="mt-0.5 block text-muted">{eventTitle}</span>
                  </Td>
                  <Td className="text-xs">{periodLabel(row)}</Td>
                  <Td className="text-xs font-semibold text-ink">
                    {row.used_count}
                    {row.max_uses ? ` / ${row.max_uses}` : ""}
                  </Td>
                  <Td>
                    <StatusBadge tone={row.status === "ACTIVE" ? "pine" : "grey"}>
                      {row.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                    </StatusBadge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/vouchers?edit=${row.code}`}
                        className="inline-flex min-h-9 items-center rounded-pill border border-line px-3 text-xs font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
                      >
                        Ubah
                      </Link>
                      <form action={toggleVoucherAction}>
                        <input type="hidden" name="code" value={row.code} />
                        <input
                          type="hidden"
                          name="next"
                          value={row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"}
                        />
                        <button
                          type="submit"
                          className="inline-flex min-h-9 items-center rounded-pill border border-line px-3 text-xs font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
                        >
                          {row.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </form>
                      {row.used_count === 0 ? (
                        <ConfirmDialog
                          action={deleteVoucherAction}
                          hidden={{ code: row.code }}
                          trigger="Hapus"
                          title="Hapus voucher"
                          description="Voucher ini belum pernah dipakai, jadi aman dihapus."
                          summary={[{ label: "Kode", value: row.code }]}
                          confirmLabel="Hapus voucher"
                          tone="danger"
                        />
                      ) : null}
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </TableShell>

      <Card>
        <h2 className="text-sm font-extrabold text-ink">Cara kerjanya</h2>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-soft">
          <li>
            Potongan voucher dihitung setelah diskon Sibling/Group/Affiliate, bukan ditumpuk
            sebagai persentase dari harga asli.
          </li>
          <li>
            Pemakaian baru tercatat saat registrasi benar-benar dibuat — kode tidak hangus hanya
            karena ada yang mencoba mengetiknya.
          </li>
          <li>
            Voucher yang sudah pernah dipakai tidak bisa dihapus, hanya dinonaktifkan, supaya
            riwayat pemakaiannya tetap bisa dibaca.
          </li>
        </ul>
      </Card>
    </div>
  );
}
