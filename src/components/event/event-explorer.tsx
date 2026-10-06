"use client";

import { useMemo, useState } from "react";
import { CalendarX2, SlidersHorizontal } from "lucide-react";
import { EventCard } from "@/components/event/event-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EVENT_CATEGORIES, type EventCategory, type EventView } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * Client-side filtering over a server-rendered list — category only. The
 * lifecycle tabs (Semua/Akan Datang/Sedang Berlangsung/Selesai) that used to
 * sit above this were removed; category is now the page's one filter.
 */
export function EventExplorer({ events }: { events: EventView[] }) {
  const [category, setCategory] = useState<EventCategory | "all">("all");

  const filtered = useMemo(
    () => events.filter((event) => category === "all" || event.category === category),
    [events, category],
  );

  const availableCategories = useMemo(() => {
    const present = new Set(events.map((event) => event.category));
    return EVENT_CATEGORIES.filter((item) => present.has(item));
  }, [events]);

  const resetAll = () => setCategory("all");

  return (
    <div>
      <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-soft sm:flex-row sm:items-center sm:p-5">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Kategori
        </span>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          <CategoryChip
            active={category === "all"}
            onClick={() => setCategory("all")}
            label="Semua"
          />
          {availableCategories.map((item) => (
            <CategoryChip
              key={item}
              active={category === item}
              onClick={() => setCategory(item)}
              label={item}
            />
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        Menampilkan <span className="font-bold text-ink">{filtered.length}</span> dari{" "}
        {events.length} event
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<CalendarX2 className="size-6" aria-hidden />}
          title="Tidak ada event pada kategori ini"
          description="Coba pilih kategori lain, atau lihat seluruh event yang tersedia."
          action={
            <Button variant="secondary" size="sm" onClick={resetAll}>
              Tampilkan semua event
            </Button>
          }
        />
      ) : (
        <div key={category} className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event, index) => (
            <div
              key={event.id}
              className="h-full motion-safe:animate-fade-up"
              style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
            >
              <EventCard event={event} priority={index < 3} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center rounded-pill px-3.5 text-[0.8125rem] font-semibold transition-colors duration-200",
        active
          ? "bg-brand text-white"
          : "border border-line bg-surface text-ink-soft hover:border-brand/30 hover:text-brand",
      )}
    >
      {label}
    </button>
  );
}
