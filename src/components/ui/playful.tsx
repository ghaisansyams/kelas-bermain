import type { CSSProperties } from "react";
import { Sticker, type StickerKind, STICKER_COLORS } from "@/components/home/stickers";
import { cn } from "@/lib/utils/cn";

/**
 * Perlengkapan "ramah anak" yang dipakai di seluruh halaman publik: tepi
 * bergelombang, kumpulan stiker per halaman, dan konfeti. Semuanya hiasan
 * murni (aria-hidden, tidak bisa diklik) dan tidak pernah di atas teks.
 */

/* ------------------------------------------------------------------ */
/* Tepi bergelombang                                                   */
/* ------------------------------------------------------------------ */

const SCALLOPS = Array.from({ length: 30 }, () => "a24 24 0 0 1 48 0").join("");
const PATHS = {
  // Gelombang halus.
  wave: "M0 26C120 2 240 50 360 26s240-24 360 0 240 24 360 0 240-24 360 0V48H0Z",
  // Tepi awan: setengah lingkaran berjajar.
  scallop: `M0 48V24${SCALLOPS}V48Z`,
} as const;

/**
 * Memahat tepi atas atau bawah sebuah bagian menjadi bergelombang, dengan
 * menimpa tepinya dengan warna halaman (`fill-canvas`). Letaknya di DALAM
 * bagian itu, jadi aman untuk bagian yang `overflow-hidden`. Kalau bagian di
 * seberang tepi bukan warna halaman, ganti warnanya lewat `className`.
 */
export function WaveEdge({
  edge = "bottom",
  shape = "wave",
  className,
}: {
  edge?: "top" | "bottom";
  shape?: keyof typeof PATHS;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 48"
      preserveAspectRatio="none"
      className={cn(
        "pointer-events-none absolute inset-x-0 h-5 w-full fill-canvas sm:h-7",
        edge === "bottom" ? "-bottom-px" : "-top-px -scale-y-100",
        className,
      )}
    >
      <path d={PATHS[shape]} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Adegan stiker                                                       */
/* ------------------------------------------------------------------ */

type Piece = {
  kind: StickerKind;
  color?: keyof typeof STICKER_COLORS;
  className: string;
  rotate?: number;
  delay?: number;
};

/**
 * Setiap adegan hanya memakai sudut kosong. Yang berukuran besar disembunyikan
 * di layar kecil; di HP cukup satu atau dua stiker mungil supaya halaman tidak
 * ramai.
 */
export const SCENES = {
  // Kepala halaman: kanan atas dan sela-sela, teks ada di kiri.
  headerA: [
    { kind: "rocket", color: "blue", className: "right-[8%] top-5 hidden h-24 w-14 md:block", rotate: 18 },
    { kind: "cloud", color: "cyan", className: "right-[24%] top-6 hidden h-10 w-16 md:block", rotate: -6, delay: 0.8 },
    { kind: "sparkle", color: "yellow", className: "right-[4%] bottom-10 hidden size-8 md:block", delay: 1.2 },
    { kind: "pencil", color: "yellow", className: "bottom-5 right-[22%] hidden h-7 w-20 lg:block", rotate: -12, delay: 1.6 },
    { kind: "star", color: "yellow", className: "right-5 top-4 size-7 md:hidden", rotate: 12 },
  ],
  headerB: [
    { kind: "balloon", color: "red", className: "right-[10%] top-4 hidden h-24 w-14 md:block", rotate: 8 },
    { kind: "rainbow", className: "right-[26%] bottom-4 hidden h-12 w-24 md:block", delay: 0.6 },
    { kind: "confetti", className: "right-[4%] top-8 hidden h-12 w-20 lg:block", delay: 1.4 },
    { kind: "heart", color: "red", className: "right-5 top-4 size-7 md:hidden", rotate: -10 },
  ],
  headerC: [
    { kind: "kite", color: "red", className: "right-[9%] top-3 hidden h-28 w-16 md:block", rotate: 14 },
    { kind: "sun", color: "yellow", className: "right-[25%] top-5 hidden size-14 md:block", delay: 0.4 },
    { kind: "flower", color: "red", className: "right-[6%] bottom-4 hidden size-10 lg:block", rotate: 20, delay: 1.1 },
    { kind: "smile", color: "yellow", className: "right-5 top-4 size-8 md:hidden", rotate: 8 },
  ],
  headerD: [
    { kind: "paperplane", color: "blue", className: "right-[12%] top-6 hidden h-12 w-16 md:block", rotate: -8 },
    { kind: "blocks", className: "right-[6%] bottom-3 hidden h-16 w-[4.5rem] md:block", rotate: 6, delay: 0.9 },
    { kind: "spiral", color: "green", className: "right-[28%] bottom-6 hidden size-10 lg:block", rotate: -14, delay: 1.5 },
    { kind: "butterfly", color: "blue", className: "right-5 top-4 h-7 w-9 md:hidden", rotate: 10 },
  ],

  // Bagian di beranda: sudut-sudut di luar kolom isi (lebar layar besar).
  sectionA: [
    { kind: "rainbow", className: "right-[3%] top-6 hidden h-12 w-24 lg:block", delay: 0.5 },
    { kind: "flower", color: "red", className: "bottom-5 left-[2%] hidden size-10 xl:block", rotate: -10, delay: 1.2 },
  ],
  sectionB: [
    { kind: "balloon", color: "yellow", className: "left-[2%] top-8 hidden h-20 w-12 xl:block", rotate: -8 },
    { kind: "butterfly", color: "blue", className: "right-[3%] bottom-6 hidden h-10 w-12 lg:block", rotate: 12, delay: 1 },
  ],
  sectionC: [
    { kind: "crayon", color: "red", className: "right-[3%] top-5 hidden h-8 w-24 lg:block", rotate: 12 },
    { kind: "note", color: "blue", className: "bottom-6 left-[3%] hidden h-14 w-10 xl:block", rotate: -10, delay: 0.8 },
    { kind: "sparkle", color: "yellow", className: "right-[9%] bottom-8 hidden size-8 lg:block", delay: 1.4 },
  ],
  sectionD: [
    { kind: "paperplane", color: "green", className: "left-[3%] top-6 hidden h-12 w-16 xl:block", rotate: -6 },
    { kind: "sun", color: "yellow", className: "right-[3%] top-5 hidden size-14 lg:block", delay: 0.6 },
    { kind: "zigzag", color: "red", className: "bottom-4 right-[10%] hidden h-5 w-20 lg:block", delay: 1.3 },
  ],

  // Kartu pembuka di halaman form: hanya di sisi luar, lebar layar besar.
  form: [
    { kind: "balloon", color: "red", className: "left-[4%] top-40 hidden h-24 w-14 2xl:block", rotate: -8 },
    { kind: "rainbow", className: "right-[4%] top-48 hidden h-14 w-28 2xl:block", delay: 0.7 },
    { kind: "sparkle", color: "yellow", className: "right-[6%] top-[28rem] hidden size-9 2xl:block", delay: 1.2 },
    { kind: "flower", color: "blue", className: "left-[5%] top-[30rem] hidden size-11 2xl:block", rotate: 15, delay: 0.4 },
  ],

  // Kaki halaman.
  footer: [
    { kind: "sun", color: "yellow", className: "right-[4%] top-8 hidden size-16 md:block" },
    { kind: "cloud", color: "cyan", className: "right-[22%] top-10 hidden h-10 w-16 md:block", delay: 0.8 },
    { kind: "butterfly", color: "red", className: "bottom-24 left-[46%] hidden h-9 w-12 lg:block", rotate: -8, delay: 1.2 },
    { kind: "star", color: "yellow", className: "right-5 top-6 size-7 md:hidden", rotate: 12 },
  ],

  // Halaman tidak ditemukan: ramai sedikit, ini halaman yang memang boleh jenaka.
  lost: [
    { kind: "balloon", color: "red", className: "left-[8%] top-16 hidden h-28 w-16 md:block", rotate: -10 },
    { kind: "kite", color: "blue", className: "right-[9%] top-10 hidden h-32 w-[4.5rem] md:block", rotate: 12, delay: 0.6 },
    { kind: "rainbow", className: "left-[16%] bottom-10 hidden h-14 w-28 md:block", delay: 1 },
    { kind: "rocket", color: "yellow", className: "right-[16%] bottom-8 hidden h-24 w-14 md:block", rotate: 24, delay: 0.3 },
    { kind: "smile", color: "yellow", className: "left-6 top-6 size-9 md:hidden", rotate: -8 },
  ],
} satisfies Record<string, Piece[]>;

export type SceneName = keyof typeof SCENES;

/**
 * Menaruh sebuah adegan di belakang isi. Induknya harus `relative`, dan
 * `isolate` supaya lapisan di belakang isi tidak tenggelam di bawah latar
 * induk itu sendiri.
 */
export function DecorScene({ name, className }: { name: SceneName; className?: string }) {
  const pieces: readonly Piece[] = SCENES[name];
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      {pieces.map((piece, index) => (
        <Sticker
          key={`${piece.kind}-${index}`}
          kind={piece.kind}
          color={piece.color}
          className={piece.className}
          rotate={piece.rotate}
          delay={piece.delay}
        />
      ))}
    </div>
  );
}

/** Memilih salah satu adegan kepala halaman secara tetap dari sebuah teks. */
export function headerSceneFor(seed: string): SceneName {
  const scenes: SceneName[] = ["headerA", "headerB", "headerC", "headerD"];
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return scenes[hash % scenes.length];
}

/* ------------------------------------------------------------------ */
/* Konfeti                                                             */
/* ------------------------------------------------------------------ */

const CONFETTI_COLORS = Object.values(STICKER_COLORS);

/**
 * Letusan konfeti sekali jalan, murni CSS. Posisi tiap kepingnya dihitung dari
 * nomor urutnya (bukan Math.random) supaya hasil di server dan di browser
 * sama persis. Mati sendiri bila pengunjung memilih mengurangi gerakan.
 */
export function Confetti({ count = 30, className }: { count?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute left-1/2 top-16 h-0 w-0 motion-reduce:hidden", className)}>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.35;
        const reach = 90 + ((i * 53) % 110);
        const style = {
          "--dx": `${Math.round(Math.cos(angle) * reach)}px`,
          "--dy": `${Math.round(Math.sin(angle) * reach - 40)}px`,
          "--rot": `${(i * 97) % 540}deg`,
          animationDelay: `${(i % 6) * 0.03}s`,
          backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          width: i % 3 === 0 ? 9 : 6,
          height: i % 3 === 0 ? 9 : 13,
          borderRadius: i % 3 === 0 ? "9999px" : "2px",
        } as CSSProperties;
        return <span key={i} className="kb-confetti-piece absolute" style={style} />;
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Awan yang melayang                                                  */
/* ------------------------------------------------------------------ */

/**
 * Awan yang pelan-pelan melintasi bagian dari kiri ke kanan. Letaknya
 * `top` (persen), lamanya `seconds` per lintasan, dan `offset` menggeser
 * awal geraknya supaya beberapa awan tidak berangkat bersamaan.
 */
export function Drifter({
  top,
  seconds = 70,
  offset = 0,
  className,
}: {
  top: string;
  seconds?: number;
  offset?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className="kb-drift pointer-events-none absolute left-0 hidden motion-reduce:hidden sm:block"
      style={{ top, animationDuration: `${seconds}s`, animationDelay: `-${offset}s` }}
    >
      <Sticker kind="cloud" color="cyan" still className={cn("relative block h-9 w-14 opacity-30", className)} />
    </span>
  );
}
