"use client";

import { useState } from "react";
import { CalendarRange } from "lucide-react";
import type { RangeKey } from "@/lib/services/admin";
import { cn } from "@/lib/utils/cn";

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7 hari" },
  { key: "30d", label: "30 hari" },
  { key: "6m", label: "6 bulan" },
];

/** Period control in the dashboard header. Drives every widget below it. */
export function PeriodFilter({
  value,
  custom,
  onChange,
}: {
  value: RangeKey;
  custom: { from: string; to: string };
  onChange: (key: RangeKey, custom?: { from: string; to: string }) => void;
}) {
  const [open, setOpen] = useState(value === "custom");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Periode data"
        className="flex rounded-lg border border-line bg-surface p-0.5"
      >
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            aria-pressed={value === preset.key}
            onClick={() => {
              setOpen(false);
              onChange(preset.key);
            }}
            className={cn(
              "min-h-8 rounded-[6px] px-3 text-xs font-bold transition-colors",
              value === preset.key
                ? "bg-ink text-canvas"
                : "text-ink-soft hover:bg-canvas-deep",
            )}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={value === "custom"}
          onClick={() => {
            setOpen((o) => !o || value !== "custom");
            onChange("custom", custom);
          }}
          className={cn(
            "inline-flex min-h-8 items-center gap-1.5 rounded-[6px] px-3 text-xs font-bold transition-colors",
            value === "custom" ? "bg-ink text-canvas" : "text-ink-soft hover:bg-canvas-deep",
          )}
        >
          <CalendarRange className="size-3.5" aria-hidden />
          Custom
        </button>
      </div>

      {open && value === "custom" ? (
        <div className="flex items-center gap-1.5">
          <label htmlFor="range-from" className="sr-only">
            Tanggal mulai
          </label>
          <input
            id="range-from"
            type="date"
            value={custom.from}
            max={custom.to}
            onChange={(e) => onChange("custom", { ...custom, from: e.target.value })}
            className="h-8 rounded-lg border border-line bg-canvas px-2 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
          <span className="text-xs text-muted" aria-hidden>
            –
          </span>
          <label htmlFor="range-to" className="sr-only">
            Tanggal akhir
          </label>
          <input
            id="range-to"
            type="date"
            value={custom.to}
            min={custom.from}
            onChange={(e) => onChange("custom", { ...custom, to: e.target.value })}
            className="h-8 rounded-lg border border-line bg-canvas px-2 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </div>
      ) : null}
    </div>
  );
}
