"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
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
  formatRupiahShort,
  RateMeter,
} from "@/components/admin/charts";
import { PeriodFilter } from "@/components/admin/period-filter";
import {
  AdminPageHeader,
  Panel,
  StatCard,
  StatusBadge,
} from "@/components/admin/ui";
import { useCollection } from "@/hooks/use-collection";
import { getDashboard, resolveRange, type RangeKey } from "@/lib/services/admin";
import { formatDate, formatDateShort } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** Hadir / tidak hadir / belum diabsen, in that reading order. */
const SEGMENTS = [
  { key: "present", fill: "bg-pine" },
  { key: "absent", fill: "bg-brand" },
  { key: "pending", fill: "bg-line" },
] as const;

const GRANULARITY_LABEL = {
  day: "harian",
  week: "mingguan",
  month: "bulanan",
} as const;

export function DashboardView() {
  const [rangeKey, setRangeKey] = useState<RangeKey>("6m");
  const defaultCustom = useMemo(() => {
    const r = resolveRange("30d");
    return { from: r.from, to: r.to };
  }, []);
  const [custom, setCustom] = useState(defaultCustom);

  const { data, loading } = useCollection(
    () => getDashboard(rangeKey, new Date(), custom),
    [rangeKey, custom.from, custom.to],
  );

  const header = (
    <AdminPageHeader
      title="Dashboard"
      description={
        data
          ? `Periode ${formatDate(data.range.from)} – ${formatDate(data.range.to)} · agregat ${GRANULARITY_LABEL[data.granularity]}`
          : "Ringkasan operasional Kelas Bermain."
      }
      actions={
        <PeriodFilter
          value={rangeKey}
          custom={custom}
          onChange={(key, next) => {
            setRangeKey(key);
            if (next) setCustom(next);
          }}
        />
      }
    />
  );

  if (loading || !data) {
    return (
      <>
        {header}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="shimmer h-32 rounded-xl bg-line-soft" />
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="shimmer h-24 rounded-xl bg-line-soft" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="shimmer h-64 rounded-xl bg-line-soft" />
          <div className="shimmer h-64 rounded-xl bg-line-soft" />
        </div>
      </>
    );
  }

  const { stats } = data;

  return (
    <>
      {header}

      {/* Headline row — the four numbers the business is actually run on. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          size="lg"
          tone="money"
          label="Pendapatan Lunas"
          value={formatRupiah(stats.revenue)}
          trend={stats.revenueTrend}
          icon={<Wallet className="size-[1.125rem]" aria-hidden />}
          href="/admin/payments"
        />
        <StatCard
          size="lg"
          tone="info"
          label="Total Pendaftaran"
          value={String(stats.registrations)}
          trend={stats.registrationsTrend}
          detail={`${stats.activeRegistrations} masih aktif`}
          icon={<ClipboardList className="size-[1.125rem]" aria-hidden />}
          href="/admin/registrations"
        />
        <StatCard
          size="lg"
          tone="action"
          label="Pembayaran Tertunda"
          value={String(stats.pendingCount)}
          detail={`${formatRupiah(stats.pendingAmount)} · seluruh periode`}
          icon={<Wallet className="size-[1.125rem]" aria-hidden />}
          href="/admin/payments?status=PENDING"
          cta="Tindak lanjuti"
        />
        <StatCard
          size="lg"
          tone="money"
          label="Tingkat Kehadiran"
          value={`${stats.attendance.rate}%`}
          detail={`${stats.attendance.present} hadir dari ${
            stats.attendance.present + stats.attendance.absent + stats.attendance.pending
          } pendaftaran`}
          icon={<CheckCheck className="size-[1.125rem]" aria-hidden />}
          href="/admin/attendance"
        />
      </div>

      {/* Reference row — master data, deliberately quieter. */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          tone="neutral"
          label="Orang Tua"
          value={String(stats.customersTotal)}
          detail={`+${stats.customersAdded} pada periode ini`}
          icon={<Users className="size-4" aria-hidden />}
          href="/admin/customers"
        />
        <StatCard
          tone="neutral"
          label="Anak"
          value={String(stats.childrenTotal)}
          detail={`+${stats.childrenAdded} pada periode ini`}
          icon={<Baby className="size-4" aria-hidden />}
          href="/admin/children"
        />
        <StatCard
          tone="neutral"
          label="Event Akan Datang"
          value={String(stats.upcomingEvents)}
          detail="Sudah dipublikasikan"
          icon={<CalendarDays className="size-4" aria-hidden />}
          href="/admin/events"
        />
        {/* Replaced "Sertifikat Terbit" — Kelas Bermain issues none (R-06).
            The affiliate card the PRD calls for lands with F13. */}
        <StatCard
          tone="neutral"
          label="Rata-rata Peserta"
          value={stats.avgPerEvent.toLocaleString("id-ID")}
          detail={`per event · ${stats.eventsWithRegistrations} event terisi`}
          icon={<Users className="size-4" aria-hidden />}
          href="/admin/registrations"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Pendaftaran per Periode"
          description={`Agregat ${GRANULARITY_LABEL[data.granularity]}`}
        >
          <div className="p-4 sm:p-5">
            <ColumnChart
              points={data.registrationSeries}
              tone="brand"
              caption="Jumlah pendaftaran per periode"
            />
          </div>
        </Panel>

        <Panel
          title="Pendapatan per Periode"
          description="Hanya pembayaran berstatus lunas"
        >
          <div className="p-4 sm:p-5">
            <ColumnChart
              points={data.revenueSeries}
              tone="pine"
              caption="Pendapatan per periode dari pembayaran lunas"
              format={formatRupiahShort}
              axisFormat={formatRupiahShort}
            />
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          className="flex flex-col"
          title="Pendaftaran per Event"
          description="Enam event teratas"
        >
          <div className="flex-1 p-4 sm:p-5">
            <BarList
              points={data.registrationsByEvent}
              tone="grape"
              caption="Jumlah pendaftaran per event"
            />
          </div>
        </Panel>

        <Panel
          className="flex flex-col"
          title="Tingkat Kehadiran"
          description="Pendaftaran pada periode terpilih"
          actions={
            <Link
              href="/admin/attendance"
              className="text-xs font-bold text-brand hover:underline"
            >
              Kelola kehadiran
            </Link>
          }
        >
          <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
            <RateMeter
              present={stats.attendance.present}
              absent={stats.attendance.absent}
              pending={stats.attendance.pending}
              rate={stats.attendance.rate}
            />

            {/* Fills what used to be dead space. Deliberately NOT the recent
                registrations list — the panel directly below already prints it.
                The blended rate above hides which event is dragging it. */}
            <div className="mt-auto border-t border-line pt-3">
              <p className="mb-2.5 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                Kehadiran per event
              </p>
              {data.attendanceByEvent.length === 0 ? (
                <p className="py-2 text-xs text-muted">
                  Belum ada pendaftaran pada periode ini.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {data.attendanceByEvent.map((row) => (
                    <li key={row.label}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-xs font-semibold text-ink">
                          {row.label}
                        </span>
                        <span className="shrink-0 text-[0.6875rem] tabular-nums text-muted">
                          {row.present}/{row.total} hadir
                        </span>
                      </div>
                      <div className="mt-1 flex h-1.5 gap-0.5" aria-hidden>
                        {SEGMENTS.map(({ key, fill }) =>
                          row[key] > 0 ? (
                            <span
                              key={key}
                              className={cn("rounded-pill", fill)}
                              style={{ width: `${(row[key] / row.total) * 100}%` }}
                            />
                          ) : null,
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        className="mt-4"
        title="Pendaftaran Terbaru"
        description="Pada periode terpilih"
        actions={
          <Link
            href="/admin/registrations"
            className="text-xs font-bold text-brand hover:underline"
          >
            Lihat semua
          </Link>
        }
      >
        {data.recentRegistrations.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            Belum ada pendaftaran pada periode ini.
          </p>
        ) : (
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
        )}
      </Panel>
    </>
  );
}
