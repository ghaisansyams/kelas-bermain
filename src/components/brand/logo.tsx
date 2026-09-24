import { cn } from "@/lib/utils/cn";

/**
 * The mark: three primitive shapes in a rounded tile — a circle, a triangle,
 * and a bar. A shape-sorter, read abstractly: play as the way in to learning.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={cn("size-9", className)}
    >
      <rect width="32" height="32" rx="10.5" className="fill-brand" />
      <circle cx="11" cy="11.5" r="4.4" fill="#fff" />
      <path d="M11 18.6 16.1 26.4H5.9Z" className="fill-sun" />
      <rect x="18.6" y="7.1" width="8.4" height="17.8" rx="4.2" fill="#fff" fillOpacity="0.92" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      {showWordmark ? (
        <span className="text-[1.0625rem] leading-none font-extrabold tracking-tight text-ink">
          Kelas <span className="text-accent font-semibold text-brand">Bermain</span>
        </span>
      ) : null}
    </span>
  );
}
