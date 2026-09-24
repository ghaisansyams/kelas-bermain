"use client";

import { useMemo, useState } from "react";
import { PackageOpen } from "lucide-react";
import {
  ActivityCard,
  activityCategoryLabel,
} from "@/components/kegiatan/activity-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ActivityCategory, ActivityRecord } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export function ActivityExplorer({ activities }: { activities: ActivityRecord[] }) {
  const [category, setCategory] = useState<ActivityCategory | "all">("all");

  const categories = useMemo(() => {
    const present = new Map<ActivityCategory, number>();
    for (const activity of activities) {
      present.set(activity.category, (present.get(activity.category) ?? 0) + 1);
    }
    return [...present.entries()];
  }, [activities]);

  const filtered = useMemo(
    () =>
      category === "all"
        ? activities
        : activities.filter((activity) => activity.category === category),
    [activities, category],
  );

  return (
    <div>
      <div
        role="group"
        aria-label="Saring kegiatan berdasarkan kategori"
        className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        <Chip
          active={category === "all"}
          onClick={() => setCategory("all")}
          label="Semua"
          count={activities.length}
        />
        {categories.map(([value, count]) => (
          <Chip
            key={value}
            active={category === value}
            onClick={() => setCategory(value)}
            label={activityCategoryLabel[value]}
            count={count}
          />
        ))}
      </div>

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        Menampilkan <span className="font-bold text-ink">{filtered.length}</span> dari{" "}
        {activities.length} kegiatan
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<PackageOpen className="size-6" aria-hidden />}
          title="Belum ada kegiatan di kategori ini"
          description="Coba pilih kategori lain untuk melihat dokumentasi kegiatan kami."
          action={
            <Button variant="secondary" size="sm" onClick={() => setCategory("all")}>
              Tampilkan semua
            </Button>
          }
        />
      ) : (
        <div key={category} className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((activity, index) => (
            <div
              key={activity.id}
              className="h-full motion-safe:animate-fade-up"
              style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
            >
              <ActivityCard activity={activity} priority={index < 3} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-pill px-4 text-sm font-semibold transition-colors duration-200",
        active ? "bg-pine text-white" : "bg-canvas-deep text-ink-soft hover:bg-line-soft",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-pill px-1.5 py-0.5 text-[0.6875rem] font-bold tabular-nums",
          active ? "bg-white/20 text-white" : "bg-surface text-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}
