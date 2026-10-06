import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-extrabold text-ink sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-card border border-line bg-surface p-5 shadow-soft sm:p-6", className)}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

const TONES = {
  success: "border-pine/30 bg-pine-soft/60 text-pine-dark",
  error: "border-brand/30 bg-brand-soft text-brand-ink",
  info: "border-line bg-canvas-deep/60 text-ink-soft",
} as const;

export function Notice({
  tone = "info",
  children,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
}) {
  return (
    <p role="status" className={cn("rounded-xl border p-3.5 text-sm font-medium", TONES[tone])}>
      {children}
    </p>
  );
}
