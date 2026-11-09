import { cn } from "@/lib/utils/cn";

/** Berkas logo resmi (public/brand). Satu-satunya tempat yang menyebut jalurnya. */
export const LOGO_LOCKUP_SRC = "/brand/logo.png";
export const LOGO_MARK_SRC = "/brand/logo-mark.png";

/** Logo lengkap: empat kotak plus tulisan "Kelas Bermain" dalam huruf logonya. */
export function LogoLockup({ className, alt = "Kelas Bermain" }: { className?: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_LOCKUP_SRC}
      alt={alt}
      width={1200}
      height={536}
      className={cn("h-10 w-auto select-none", className)}
    />
  );
}

/** Hanya empat kotak berwarna, untuk tempat sempit (ikon, kartu kecil). */
export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_MARK_SRC}
      alt=""
      aria-hidden="true"
      width={512}
      height={512}
      className={cn("size-9 object-contain select-none", className)}
    />
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

  return (
    <span className={cn("inline-flex items-center", className)}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={label}
          className={cn("h-10 w-auto max-w-[12rem] object-contain", markClassName)}
        />
      ) : showWordmark ? (
        <LogoLockup alt={label} className={markClassName ?? "h-12 lg:h-14"} />
      ) : (
        <LogoMark className={markClassName} />
      )}
    </span>
  );
}
