import Link from "next/link";
import { Plus } from "lucide-react";
import {
  duplicateEventAction,
  importCatalogueAction,
  setEventStatusAction,
} from "@/app/admin/events/actions";
import { Card, Notice, PageHeader } from "@/components/admin/admin-ui";
import { EmptyRow, StatusBadge, TableShell, Td, Th } from "@/components/admin/data-table";
import { requireAdmin } from "@/lib/admin/auth";
import { EVENT_STATUS_LABEL } from "@/lib/services/event-mapper";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, { tone: "success" | "error"; text: string }> = {
  imported: { tone: "success", text: "Katalog event berhasil diimpor ke database." },
  "status-changed": { tone: "success", text: "Status event diperbarui dan website disegarkan." },
  created: { tone: "success", text: "Event dibuat." },
  error: { tone: "error", text: "Aksi gagal. Coba lagi." },
};

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("events")
    .select("id, slug, title, category, start_date, capacity, registered, status, featured")
    .order("start_date", { ascending: false }).limit(200);

  const rows = (data ?? []) as {
    id: string;
    slug: string;
    title: string;
    category: string;
    start_date: string;
    capacity: number;
    registered: number;
    status: string;
    featured: boolean;
  }[];

  const notice = status ? NOTICES[status] : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Event"
        description="Sumber data event untuk website, registrasi, kehadiran, dan keuangan."
        action={
          <Link
            href="/admin/events/new"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-brand px-4 text-sm font-semibold text-white"
          >
            <Plus className="size-4" aria-hidden />
            Event Baru
          </Link>
        }
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {error ? (
        <Notice tone="error">
          Tabel event belum ada. Jalankan supabase/events-schema.sql terlebih dahulu.
        </Notice>
      ) : null}

      {!error && rows.length === 0 ? (
        <Card>
          <h2 className="text-base font-extrabold text-ink">Belum ada event di database</h2>
          <p className="mt-1.5 text-sm text-muted">
            Website masih memakai katalog bawaan di kode. Impor sekali agar event bisa
            diubah dari sini; isinya sama persis dengan yang sekarang tampil.
          </p>
          <form action={importCatalogueAction} className="mt-4">
            <button
              type="submit"
              className="inline-flex min-h-10 items-center rounded-pill bg-brand px-4 text-sm font-semibold text-white"
            >
              Impor dari katalog
            </button>
          </form>
        </Card>
      ) : null}

      {rows.length > 0 ? (
        <TableShell>
          <thead>
            <tr className="border-b border-line">
              <Th>Judul</Th>
              <Th>Kategori</Th>
              <Th>Tanggal</Th>
              <Th>Terdaftar</Th>
              <Th>Status</Th>
              <Th>Aksi</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <EmptyRow colSpan={6}>Belum ada event.</EmptyRow>
            ) : (
              rows.map((row) => {
                const label = EVENT_STATUS_LABEL[row.status] ?? { text: row.status, tone: "grey" };
                return (
                  <tr key={row.id}>
                    <Td className="font-semibold text-ink">
                      {row.title}
                      <span className="block text-xs font-normal text-muted">/{row.slug}</span>
                    </Td>
                    <Td>{row.category}</Td>
                    <Td>{formatDate(row.start_date)}</Td>
                    <Td>
                      {row.registered}/{row.capacity}
                    </Td>
                    <Td>
                      <StatusBadge tone={label.tone}>{label.text}</StatusBadge>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/events/${row.id}`}
                          className="text-xs font-semibold text-brand hover:underline"
                        >
                          Ubah
                        </Link>
                        <form action={setEventStatusAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={row.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
                          />
                          <button
                            type="submit"
                            className="text-xs font-semibold text-ink-soft hover:text-brand"
                          >
                            {row.status === "PUBLISHED" ? "Sembunyikan" : "Tayangkan"}
                          </button>
                        </form>
                        <form action={duplicateEventAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <button
                            type="submit"
                            className="text-xs font-semibold text-ink-soft hover:text-brand"
                          >
                            Duplikat
                          </button>
                        </form>
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </TableShell>
      ) : null}
    </div>
  );
}
