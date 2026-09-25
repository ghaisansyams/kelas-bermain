"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface DetailTab {
  key: string;
  label: string;
  count?: number;
  content: ReactNode;
}

export function DetailTabs({ tabs }: { tabs: DetailTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((tab) => tab.key === active) ?? tabs[0];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Bagian detail"
        className="no-scrollbar -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1"
      >
        {tabs.map((tab) => {
          const selected = tab.key === current?.key;
          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setActive(tab.key)}
              className={cn(
                "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-pill px-3.5 text-xs font-bold transition-colors",
                selected
                  ? "bg-ink text-canvas"
                  : "border border-line bg-surface text-ink-soft hover:border-brand/40 hover:text-brand",
              )}
            >
              {tab.label}
              {typeof tab.count === "number" ? (
                <span
                  className={cn(
                    "rounded-pill px-1.5 py-0.5 text-[0.625rem] tabular-nums",
                    selected ? "bg-white/15" : "bg-canvas-deep text-muted",
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  );
}

export function DefinitionList({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="divide-y divide-line">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3 sm:px-5"
        >
          <dt className="text-xs font-semibold text-muted">{item.label}</dt>
          <dd className="text-right text-sm font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
