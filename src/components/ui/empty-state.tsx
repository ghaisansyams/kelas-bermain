import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-card border border-dashed border-line bg-surface/60 px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="flex size-12 items-center justify-center rounded-full bg-canvas-deep text-muted">
          {icon}
        </span>
      ) : null}
      <div className="space-y-1.5">
        <p className="text-base font-bold text-ink">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
