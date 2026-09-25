import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------------ */
/* Page chrome                                                         */
/* ------------------------------------------------------------------ */

export function AdminPageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: { href: string; label: string }[];
}) {
  return (
    <header className="mb-6">
      {breadcrumb && breadcrumb.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {breadcrumb.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {index > 0 ? <span aria-hidden>/</span> : null}
                <Link href={crumb.href} className="hover:text-brand">
                  {crumb.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-line bg-surface", className)}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-ink">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-muted">{description}</p>
            ) : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

/**
 * Semantic tones. Colour carries meaning here rather than decoration:
 * money is settled value, action is something waiting on a human, critical is
 * a failure, info is context, neutral is reference data. The older literal
 * names stay valid so the other admin screens are untouched.
 */
export type StatTone =
  | "money"
  | "action"
  | "critical"
  | "info"
  | "neutral"
  | "brand"
  | "pine"
  | "sun"
  | "sky"
  | "grape";

const TONE_STYLES: Record<StatTone, string> = {
  money: "bg-pine-soft text-pine",
  action: "bg-sun-soft text-sun-dark",
  critical: "bg-brand-soft text-brand",
  info: "bg-sky-soft text-sky",
  neutral: "bg-canvas-deep text-muted",
  brand: "bg-brand-soft text-brand",
  pine: "bg-pine-soft text-pine",
  sun: "bg-sun-soft text-sun-dark",
  sky: "bg-sky-soft text-sky",
  grape: "bg-grape-soft text-grape",
};

export interface StatTrend {
  percent: number;
  direction: "up" | "down" | "flat";
  comparable: boolean;
}

function TrendPill({
  trend,
  /** Down is good for some metrics — outstanding payments, for instance. */
  invert = false,
}: {
  trend: StatTrend;
  invert?: boolean;
}) {
  if (!trend.comparable) {
    return (
      <span className="text-[0.6875rem] font-medium text-muted">
        Belum ada pembanding
      </span>
    );
  }
  if (trend.direction === "flat") {
    return <span className="text-[0.6875rem] font-medium text-muted">Tidak berubah</span>;
  }
  const up = trend.direction === "up";
  const good = invert ? !up : up;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[0.6875rem] font-bold tabular-nums",
        good ? "text-pine-dark" : "text-brand-ink",
      )}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {trend.percent}%
      <span className="sr-only">
        {up ? "naik" : "turun"} dibanding periode sebelumnya
      </span>
    </span>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "neutral",
  href,
  size = "sm",
  trend,
  invertTrend,
  cta,
}: {
  label: string;
  value: string;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
  href?: string;
  /** "lg" is the headline row; "sm" is the reference row beneath it. */
  size?: "sm" | "lg";
  trend?: StatTrend;
  invertTrend?: boolean;
  /** Shown on cards that exist to be clicked. */
  cta?: string;
}) {
  const large = size === "lg";

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "font-semibold text-muted",
            large ? "text-[0.8125rem]" : "text-xs",
          )}
        >
          {label}
        </p>
        {icon ? (
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg",
              large ? "size-9" : "size-8",
              TONE_STYLES[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <p
        className={cn(
          "mt-2 font-extrabold tabular-nums leading-none text-ink",
          large ? "text-[1.75rem]" : "text-2xl",
        )}
      >
        {value}
      </p>

      {detail || trend ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {trend ? <TrendPill trend={trend} invert={invertTrend} /> : null}
          {detail ? <span className="text-xs text-muted">{detail}</span> : null}
        </div>
      ) : null}

      {cta && href ? (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand">
          {cta}
          <span aria-hidden>→</span>
        </span>
      ) : null}
    </>
  );

  const className = cn(
    "block rounded-xl border bg-surface transition-shadow",
    large ? "border-line p-5" : "border-line p-4",
    href && "hover:border-brand/30 hover:shadow-soft",
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/* ------------------------------------------------------------------ */
/* Status badges                                                       */
/* ------------------------------------------------------------------ */

const STATUS_TONES: Record<string, string> = {
  // registration
  REGISTERED: "bg-sky-soft text-sky",
  CONFIRMED: "bg-pine-soft text-pine-dark",
  COMPLETED: "bg-canvas-deep text-ink-soft",
  CANCELLED: "bg-brand-soft text-brand-ink",
  // payment
  NOT_REQUIRED: "bg-canvas-deep text-muted",
  PENDING: "bg-sun-soft text-sun-dark",
  PAID: "bg-pine-soft text-pine-dark",
  FAILED: "bg-brand-soft text-brand-ink",
  EXPIRED: "bg-canvas-deep text-muted",
  // attendance
  NOT_ATTENDED: "bg-canvas-deep text-muted",
  PRESENT: "bg-pine-soft text-pine-dark",
  ABSENT: "bg-brand-soft text-brand-ink",
  // certificate
  NOT_ELIGIBLE: "bg-canvas-deep text-muted",
  AVAILABLE: "bg-sky-soft text-sky",
  ISSUED: "bg-grape-soft text-grape",
  // generic
  active: "bg-pine-soft text-pine-dark",
  inactive: "bg-canvas-deep text-muted",
  issued: "bg-grape-soft text-grape",
  revoked: "bg-brand-soft text-brand-ink",
};

export const STATUS_LABEL: Record<string, string> = {
  REGISTERED: "Terdaftar",
  CONFIRMED: "Terkonfirmasi",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  NOT_REQUIRED: "Tanpa Bayar",
  PENDING: "Menunggu",
  PAID: "Lunas",
  FAILED: "Gagal",
  EXPIRED: "Kedaluwarsa",
  NOT_ATTENDED: "Belum Hadir",
  PRESENT: "Hadir",
  ABSENT: "Tidak Hadir",
  NOT_ELIGIBLE: "Belum Memenuhi",
  AVAILABLE: "Tersedia",
  ISSUED: "Terbit",
  active: "Aktif",
  inactive: "Nonaktif",
  issued: "Terbit",
  revoked: "Dibatalkan",
  NONE: "—",
  WEBSITE: "Website",
  THIRD_PARTY: "Pihak Ketiga",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-pill px-2 py-0.5 text-[0.6875rem] font-bold",
        STATUS_TONES[status] ?? "bg-canvas-deep text-ink-soft",
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  /** Hide on narrow screens to keep the row readable. */
  hideBelow?: "sm" | "md" | "lg";
}

const HIDE: Record<NonNullable<Column<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

export function DataTable<T>({
  rows,
  columns,
  getKey,
  loading,
  empty,
  caption,
}: {
  rows: T[];
  columns: Column<T>[];
  getKey: (row: T) => string;
  loading?: boolean;
  empty?: ReactNode;
  caption?: string;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="shimmer h-11 w-full rounded-lg bg-line-soft" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 py-14 text-center">
        {empty ?? <p className="text-sm text-muted">Belum ada data.</p>}
      </div>
    );
  }

  return (
    /* Wide tables scroll inside this box; the page itself never does. */
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-line bg-canvas-deep/40 text-left">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "whitespace-nowrap px-4 py-2.5 text-[0.6875rem] font-bold uppercase tracking-wider text-muted",
                  column.hideBelow && HIDE[column.hideBelow],
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={getKey(row)} className="transition-colors hover:bg-canvas-deep/30">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "px-4 py-3 align-middle text-ink-soft",
                    column.hideBelow && HIDE[column.hideBelow],
                    column.className,
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3.5">
      {children}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="min-w-[8.5rem] flex-1 sm:flex-none">
      <label htmlFor={id} className="mb-1 block text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm font-medium text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FilterSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="min-w-[12rem] flex-1">
      <label
        htmlFor="filter-search"
        className="mb-1 block text-[0.6875rem] font-bold uppercase tracking-wider text-muted"
      >
        Cari
      </label>
      <input
        id="filter-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/10"
      />
    </div>
  );
}

export function ResultCount({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  return (
    <p className="mb-3 text-xs text-muted" aria-live="polite">
      Menampilkan <span className="font-bold text-ink">{shown}</span> dari {total} {noun}
    </p>
  );
}
