import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils/cn";

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand",
        className,
      )}
    >
      <span aria-hidden className="h-px w-6 bg-brand/50" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  className,
  stagger = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  action?: ReactNode;
  className?: string;
  /**
   * Reveal the label, headline and description one after another instead of
   * as one block. Off by default, so every other section is untouched.
   */
  stagger?: boolean;
}) {
  const centered = align === "center";

  // `Reveal` renders a plain div, so wrapping keeps the flex column and its
  // `gap-3` exactly as they were.
  const step = (index: number, node: ReactNode) =>
    stagger ? <Reveal delay={index * 70}>{node}</Reveal> : node;

  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        centered
          ? "items-center text-center"
          : "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("flex flex-col gap-3", centered ? "max-w-2xl" : "max-w-2xl")}>
        {eyebrow ? step(0, <Eyebrow>{eyebrow}</Eyebrow>) : null}
        {step(
          1,
          <h2 className="text-[1.75rem] leading-[1.15] font-extrabold text-ink sm:text-4xl">
            {title}
          </h2>,
        )}
        {description
          ? step(
              2,
              <p className="text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                {description}
              </p>,
            )
          : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
