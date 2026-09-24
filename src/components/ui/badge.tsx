import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { EventCategory, EventLifecycle, RegistrationAvailability } from "@/lib/types";

const tones = {
  neutral: "bg-canvas-deep text-ink-soft ring-line",
  brand: "bg-brand-soft text-brand-ink ring-brand/20",
  pine: "bg-pine-soft text-pine-dark ring-pine/20",
  sun: "bg-sun-soft text-sun-dark ring-sun/30",
  grape: "bg-grape-soft text-grape ring-grape/20",
  sky: "bg-sky-soft text-sky ring-sky/20",
  leaf: "bg-leaf-soft text-leaf ring-leaf/20",
  solid: "bg-ink text-canvas ring-ink/10",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** One hue per category, used consistently across cards, filters and detail pages. */
export const categoryTone: Record<EventCategory, BadgeTone> = {
  Profesi: "brand",
  Kuliner: "sun",
  Alam: "leaf",
  Kreatif: "grape",
  Eksplorasi: "sky",
  Outdoor: "pine",
};

export const lifecycleLabel: Record<EventLifecycle, string> = {
  upcoming: "Akan Datang",
  ongoing: "Sedang Berlangsung",
  past: "Selesai",
};

const lifecycleTone: Record<EventLifecycle, BadgeTone> = {
  upcoming: "pine",
  ongoing: "brand",
  past: "neutral",
};

export function LifecycleBadge({
  lifecycle,
  className,
}: {
  lifecycle: EventLifecycle;
  className?: string;
}) {
  return (
    <Badge tone={lifecycleTone[lifecycle]} className={className}>
      {lifecycle === "ongoing" ? (
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-current motion-safe:animate-pulse"
        />
      ) : null}
      {lifecycleLabel[lifecycle]}
    </Badge>
  );
}

export const availabilityLabel: Record<RegistrationAvailability, string> = {
  open: "Pendaftaran Dibuka",
  full: "Kuota Penuh",
  closed: "Pendaftaran Ditutup",
};
