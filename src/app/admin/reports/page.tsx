import Link from "next/link";
import { Download } from "lucide-react";
import { Card, Notice, PageHeader, StatCard } from "@/components/admin/admin-ui";
import { EmptyRow, TableShell, Td, Th } from "@/components/admin/data-table";
import { requireAdmin } from "@/lib/admin/auth";
import { getEvents } from "@/lib/services/content";
import { buildReport, defaultRange } from "@/lib/services/report";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireAdmin();
  const { from, to } = await searchParams;
  const fallback = defaultRange();
  const range = { from: from ?? fallback.from, to: to ?? fallback.to };

  const [events, supabase] = await Promise.all([getEvents(), createSupabaseServerClient()]);
  const titles = new Map(
    events.map((item) => [item.id, { title: item.title, startDate: item.startDate }]),
  );
  const report = await buildReport(supabase, range, titles);
  const query = `from=${range.from}&to=${range.to}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan"
        description="Angka dihitung langsung dari registrasi, pembayaran, dan buku kas — bukan data contoh."
        action={
          <Link
            href={`/admin/reports/export?${query}&type=events`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-brand px-4 text-sm font-bold text-white"
          >
            <Download className="size-4" aria-hidden />
            Unduh CSV
          </Link>
        }
      />

      {!report.complete ? (
        <Notice tone="error">
          Angka di bawah belum lengkap: tabel {report.missing.join(", ")} tidak terbaca. Jalankan
          file SQL yang belum dijalankan sebelum memakai laporan ini sebagai dasar keputusan.
        </Notice>
      ) : null}

      <Card>
        <form className="flex flex-wrap items-end gap-3" action="/admin/reports">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Dari
            <input
              type="date"
              name="from"
              defaultValue={range.from}
              className="h-11 rounded-xl border border-line bg-surface px-3 text-[0.9375rem] text-ink"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
            Sampai
            <input
              type="date"
              name="to"
              defaultValue={range.to}
              className="h-11 rounded-xl border border-line bg-surface px-3 text-[0.9375rem] text-ink"
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-pill bg-brand px-5 text-sm font-bold text-white"
          >
            Terapkan
          </button>
          <Link
            href="/admin/reports"
            className="inline-flex min-h-11 items-center rounded-pill border border-line px-5 text-sm font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
          >
            Bulan ini
          </Link>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pendapatan"
          value={formatRupiah(report.revenue)}
          hint={`Refund ${formatRupiah(report.refunds)}`}
        />
        <StatCard label="Pendapatan bersih" value={formatRupiah(report.net)} />
        <StatCard
          label="Registrasi"
          value={String(report.registrations)}
          hint={`${report.paidRegistrations} lunas · ${report.pendingRegistrations} menunggu`}
        />
        <StatCard
          label="Konversi bayar"
          value={`${report.conversionRate}%`}
          hint="Registrasi lunas / total"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Anak hadir" value={String(report.present)} />
        <StatCard label="Tingkat kehadiran" value={`${report.attendanceRate}%`} />
        <StatCard label="Sertifikat terbit" value={String(report.certificates)} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-extrabold text-ink">Rekap per event</h2>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <Link
              href={`/admin/reports/export?${query}&type=registrations`}
              className="inline-flex min-h-9 items-center rounded-pill border border-line px-3 text-ink-soft hover:border-brand/40 hover:text-brand"
            >
              CSV registrasi
            </Link>
            <Link
              href={`/admin/reports/export?${query}&type=payments`}
              className="inline-flex min-h-9 items-center rounded-pill border border-line px-3 text-ink-soft hover:border-brand/40 hover:text-brand"
            >
              CSV pembayaran
            </Link>
          </div>
        </div>

        <TableShell>
          <thead>
            <tr className="border-b border-line">
              <Th>Event</Th>
              <Th>Tanggal</Th>
              <Th>Registrasi</Th>
              <Th>Lunas</Th>
              <Th>Menunggu</Th>
              <Th>Batal</Th>
              <Th>Hadir</Th>
              <Th>Sertifikat</Th>
              <Th>Pendapatan</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {report.events.length === 0 ? (
              <EmptyRow colSpan={9}>Belum ada data pada rentang tanggal ini.</EmptyRow>
            ) : (
              report.events.map((row) => (
                <tr key={row.eventId}>
                  <Td className="font-semibold text-ink">{row.eventTitle}</Td>
                  <Td className="text-xs">{row.startDate ? formatDate(row.startDate) : "—"}</Td>
                  <Td>{row.registrations}</Td>
                  <Td>{row.paid}</Td>
                  <Td>{row.pending}</Td>
                  <Td>{row.cancelled}</Td>
                  <Td>{row.present}</Td>
                  <Td>{row.certificates}</Td>
                  <Td className="font-semibold text-ink">{formatRupiah(row.revenue)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TableShell>
      </div>
    </div>
  );
}
