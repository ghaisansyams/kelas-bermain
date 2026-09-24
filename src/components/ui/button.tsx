import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "pine" | "light";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold " +
  "transition-[transform,background-color,border-color,color,box-shadow] duration-200 " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-soft hover:bg-brand-dark hover:shadow-lift focus-visible:outline-brand-dark",
  secondary:
    "border border-line bg-surface text-ink hover:border-ink/25 hover:bg-canvas-deep",
  ghost: "text-ink hover:bg-ink/5",
  pine: "bg-pine text-white shadow-soft hover:bg-pine-dark hover:shadow-lift",
  light:
    "border border-white/60 bg-white/90 text-ink shadow-soft backdrop-blur-sm hover:bg-white",
};

/** Comfortable tap targets: every size clears 40px, the default clears 44px. */
const sizes: Record<Size, string> = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-11 px-5 text-[0.9375rem]",
  lg: "min-h-13 px-7 text-base",
};

/**
 * Shared button styling. Use this with `next/link` for navigation, and the
 * `Button` component below for real buttons.
 */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button className={buttonStyles({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}
