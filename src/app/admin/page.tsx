import Link from "next/link";
import { Card, Notice, PageHeader, StatCard } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getUpcomingEvents } from "@/lib/services/content";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

interface RecentRegistration {
  registration_number: string;
  registration_date: Date;
  status: string;
  payment_status: string;
  customers: { full_name: string } | null;
  children: { full_name: string } | null;
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  // "Hari ini" menurut Jakarta, bukan UTC. Batas UTC jatuh pukul 07.00 WIB,
  // jadi pendaftaran pukul 02.00 pagi tercatat sebagai kemarin.
  const wibDate = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const startOfToday = new Date(`${wibDate}T00:00:00+07:00`);

  let failed = false;
  let customers = 0;
  let children = 0;
  let registrations = 0;
  let todayRegistrations = 0;
  let pendingPayments = 0;
  let paidTotal = 0;
  let recentRows: RecentRegistration[] = [];
  const events = await getUpcomingEvents(5);

  try {
    const [c, ch, r, today, pending, paid, recent] = await Promise.all([
      db.customers.count(),
      db.children.count(),
      db.registrations.count(),
      db.registrations.count({ where: { registration_date: { gte: startOfToday } } }),
      // Menunggu dicek ikut dihitung: itu pembayaran yang butuh tindakan admin,
      // dan tanpa ini angkanya tidak naik tepat saat ada pekerjaan menunggu.
      db.payments.count({ where: { status: { in: ["PENDING", "WAITING_VERIFICATION"] } } }),
      db.payments.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
      db.registrations.findMany({
        select: {
          registration_number: true,
          registration_date: true,
          status: true,
          payment_status: true,
          customers: { select: { full_name: true } },
          children: { select: { full_name: true } },
        },
        orderBy: { registration_date: "desc" },
        take: 5,
      }),
    ]);
    customers = c;
    children = ch;
    registrations = r;
    todayRegistrations = today;
    pendingPayments = pending;
    paidTotal = Number(paid._sum.amount ?? 0);
    recentRows = recent;
  } catch {
    failed = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Angka di bawah diambil langsung dari database, bukan contoh."
      />

      {failed ? <Notice tone="error">Sebagian data gagal dimuat. Muat ulang halaman.</Notice> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Pendamping" value={String(customers)} />
        <StatCard label="Anak" value={String(children)} />
        <StatCard label="Registrasi" value={String(registrations)} />
        <StatCard label="Registrasi hari ini" value={String(todayRegistrations)} />
        <StatCard label="Pembayaran pending" value={String(pendingPayments)} />
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
