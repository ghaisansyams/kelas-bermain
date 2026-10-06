import Link from "next/link";
import { Card, Notice, PageHeader, StatCard } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getUpcomingEvents } from "@/lib/services/content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

interface RecentRegistration {
  registration_number: string;
  registration_date: string;
  status: string;
  payment_status: string;
  customers: { full_name: string } | null;
  children: { full_name: string } | null;
}

export default async function AdminDashboardPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const [customers, children, registrations, todayRegistrations, pendingPayments, paidPayments, recent, events] =
    await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("children").select("id", { count: "exact", head: true }),
      supabase.from("registrations").select("id", { count: "exact", head: true }),
      supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .gte("registration_date", `${todayIso}T00:00:00`),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
      supabase.from("payments").select("amount").eq("status", "PAID"),
      supabase
        .from("registrations")
        .select(
          "registration_number, registration_date, status, payment_status, customers(full_name), children(full_name)",
        )
        .order("registration_date", { ascending: false })
        .limit(5),
      getUpcomingEvents(5),
    ]);

  const failed = customers.error ?? registrations.error ?? null;
  const paidTotal = (paidPayments.data ?? []).reduce(
    (sum, row) => sum + Number((row as { amount: number }).amount ?? 0),
    0,
  );
  const recentRows = (recent.data ?? []) as unknown as RecentRegistration[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Angka di bawah diambil langsung dari database, bukan contoh."
      />

      {failed ? <Notice tone="error">Sebagian data gagal dimuat. Muat ulang halaman.</Notice> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Pendamping" value={String(customers.count ?? 0)} />
        <StatCard label="Anak" value={String(children.count ?? 0)} />
        <StatCard label="Registrasi" value={String(registrations.count ?? 0)} />
        <StatCard label="Registrasi hari ini" value={String(todayRegistrations.count ?? 0)} />
        <StatCard label="Pembayaran pending" value={String(pendingPayments.count ?? 0)} />
        <StatCard
          label="Pembayaran lunas"
          value={formatRupiah(paidTotal)}
          hint="Hanya pembayaran berstatus PAID"
        />
      </div>

      <Card>
        <h2 className="text-base font-extrabold text-ink">Registrasi terbaru</h2>
        {recentRows.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada registrasi.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="pb-2">Nomor</th>
                  <th className="pb-2">Pendamping</th>
                  <th className="pb-2">Anak</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Pembayaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recentRows.map((row) => (
                  <tr key={row.registration_number}>
                    <td className="py-2.5 font-mono text-xs font-bold text-ink">
                      {row.registration_number}
                    </td>
                    <td className="py-2.5 text-ink-soft">{row.customers?.full_name ?? "—"}</td>
                    <td className="py-2.5 text-ink-soft">{row.children?.full_name ?? "—"}</td>
                    <td className="py-2.5 text-ink-soft">{row.status}</td>
                    <td className="py-2.5 text-ink-soft">{row.payment_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-base font-extrabold text-ink">Event terdekat</h2>
        <p className="mt-1 text-xs text-muted">
          Event masih dibaca dari katalog di kode. Pemindahan event ke database adalah
          tahap berikutnya.
        </p>
        <ul className="mt-4 space-y-2.5">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-ink">{event.title}</span>
              <span className="text-muted">
                {formatDate(event.startDate)} · {event.registered}/{event.capacity} peserta
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-base font-extrabold text-ink">Ubah konten website</h2>
        <p className="mt-1 text-sm text-muted">
          Perubahan yang dipublikasikan langsung tampil di website tanpa deploy ulang.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Link
            href="/admin/cms/home"
            className="inline-flex min-h-10 items-center rounded-pill border border-line px-4 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
          >
            CMS Home
          </Link>
          <Link
            href="/admin/cms/navigation"
            className="inline-flex min-h-10 items-center rounded-pill border border-line px-4 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
          >
            CMS Navigasi
          </Link>
        </div>
      </Card>
    </div>
  );
}
