"use client";

import { useId, useState } from "react";
import type { SeriesPoint } from "@/lib/services/admin";
import { cn } from "@/lib/utils/cn";
import { formatRupiah } from "@/lib/utils/format";

/**
 * Dashboard charts, hand-built — the project carries no charting library.
 *
 * Every chart shows a single series, so its title names it and no legend or
 * categorical palette is needed, which also means no colour pair that a
 * colourblind reader has to separate. Two measures are never put on one pair
 * of axes; registrations and revenue are separate charts on their own scales.
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

/** Rp1,2 jt / Rp450 rb — short enough for an axis tick. */
export function formatRupiahShort(value: number): string {
  if (value === 0) return "Rp0";
  if (value >= 1_000_000_000) {
    return `Rp${(value / 1_000_000_000).toFixed(1).replace(".", ",").replace(",0", "")} m`;
  }
  if (value >= 1_000_000) {
    return `Rp${(value / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "")} jt`;
  }
  if (value >= 1_000) return `Rp${Math.round(value / 1000)} rb`;
  return formatRupiah(value);
}

/**
 * A "nice" axis maximum plus its tick values, so gridlines land on round
 * numbers instead of wherever the data happens to stop.
 */
function axisScale(max: number, ticks = 4): { max: number; values: number[] } {
  if (max <= 0) return { max: 1, values: [0, 1] };
  const rough = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;
  const step =
    (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude;
  const top = Math.ceil(max / step) * step;
  const values: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) values.push(Math.round(v));
  return { max: top, values };
}

function SrTable({
  caption,
  points,
  format,
}: {
  caption: string;
  points: SeriesPoint[];
  format: (value: number) => string;
}) {
  return (
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

/**
 * Vertical bars with a real y-axis.
 *
 * Empty buckets render as a flat neutral baseline rather than a sliver of
 * brand colour — a 2px coloured stub reads as a rendering fault, not as zero.
 */
export function ColumnChart({
  points,
  tone = "brand",
  caption,
  format = (v) => String(v),
  axisFormat,
  height = 150,
}: {
  points: SeriesPoint[];
  tone?: Tone;
  caption: string;
  format?: (value: number) => string;
  axisFormat?: (value: number) => string;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const labelId = useId();
  const peak = Math.max(0, ...points.map((p) => p.value));
  const scale = axisScale(peak);
  const tickFormat = axisFormat ?? format;
  const dense = points.length > 12;

  return (
    <figure className="m-0">
      <div className="flex gap-2">
        {/* Y axis */}
        <div
          aria-hidden
          className="relative w-12 shrink-0"
          style={{ height }}
        >
          {scale.values.map((value) => (
            <span
              key={value}
              className="absolute right-0 -translate-y-1/2 text-[0.625rem] tabular-nums text-muted"
              style={{ bottom: `${(value / scale.max) * 100}%` }}
            >
              {tickFormat(value)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Gridlines sit behind the bars and stay recessive. */}
          <div aria-hidden className="absolute inset-0" style={{ height }}>
            {scale.values.map((value) => (
              <span
                key={value}
                className={cn(
                  "absolute inset-x-0 border-t",
                  value === 0 ? "border-line" : "border-line-soft",
                )}
                style={{ bottom: `${(value / scale.max) * 100}%` }}
              />
            ))}
          </div>

          <div
            className="relative flex items-end gap-1.5"
            style={{ height }}
            role="group"
            aria-labelledby={labelId}
          >
            {points.map((point, index) => {
              const isActive = active === index;
              const empty = point.value <= 0;
              const ratio = empty ? 0 : point.value / scale.max;
              return (
                <div
                  key={`${point.label}-${index}`}
                  className="group relative flex min-w-0 flex-1 items-end justify-center"
                  style={{ height }}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                >
                  {isActive ? (
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-canvas shadow-lift">
                      {point.label}: {format(point.value)}
                    </span>
                  ) : null}

                  {/* Value label above the bar, skipped when bars get crowded. */}
                  {!dense && !empty ? (
                    <span
                      className="pointer-events-none absolute w-full -translate-y-1 text-center text-[0.625rem] font-bold tabular-nums text-ink-soft"
                      style={{ bottom: `${ratio * 100}%` }}
                    >
                      {format(point.value)}
                    </span>
                  ) : null}

                  <button
                    type="button"
                    aria-label={`${point.label}: ${format(point.value)}`}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                    className={cn(
                      "w-full max-w-9 rounded-t-[4px] transition-[height,opacity] duration-300",
                      empty
                        ? // Zero reads as an absence, not a tiny coloured bar.
                          "bg-line"
                        : FILL[tone],
                      active !== null && !isActive ? "opacity-45" : "opacity-100",
                    )}
                    style={{ height: empty ? 2 : `${Math.max(ratio * height, 3)}px` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex gap-1.5">
            {points.map((point, index) => (
              <span
                key={`${point.label}-label-${index}`}
                className={cn(
                  "min-w-0 flex-1 truncate text-center text-[0.625rem] font-medium text-muted",
                  dense && index % 2 === 1 && "invisible",
                )}
              >
                {point.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <figcaption id={labelId} className="sr-only">
        {caption}
      </figcaption>
      <SrTable caption={caption} points={points} format={format} />
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
    return (
      <p className="py-8 text-center text-sm text-muted">
        Belum ada pendaftaran pada periode ini.
      </p>
    );
  }

  return (
    <figure className="m-0 space-y-3">
      {points.map((point) => (
        <div key={point.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-xs font-semibold text-ink-soft">
              {point.label}
            </span>
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
      <SrTable caption={caption} points={points} format={format} />
    </figure>
  );
}

/**
 * Attendance as one rate, not a stacked bar — a single measure, a single hue,
 * with the three underlying counts spelled out beside it.
 */
export function RateMeter({
  present,
  absent,
  pending,
  rate,
}: {
  present: number;
  absent: number;
  pending: number;
  rate: number;
}) {
  const total = present + absent + pending;

  return (
    <figure className="m-0">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tabular-nums leading-none text-ink">
          {rate}%
        </span>
        <span className="text-xs text-muted">
          hadir dari {total} pendaftaran pada periode ini
        </span>
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

      {/* Doubles as the legend for the per-event segmented bars below, so
          those segments are never identified by colour alone. */}
      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Hadir", value: present, tone: "text-pine-dark", dot: "bg-pine" },
          { label: "Tidak hadir", value: absent, tone: "text-brand-ink", dot: "bg-brand" },
          { label: "Belum", value: pending, tone: "text-muted", dot: "bg-line" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-canvas-deep/50 px-2 py-2.5">
            <dt className="flex items-center justify-center gap-1.5 text-[0.6875rem] font-semibold text-muted">
              <span
                aria-hidden
                className={cn("size-2 shrink-0 rounded-full", item.dot)}
              />
              {item.label}
            </dt>
            <dd className={cn("mt-0.5 text-base font-extrabold tabular-nums", item.tone)}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      <figcaption className="sr-only">
        Tingkat kehadiran {rate} persen. Hadir {present}, tidak hadir {absent}, belum
        tercatat {pending}, dari {total} pendaftaran.
      </figcaption>
    </figure>
  );
}
