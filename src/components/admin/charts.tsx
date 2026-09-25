"use client";

import { useId, useState } from "react";
import type { SeriesPoint } from "@/lib/services/admin";
import { cn } from "@/lib/utils/cn";
import { formatRupiah } from "@/lib/utils/format";

/**
 * Dashboard charts.
 *
 * Every chart carries a single series, so the title names it and no legend or
 * categorical palette is needed — which also means no colour pair to confuse a
 * colourblind reader. Two measures are never stacked on one pair of axes;
 * registrations and revenue are separate charts on their own scales.
 *
 * Each chart also renders a screen-reader table so the numbers are reachable
 * without seeing the marks.
 */

type Tone = "brand" | "pine" | "grape" | "sky";

const FILL: Record<Tone, string> = {
  brand: "bg-brand",
  pine: "bg-pine",
  grape: "bg-grape",
  sky: "bg-sky",
};

function DataTableFallback({
  caption,
  points,
  format,
}: {
  caption: string;
  points: SeriesPoint[];
  format: (value: number) => string;
}) {
  return (
    // The wrapper does the clipping; `sr-only` on a <table> lets it size to
    // content and stretch the page.
    <div className="sr-only">
    <table>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Periode</th>
          <th scope="col">Nilai</th>
        </tr>
      </thead>
      <tbody>
        {points.map((point) => (
          <tr key={point.label}>
            <th scope="row">{point.label}</th>
            <td>{format(point.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

/** Vertical bars for a value over time. */
export function ColumnChart({
  points,
  tone = "brand",
  caption,
  format = (v) => String(v),
  height = 180,
}: {
  points: SeriesPoint[];
  tone?: Tone;
  caption: string;
  format?: (value: number) => string;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const labelId = useId();

  return (
    <figure className="m-0">
      <div
        className="relative flex items-end gap-2 sm:gap-3"
        style={{ height }}
        role="group"
        aria-labelledby={labelId}
      >
        {/* Recessive baseline */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-line" />
        {points.map((point, index) => {
          const ratio = point.value / max;
          const isActive = active === index;
          return (
            <div
              key={point.label}
              className="group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
              style={{ height }}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
            >
              {isActive ? (
                <span className="pointer-events-none absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-canvas shadow-lift">
                  {point.label}: {format(point.value)}
                </span>
              ) : null}
              <button
                type="button"
                aria-label={`${point.label}: ${format(point.value)}`}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className={cn(
                  // 4px rounded data-end, anchored to the baseline.
                  "w-full max-w-10 rounded-t-[4px] transition-[height,opacity] duration-300",
                  FILL[tone],
                  active !== null && !isActive ? "opacity-45" : "opacity-100",
                )}
                style={{ height: `${Math.max(ratio * (height - 24), point.value > 0 ? 4 : 2)}px` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {points.map((point) => (
          <span
            key={point.label}
            className="min-w-0 flex-1 truncate text-center text-[0.6875rem] font-medium text-muted"
          >
            {point.label}
          </span>
        ))}
      </div>
      <figcaption id={labelId} className="sr-only">
        {caption}
      </figcaption>
      <DataTableFallback caption={caption} points={points} format={format} />
    </figure>
  );
}

/** Horizontal bars for magnitude across named categories. */
export function BarList({
  points,
  tone = "grape",
  caption,
  format = (v) => String(v),
}: {
  points: SeriesPoint[];
  tone?: Tone;
  caption: string;
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));

  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">Belum ada data.</p>;
  }

  return (
    <figure className="m-0 space-y-3">
      {points.map((point) => (
        <div key={point.label} className="group">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-xs font-semibold text-ink-soft">
              {point.label}
            </span>
            {/* Direct label — no tooltip needed to read the value. */}
            <span className="shrink-0 text-xs font-bold tabular-nums text-ink">
              {format(point.value)}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-canvas-deep">
            <div
              className={cn("h-full rounded-pill transition-[width] duration-500", FILL[tone])}
              style={{ width: `${Math.max((point.value / max) * 100, 3)}%` }}
            />
          </div>
        </div>
      ))}
      <figcaption className="sr-only">{caption}</figcaption>
      <DataTableFallback caption={caption} points={points} format={format} />
    </figure>
  );
}

/**
 * Attendance as a single rate, not a stacked bar — one measure, one hue, and
 * the three underlying counts spelled out beside it.
 */
export function RateMeter({
  present,
  absent,
  pending,
}: {
  present: number;
  absent: number;
  pending: number;
}) {
  const total = present + absent + pending;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <figure className="m-0">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tabular-nums leading-none text-ink">
          {rate}%
        </span>
        <span className="text-xs text-muted">peserta hadir</span>
      </div>

      <div
        className="mt-3 h-2.5 overflow-hidden rounded-pill bg-canvas-deep"
        role="progressbar"
        aria-valuenow={rate}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tingkat kehadiran peserta"
      >
        <div
          className="h-full rounded-pill bg-pine transition-[width] duration-700"
          style={{ width: `${Math.max(rate, 2)}%` }}
        />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Hadir", value: present },
          { label: "Tidak hadir", value: absent },
          { label: "Belum", value: pending },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-canvas-deep/50 px-2 py-2.5">
            <dt className="text-[0.6875rem] font-semibold text-muted">{item.label}</dt>
            <dd className="mt-0.5 text-base font-extrabold tabular-nums text-ink">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      <figcaption className="sr-only">
        Tingkat kehadiran {rate} persen. Hadir {present}, tidak hadir {absent}, belum
        tercatat {pending}, dari total {total} pendaftaran.
      </figcaption>
    </figure>
  );
}

export const formatCurrencyShort = (value: number): string =>
  value >= 1_000_000
    ? `Rp${(value / 1_000_000).toFixed(1).replace(".0", "")}jt`
    : value >= 1_000
      ? `Rp${Math.round(value / 1000)}rb`
      : formatRupiah(value);
