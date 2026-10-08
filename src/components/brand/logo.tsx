import { cn } from "@/lib/utils/cn";

/**
 * Kelas Bermain mark — four coloured tiles in a 2×2 grid, each carrying a
 * simple play motif: a ball, a puzzle piece, a slide, and a house.
 *
 * This is a redrawn approximation of the logo on @kelasbermain.id. Drop in the
 * original artwork when it is available; only this file needs to change.
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
      {/* Top-left — ball */}
      <rect x="0.5" y="0.5" width="14" height="14" rx="3.6" fill="#7A3FF2" />
      <circle cx="7.5" cy="7.5" r="4.3" fill="#fff" />
      <circle cx="7.5" cy="7.5" r="1.7" fill="#7A3FF2" />

      {/* Top-right — puzzle piece */}
      <rect x="17.5" y="0.5" width="14" height="14" rx="3.6" fill="#FFB300" />
      <path
        d="M21.4 4.3h3.0a1.35 1.35 0 1 1 2.7 0h3.0v3.0a1.35 1.35 0 1 0 0 2.7v0.7H21.4V8.4a1.35 1.35 0 1 0 0-2.7Z"
        fill="#fff"
      />

      {/* Bottom-left — slide */}
      <rect x="0.5" y="17.5" width="14" height="14" rx="3.6" fill="#E8382F" />
      <path
        d="M4.2 27.6c2.9 0 4.1-1.9 4.9-4.1.5-1.4 1-2.3 2.1-2.3v-2.4c-2.6 0-3.7 1.9-4.4 3.9-.6 1.7-1.1 2.5-2.6 2.5Z"
        fill="#fff"
      />
      <circle cx="11.2" cy="20.1" r="1.5" fill="#fff" />

      {/* Bottom-right — house */}
      <rect x="17.5" y="17.5" width="14" height="14" rx="3.6" fill="#22B14C" />
      <path d="M24.5 20.2 30 24.4v0.3h-1.9v3.9h-7.2v-3.9H19v-0.3Z" fill="#fff" />
    </svg>
  );
}

/**
 * `imageUrl` comes from the CMS. When an admin uploads a logo it replaces the
 * built-in mark everywhere; with no upload the drawn mark is used, so the site
 * is never without a logo.
 */
export function Logo({
  className,
  markClassName,
  showWordmark = true,
  imageUrl,
  name,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
  imageUrl?: string;
  name?: string;
}) {
  const label = name ?? "Kelas Bermain";
  const [first, ...rest] = label.split(" ");

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={label}
          className={cn("size-9 object-contain", markClassName)}
        />
      ) : (
        <LogoMark className={markClassName} />
      )}
      {showWordmark && !imageUrl ? (
        <span className="text-[1.0625rem] leading-none font-extrabold tracking-tight text-ink">
          {first} <span className="text-accent font-semibold text-brand">{rest.join(" ")}</span>
        </span>
      ) : null}
    </span>
  );
}
