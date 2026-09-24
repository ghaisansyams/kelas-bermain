"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarX2, SlidersHorizontal } from "lucide-react";
import { EventCard } from "@/components/event/event-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EVENT_CATEGORIES, type EventCategory, type EventLifecycle, type EventView } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type LifecycleFilter = "all" | EventLifecycle;

const LIFECYCLE_FILTERS: { value: LifecycleFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "upcoming", label: "Akan Datang" },
  { value: "ongoing", label: "Sedang Berlangsung" },
  { value: "past", label: "Selesai" },
];

function isLifecycleFilter(value: string | null): value is LifecycleFilter {
  return value === "all" || value === "upcoming" || value === "ongoing" || value === "past";
}

/**
 * Client-side filtering over a server-rendered list.
 *
 * The events arrive with their lifecycle already resolved on the server, so no
 * date maths happens here and server and client markup always agree.
 */
export function EventExplorer({ events }: { events: EventView[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramFilter = searchParams.get("filter");

  const [lifecycle, setLifecycle] = useState<LifecycleFilter>(
    isLifecycleFilter(paramFilter) ? paramFilter : "all",
  );
  const [category, setCategory] = useState<EventCategory | "all">("all");

  // Keep state in step with back/forward navigation and deep links.
  useEffect(() => {
    setLifecycle(isLifecycleFilter(paramFilter) ? paramFilter : "all");
  }, [paramFilter]);

  const updateLifecycle = useCallback(
    (value: LifecycleFilter) => {
      setLifecycle(value);
      const query = value === "all" ? "" : `?filter=${value}`;
      router.replace(`/event${query}`, { scroll: false });
    },
    [router],
  );

  const counts = useMemo(() => {
    return {
      all: events.length,
      upcoming: events.filter((event) => event.lifecycle === "upcoming").length,
      ongoing: events.filter((event) => event.lifecycle === "ongoing").length,
      past: events.filter((event) => event.lifecycle === "past").length,
    } satisfies Record<LifecycleFilter, number>;
  }, [events]);

  const filtered = useMemo(
    () =>
      events.filter(
        (event) =>
          (lifecycle === "all" || event.lifecycle === lifecycle) &&
          (category === "all" || event.category === category),
      ),
    [events, lifecycle, category],
  );

  const availableCategories = useMemo(() => {
    const present = new Set(
      events
        .filter((event) => lifecycle === "all" || event.lifecycle === lifecycle)
        .map((event) => event.category),
    );
    return EVENT_CATEGORIES.filter((item) => present.has(item));
  }, [events, lifecycle]);

  const resetAll = () => {
    setCategory("all");
    updateLifecycle("all");
  };

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">
        <div
          role="tablist"
          aria-label="Saring berdasarkan status event"
          className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5"
        >
          {LIFECYCLE_FILTERS.map((filter) => {
            const active = lifecycle === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => updateLifecycle(filter.value)}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-pill px-4 text-sm font-semibold transition-colors duration-200",
                  active
                    ? "bg-ink text-canvas"
                    : "bg-canvas-deep text-ink-soft hover:bg-line-soft",
                )}
              >
                {filter.label}
                <span
                  className={cn(
                    "rounded-pill px-1.5 py-0.5 text-[0.6875rem] font-bold tabular-nums",
                    active ? "bg-white/15 text-canvas" : "bg-surface text-muted",
                  )}
                >
                  {counts[filter.value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center">
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
      </div>

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        Menampilkan <span className="font-bold text-ink">{filtered.length}</span> dari{" "}
        {events.length} event
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<CalendarX2 className="size-6" aria-hidden />}
          title="Tidak ada event pada filter ini"
          description="Coba ubah status atau kategori, atau lihat seluruh event yang tersedia."
          action={
            <Button variant="secondary" size="sm" onClick={resetAll}>
              Tampilkan semua event
            </Button>
          }
        />
      ) : (
        <div
          key={`${lifecycle}-${category}`}
          className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
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
