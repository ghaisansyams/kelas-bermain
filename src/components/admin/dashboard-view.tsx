"use client";

import Link from "next/link";
import {
  Award,
  Baby,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  Users,
  Wallet,
} from "lucide-react";
import {
  BarList,
  ColumnChart,
  formatCurrencyShort,
  RateMeter,
} from "@/components/admin/charts";
import { AdminPageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/ui";
import { useCollection } from "@/hooks/use-collection";
import { getDashboard } from "@/lib/services/admin";
import { formatDateShort } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

export function DashboardView() {
  const { data, loading } = useCollection(() => getDashboard(), []);

  if (loading || !data) {
    return (
      <>
        <AdminPageHeader title="Dashboard" description="Ringkasan operasional Kelas Bermain." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="shimmer h-24 rounded-xl bg-line-soft" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="shimmer h-72 rounded-xl bg-line-soft" />
          <div className="shimmer h-72 rounded-xl bg-line-soft" />
        </div>
      </>
    );
  }

  const { stats } = data;

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Ringkasan operasional Kelas Bermain dari data pendaftaran, pembayaran, dan kehadiran."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Orang Tua"
          value={String(stats.customers)}
          detail="Customer terdaftar"
          icon={<Users className="size-4" aria-hidden />}
          tone="brand"
          href="/admin/customers"
        />
        <StatCard
          label="Total Anak"
          value={String(stats.children)}
          detail="Peserta terdata"
          icon={<Baby className="size-4" aria-hidden />}
          tone="sun"
          href="/admin/children"
        />
        <StatCard
          label="Event Akan Datang"
          value={String(stats.upcomingEvents)}
          detail="Sudah dipublikasikan"
          icon={<CalendarDays className="size-4" aria-hidden />}
          tone="sky"
          href="/admin/events"
        />
        <StatCard
          label="Pendaftaran Aktif"
          value={String(stats.activeRegistrations)}
          detail="Terdaftar & terkonfirmasi"
          icon={<ClipboardList className="size-4" aria-hidden />}
          tone="pine"
          href="/admin/registrations"
        />
        <StatCard
          label="Pembayaran Tertunda"
          value={String(stats.pendingPayments)}
          detail="Menunggu pelunasan"
          icon={<Wallet className="size-4" aria-hidden />}
          tone="sun"
          href="/admin/payments"
        />
        <StatCard
          label="Pendaftaran Lunas"
          value={String(stats.paidRegistrations)}
          detail={formatRupiah(stats.revenue)}
          icon={<Wallet className="size-4" aria-hidden />}
          tone="pine"
          href="/admin/payments"
        />
        <StatCard
          label="Kehadiran Hari Ini"
          value={String(stats.attendanceToday)}
          detail="Check-in tercatat"
          icon={<CheckCheck className="size-4" aria-hidden />}
          tone="grape"
          href="/admin/attendance"
        />
        <StatCard
          label="Sertifikat Terbit"
          value={String(stats.certificatesIssued)}
          detail="Total keseluruhan"
          icon={<Award className="size-4" aria-hidden />}
          tone="grape"
          href="/admin/certificates"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Pendaftaran per Bulan" description="Enam bulan terakhir">
          <div className="p-4 sm:p-5">
            <ColumnChart
              points={data.registrationsByMonth}
              tone="brand"
              caption="Jumlah pendaftaran per bulan selama enam bulan terakhir"
            />
          </div>
        </Panel>

        <Panel title="Pendapatan per Bulan" description="Hanya pembayaran berstatus lunas">
          <div className="p-4 sm:p-5">
            <ColumnChart
              points={data.revenueByMonth}
              tone="pine"
              caption="Pendapatan per bulan dari pembayaran lunas"
              format={formatCurrencyShort}
            />
          </div>
        </Panel>

        <Panel title="Pendaftaran per Event" description="Enam event teratas">
          <div className="p-4 sm:p-5">
            <BarList
              points={data.registrationsByEvent}
              tone="grape"
              caption="Jumlah pendaftaran per event"
            />
          </div>
        </Panel>

        <Panel title="Tingkat Kehadiran" description="Seluruh pendaftaran">
          <div className="p-4 sm:p-5">
            <RateMeter
              present={data.attendanceRate.present}
              absent={data.attendanceRate.absent}
              pending={data.attendanceRate.pending}
            />
          </div>
        </Panel>
      </div>

      <Panel
        className="mt-4"
        title="Pendaftaran Terbaru"
        actions={
          <Link
            href="/admin/registrations"
            className="text-xs font-bold text-brand hover:underline"
          >
            Lihat semua
          </Link>
        }
      >
        <ul className="divide-y divide-line">
          {data.recentRegistrations.map((row) => (
            <li
              key={row.registration.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 sm:px-5"
            >
              <span className="font-mono text-xs font-bold text-ink">
                {row.registration.registrationNumber}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                {row.child?.fullName ?? "—"}{" "}
                <span className="text-muted">· {row.event?.title ?? "—"}</span>
              </span>
              <StatusBadge status={row.registration.paymentStatus} />
              <span className="text-xs text-muted">
                {formatDateShort(row.registration.registrationDate)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
