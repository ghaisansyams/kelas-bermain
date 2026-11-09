import type { CSSProperties } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Stiker dekoratif bergaya logo: bentuk datar sederhana dengan warna dari
 * logo Kelas Bermain. Murni hiasan — tidak bisa diklik, disembunyikan dari
 * pembaca layar, dan diam di tempat kalau pengunjung memilih mengurangi
 * gerakan. Penempatannya (sudut kosong, sela antar bagian) ditentukan oleh
 * pemanggil lewat `className`.
 */

export const STICKER_COLORS = {
  blue: "#4B22FF",
  yellow: "#FFC010",
  red: "#FC2F1A",
  green: "#1FD150",
  cyan: "#17C6D8",
} as const;

type StickerColor = keyof typeof STICKER_COLORS;

export type StickerKind = "star" | "cloud" | "pencil" | "book" | "ball" | "confetti" | "squiggle";

const INK = "#1E1B18";

function Shape({ kind, color }: { kind: StickerKind; color: string }) {
  switch (kind) {
    case "star":
      return (
        <svg viewBox="0 0 48 48" className="size-full">
          <polygon
            points="24,5 29.8,17.8 43.5,19.2 33.2,28.6 36.2,42 24,35 11.8,42 14.8,28.6 4.5,19.2 18.2,17.8"
            fill={color}
            stroke={color}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="23" r="3" fill="#fff" opacity="0.9" />
        </svg>
      );
    case "cloud":
      return (
        <svg viewBox="0 0 72 44" className="size-full">
          <g fill={color}>
            <circle cx="20" cy="29" r="11" />
            <circle cx="36" cy="20" r="15" />
            <circle cx="53" cy="29" r="10" />
            <rect x="20" y="29" width="33" height="11" />
          </g>
          <circle cx="29" cy="22" r="2.2" fill="#fff" opacity="0.9" />
          <circle cx="43" cy="22" r="2.2" fill="#fff" opacity="0.9" />
        </svg>
      );
    case "pencil":
      return (
        <svg viewBox="0 0 80 28" className="size-full">
          <rect x="2" y="4" width="14" height="20" rx="4" fill={STICKER_COLORS.red} />
          <rect x="14" y="4" width="46" height="20" fill={color} />
          <rect x="14" y="4" width="46" height="4.5" fill="#fff" opacity="0.28" />
          <polygon points="60,4 78,14 60,24" fill="#F3D9A7" />
          <polygon points="70,10.4 78,14 70,17.6" fill={INK} />
        </svg>
      );
    case "book":
      return (
        <svg viewBox="0 0 56 44" className="size-full">
          <path d="M3 6h20a5 5 0 0 1 5 5v29a5 5 0 0 0-5-5H3z" fill={color} />
          <path d="M53 6H33a5 5 0 0 0-5 5v29a5 5 0 0 1 5-5h20z" fill={color} />
          <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.9">
            <line x1="34" y1="16" x2="47" y2="16" />
            <line x1="34" y1="23" x2="47" y2="23" />
            <line x1="34" y1="30" x2="42" y2="30" />
          </g>
        </svg>
      );
    case "ball":
      return (
        <svg viewBox="0 0 48 48" className="size-full">
          <circle cx="24" cy="24" r="21" fill={color} />
          <path
            d="M6 19c10 6 26 6 36 0M8 33c9-5 23-5 32 0"
            fill="none"
            stroke="#fff"
            strokeWidth="3.4"
            strokeLinecap="round"
            opacity="0.92"
          />
        </svg>
      );
    case "confetti":
      return (
        <svg viewBox="0 0 90 56" className="size-full">
          <circle cx="10" cy="14" r="5" fill={STICKER_COLORS.yellow} />
          <circle cx="44" cy="8" r="3.5" fill={STICKER_COLORS.blue} />
          <circle cx="78" cy="20" r="5" fill={STICKER_COLORS.red} />
          <circle cx="26" cy="44" r="4" fill={STICKER_COLORS.green} />
          <circle cx="62" cy="46" r="3.5" fill={STICKER_COLORS.cyan} />
          <rect x="30" y="20" width="12" height="5" rx="2.5" fill={STICKER_COLORS.red} transform="rotate(-28 36 22)" />
          <rect x="52" y="28" width="12" height="5" rx="2.5" fill={STICKER_COLORS.yellow} transform="rotate(34 58 30)" />
        </svg>
      );
    case "squiggle":
      return (
        <svg viewBox="0 0 80 28" className="size-full">
          <path
            d="M4 16c7-14 13 12 19 0s13 12 19 0 13 12 19 0 10 8 15 0"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

export function Sticker({
  kind,
  color = "yellow",
  className,
  rotate = 0,
  delay = 0,
  still = false,
}: {
  kind: StickerKind;
  color?: StickerColor;
  /** Ukuran, posisi, dan titik henti (mis. `hidden lg:block`) dari pemanggil. */
  className?: string;
  rotate?: number;
  /** Detik; membuat stiker-stiker tidak naik-turun serempak. */
  delay?: number;
  still?: boolean;
}) {
  const style: CSSProperties = { rotate: `${rotate}deg`, animationDelay: `${delay}s` };
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        "pointer-events-none absolute select-none",
        !still && "motion-safe:animate-sticker",
        className,
      )}
    >
      <Shape kind={kind} color={STICKER_COLORS[color]} />
    </span>
  );
}
