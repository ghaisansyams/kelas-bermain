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

export type StickerKind =
  | "star"
  | "cloud"
  | "pencil"
  | "book"
  | "ball"
  | "confetti"
  | "squiggle"
  | "rocket"
  | "balloon"
  | "rainbow"
  | "sun"
  | "kite"
  | "crayon"
  | "blocks"
  | "paperplane"
  | "flower"
  | "heart"
  | "smile"
  | "butterfly"
  | "note"
  | "sparkle"
  | "spiral"
  | "zigzag";

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
    case "rocket":
      return (
        <svg viewBox="0 0 40 64" className="size-full">
          <path d="M11 30 2 47h9zM29 30l9 17h-9z" fill={STICKER_COLORS.red} />
          <path d="M20 2c8 8 11 21 9 38H11C9 23 12 10 20 2Z" fill={color} />
          <path d="M20 2c3 3 5.500 7 7 11H13c1.500-4 4-8 7-11Z" fill={STICKER_COLORS.red} />
          <circle cx="20" cy="26" r="6" fill="#fff" />
          <circle cx="20" cy="26" r="3.600" fill={STICKER_COLORS.cyan} />
          <path d="M14 42h12l-6 20z" fill={STICKER_COLORS.yellow} />
        </svg>
      );
    case "balloon":
      return (
        <svg viewBox="0 0 36 60" className="size-full">
          <path d="M18 40c-4 7 4 11 0 20" fill="none" stroke={INK} strokeWidth="1.600" strokeLinecap="round" />
          <ellipse cx="18" cy="18" rx="15" ry="18" fill={color} />
          <polygon points="14.500,36 21.500,36 18,41" fill={color} />
          <ellipse cx="11.500" cy="11" rx="3.200" ry="5" fill="#fff" opacity="0.4" transform="rotate(25 11.500 11)" />
        </svg>
      );
    case "rainbow":
      return (
        <svg viewBox="0 0 88 48" className="size-full" fill="none" strokeLinecap="round">
          <path d="M6 44a38 38 0 0 1 76 0" stroke={STICKER_COLORS.red} strokeWidth="7" />
          <path d="M15 44a29 29 0 0 1 58 0" stroke={STICKER_COLORS.yellow} strokeWidth="7" />
          <path d="M24 44a20 20 0 0 1 40 0" stroke={STICKER_COLORS.green} strokeWidth="7" />
          <path d="M33 44a11 11 0 0 1 22 0" stroke={STICKER_COLORS.blue} strokeWidth="7" />
        </svg>
      );
    case "sun":
      return (
        <svg viewBox="0 0 60 60" className="size-full">
          <g stroke={color} strokeWidth="4.500" strokeLinecap="round">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line key={angle} x1="30" y1="5" x2="30" y2="11" transform={`rotate(${angle} 30 30)`} />
            ))}
          </g>
          <circle cx="30" cy="30" r="14" fill={color} />
          <circle cx="25" cy="27" r="1.800" fill={INK} />
          <circle cx="35" cy="27" r="1.800" fill={INK} />
          <path d="M24.500 33c3.500 4 7.500 4 11 0" fill="none" stroke={INK} strokeWidth="1.800" strokeLinecap="round" />
          <circle cx="22" cy="32" r="2.200" fill={STICKER_COLORS.red} opacity="0.4" />
          <circle cx="38" cy="32" r="2.200" fill={STICKER_COLORS.red} opacity="0.4" />
        </svg>
      );
    case "kite":
      return (
        <svg viewBox="0 0 44 78" className="size-full">
          <path d="M22 50c-7 7 7 11 0 17s7 8 4 11" fill="none" stroke={INK} strokeWidth="1.500" strokeLinecap="round" />
          <polygon points="22,2 22,26 4,26" fill={color} />
          <polygon points="22,2 40,26 22,26" fill={STICKER_COLORS.yellow} />
          <polygon points="4,26 22,26 22,50" fill={STICKER_COLORS.green} />
          <polygon points="22,26 40,26 22,50" fill={STICKER_COLORS.blue} />
          <polygon points="18,62 26,62 22,68" fill={STICKER_COLORS.red} />
          <polygon points="18,72 26,72 22,78" fill={STICKER_COLORS.yellow} />
        </svg>
      );
    case "crayon":
      return (
        <svg viewBox="0 0 80 28" className="size-full">
          <polygon points="62,3 78,14 62,25" fill={color} />
          <rect x="4" y="3" width="58" height="22" rx="3" fill={color} />
          <rect x="14" y="3" width="32" height="22" fill="#fff" opacity="0.88" />
          <line x1="14" y1="9" x2="46" y2="9" stroke={color} strokeWidth="2" />
          <line x1="14" y1="19" x2="46" y2="19" stroke={color} strokeWidth="2" />
          <rect x="62" y="3" width="3" height="22" fill="#000" opacity="0.1" />
        </svg>
      );
    case "blocks":
      return (
        <svg viewBox="0 0 66 58" className="size-full" fontWeight="800" fontSize="17" textAnchor="middle" fill="#fff">
          <rect x="2" y="30" width="28" height="26" rx="5" fill={STICKER_COLORS.blue} />
          <text x="16" y="49">A</text>
          <rect x="34" y="30" width="28" height="26" rx="5" fill={STICKER_COLORS.red} />
          <text x="48" y="49">B</text>
          <rect x="18" y="3" width="28" height="26" rx="5" fill={STICKER_COLORS.yellow} transform="rotate(-8 32 16)" />
          <text x="32" y="22" fill={INK} transform="rotate(-8 32 16)">C</text>
        </svg>
      );
    case "paperplane":
      return (
        <svg viewBox="0 0 60 46" className="size-full">
          <polygon points="2,21 58,2 41,44 28,29" fill={color} />
          <polygon points="28,29 58,2 33,33" fill="#000" opacity="0.16" />
          <polygon points="28,29 33,33 29,41" fill="#000" opacity="0.1" />
        </svg>
      );
    case "flower":
      return (
        <svg viewBox="0 0 52 52" className="size-full">
          <g fill={color}>
            {[0, 72, 144, 216, 288].map((angle) => (
              <circle key={angle} cx="26" cy="12" r="9" transform={`rotate(${angle} 26 26)`} />
            ))}
          </g>
          <circle cx="26" cy="26" r="7" fill={STICKER_COLORS.yellow} />
          <circle cx="26" cy="26" r="2.500" fill="#fff" opacity="0.7" />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 46 42" className="size-full">
          <path d="M23 40S3 27 3 14a10.500 10.500 0 0 1 20-4.500A10.500 10.500 0 0 1 43 14c0 13-20 26-20 26Z" fill={color} />
          <path d="M10 12c0-3 2-5 5-5" fill="none" stroke="#fff" strokeWidth="2.500" strokeLinecap="round" opacity="0.6" />
        </svg>
      );
    case "smile":
      return (
        <svg viewBox="0 0 52 52" className="size-full">
          <circle cx="26" cy="26" r="23" fill={color} />
          <circle cx="18.500" cy="22" r="2.800" fill={INK} />
          <circle cx="33.500" cy="22" r="2.800" fill={INK} />
          <path d="M16 31c5 8 15 8 20 0" fill="none" stroke={INK} strokeWidth="2.800" strokeLinecap="round" />
          <circle cx="12.500" cy="30" r="3.200" fill={STICKER_COLORS.red} opacity="0.35" />
          <circle cx="39.500" cy="30" r="3.200" fill={STICKER_COLORS.red} opacity="0.35" />
        </svg>
      );
    case "butterfly":
      return (
        <svg viewBox="0 0 58 46" className="size-full">
          <path d="M27 20C22 8 10 3 4 8c-4 5 0 15 10 17z" fill={color} />
          <path d="M31 20c5-12 17-17 23-12 4 5 0 15-10 17z" fill={color} />
          <path d="M27 24c-9 0-15 6-13 12s9 6 13-2z" fill={STICKER_COLORS.yellow} />
          <path d="M31 24c9 0 15 6 13 12s-9 6-13-2z" fill={STICKER_COLORS.yellow} />
          <circle cx="13" cy="15" r="3" fill="#fff" opacity="0.7" />
          <circle cx="45" cy="15" r="3" fill="#fff" opacity="0.7" />
          <rect x="27.500" y="14" width="3" height="26" rx="1.500" fill={INK} />
          <path d="M28 14c-2-5-5-7-7-7M30 14c2-5 5-7 7-7" fill="none" stroke={INK} strokeWidth="1.400" strokeLinecap="round" />
        </svg>
      );
    case "note":
      return (
        <svg viewBox="0 0 38 52" className="size-full">
          <ellipse cx="11" cy="42" rx="9" ry="7" fill={color} transform="rotate(-18 11 42)" />
          <rect x="17" y="6" width="4" height="36" rx="2" fill={color} />
          <path d="M19 6c6 2 13 4 14 13-5-4-9-4-14-5z" fill={color} />
        </svg>
      );
    case "sparkle":
      return (
        <svg viewBox="0 0 40 40" className="size-full">
          <path d="M20 2 24 16 38 20 24 24 20 38 16 24 2 20 16 16Z" fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "spiral":
      return (
        <svg viewBox="0 0 48 48" className="size-full" fill="none" strokeLinecap="round" stroke={color} strokeWidth="4">
          <path d="M24 24c0-3 4-3 4 0s-6 5-8 0 3-10 12-9 14 12 9 20-18 10-24 3S4 6 18 4" />
        </svg>
      );
    case "zigzag":
      return (
        <svg viewBox="0 0 84 22" className="size-full" fill="none" strokeLinecap="round" strokeLinejoin="round" stroke={color} strokeWidth="5">
          <polyline points="4,16 16,5 28,16 40,5 52,16 64,5 80,16" />
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
