"use client";

import Link from "next/link";
import { ExternalLink, Pencil } from "lucide-react";
import { StatusBadge } from "@/components/admin/data-table";

export interface EventVisibilityRow {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  status: string;
  featured: boolean;
  showOnEventPage: boolean;
  showInHistory: boolean;
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: "grey",
  PUBLISHED: "pine",
  ONGOING: "sun",
  COMPLETED: "grey",
  CANCELLED: "grey",
  ARCHIVED: "grey",
};

/**
 * Where each event appears on the website. The event itself — title, date,
 * price, everything — is edited in the Event menu; this view only decides
 * placement, so there is exactly one copy of every event in the system.
 */
export function EventVisibility({
  rows,
  action,
}: {
  rows: EventVisibilityRow[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
        Belum ada event. Tambahkan lewat menu Event di sebelah kiri.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.id} className="rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-ink">{row.title}</span>
                <StatusBadge tone={STATUS_TONE[row.status] ?? "grey"}>{row.status}</StatusBadge>
              </div>
              <p className="mt-0.5 text-xs text-muted">{row.startDate}</p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href={`/admin/events/${row.id}`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-line px-3 text-xs font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
              >
                <Pencil className="size-3.5" aria-hidden />
                Ubah event
              </Link>
              <Link
                href={`/event/${row.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-line px-3 text-xs font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
              >
                Lihat
                <ExternalLink className="size-3" aria-hidden />
              </Link>
            </div>
          </div>

          <form action={action} className="mt-3 flex flex-wrap items-center gap-4 border-t border-line pt-3">
            <input type="hidden" name="eventId" value={row.id} />
            <Toggle name="featured" label="Tampilkan di Halaman Depan" checked={row.featured} />
            <Toggle
              name="showOnEventPage"
              label="Tampilkan di halaman Event"
              checked={row.showOnEventPage}
            />
            <Toggle
              name="showInHistory"
              label="Tampilkan di Yang Sudah Kami Jalankan"
              checked={row.showInHistory}
            />
            <button
              type="submit"
              className="ml-auto inline-flex min-h-9 items-center rounded-pill bg-brand px-4 text-xs font-bold text-white"
            >
              Simpan
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}

function Toggle({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-ink">
      {/* Posts "false" when the box is left unchecked. */}
      <input type="hidden" name={name} value="false" />
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={checked}
        className="size-4 accent-brand"
      />
      {label}
    </label>
  );
}
