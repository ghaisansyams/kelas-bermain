import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-soft">
      <table className="w-full min-w-[48rem] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-top text-ink-soft", className)}>{children}</td>;
}

const BADGE_TONES: Record<string, string> = {
  green: "bg-pine-soft text-pine-dark ring-pine/20",
  amber: "bg-sun-soft text-sun-dark ring-sun/30",
  red: "bg-brand-soft text-brand-ink ring-brand/20",
  grey: "bg-canvas-deep text-ink-soft ring-line",
};

export function StatusBadge({ tone, children }: { tone: keyof typeof BADGE_TONES | string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-bold ring-1 ring-inset",
        BADGE_TONES[tone] ?? BADGE_TONES.grey,
      )}
    >
      {children}
    </span>
  );
}

/** Indonesian labels for the statuses stored in English. */
export const PAYMENT_LABEL: Record<string, { text: string; tone: string }> = {
  PENDING: { text: "Menunggu Pembayaran", tone: "amber" },
  PAID: { text: "Lunas", tone: "green" },
  FAILED: { text: "Gagal", tone: "red" },
  EXPIRED: { text: "Kadaluarsa", tone: "grey" },
  CANCELLED: { text: "Dibatalkan", tone: "grey" },
  REFUNDED: { text: "Direfund", tone: "red" },
  NOT_REQUIRED: { text: "Tidak Diperlukan", tone: "grey" },
};

export const REGISTRATION_LABEL: Record<string, { text: string; tone: string }> = {
  REGISTERED: { text: "Terdaftar", tone: "amber" },
  CONFIRMED: { text: "Dikonfirmasi", tone: "green" },
  CANCELLED: { text: "Dibatalkan", tone: "grey" },
  COMPLETED: { text: "Selesai", tone: "green" },
};

export const ATTENDANCE_LABEL: Record<string, { text: string; tone: string }> = {
  NOT_ATTENDED: { text: "Belum Check-in", tone: "grey" },
  PRESENT: { text: "Hadir", tone: "green" },
  ABSENT: { text: "Tidak Hadir", tone: "red" },
};

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}

/** Page links that preserve the current filters. */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    search.set("page", String(target));
    return `${basePath}?${search.toString()}`;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted">
        Menampilkan {from}–{to} dari {total}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="inline-flex min-h-9 items-center rounded-pill border border-line px-3 font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
          >
            Sebelumnya
          </Link>
        ) : null}
        {page < lastPage ? (
          <Link
            href={href(page + 1)}
            className="inline-flex min-h-9 items-center rounded-pill border border-line px-3 font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
          >
            Berikutnya
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function FilterBar({ children, action }: { children: ReactNode; action: string }) {
  return (
    <form
      action={action}
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-4 shadow-soft"
    >
      {children}
      <button
        type="submit"
        className="inline-flex min-h-11 items-center rounded-pill bg-ink px-4 text-sm font-semibold text-canvas"
      >
        Terapkan
      </button>
    </form>
  );
}

export function SelectField({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        className="h-11 min-w-[10rem] rounded-xl border border-line bg-surface px-3 text-[0.9375rem] text-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SearchField({ name = "q", value }: { name?: string; value?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
      Cari
      <input
        name={name}
        defaultValue={value ?? ""}
        placeholder="Nama, nomor, atau invoice"
        className="h-11 w-full min-w-[14rem] rounded-xl border border-line bg-surface px-3 text-[0.9375rem] text-ink"
      />
    </label>
  );
}
