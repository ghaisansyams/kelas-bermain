import type { ImageAsset } from "@/lib/types";

/**
 * Kategori event: nama, warna lencana, dan foto cadangan.
 *
 * Daftarnya diatur admin (Event → Kategori) dan disimpan di tabel
 * `event_categories`. Berkas ini murni, tanpa database, supaya bisa dipakai
 * juga di komponen browser dan sebagai cadangan kalau database tidak terjangkau.
 */

export const CATEGORY_TONES = [
  { value: "brand", label: "Merah" },
  { value: "sun", label: "Kuning" },
  { value: "leaf", label: "Hijau muda" },
  { value: "pine", label: "Hijau tua" },
  { value: "sky", label: "Biru" },
  { value: "grape", label: "Ungu" },
  { value: "neutral", label: "Abu-abu" },
] as const;

export type CategoryTone = (typeof CATEGORY_TONES)[number]["value"];

export interface CategoryDef {
  name: string;
  tone: CategoryTone;
  /** Foto cadangan; kosong berarti memakai foto umum. */
  imageUrl: string;
  imageAlt: string;
}

export const DEFAULT_CATEGORY_IMAGE = "/images/galeri-01.jpg";

/** Enam kategori awal. Dipakai kalau tabel kosong atau database tidak terjangkau. */
export const BUILTIN_CATEGORIES: CategoryDef[] = [
  { name: "Profesi", tone: "brand", imageUrl: "/images/galeri-08.jpg", imageAlt: "Anak kecil berjaket kuning berjalan membawa ransel" },
  { name: "Kuliner", tone: "sun", imageUrl: "/images/galeri-14.jpg", imageAlt: "Kue bundar yang sudah dihias dengan krim dan hiasan" },
  { name: "Alam", tone: "leaf", imageUrl: "/images/galeri-13.jpg", imageAlt: "Aneka sayuran segar hasil panen ditata dalam wadah" },
  { name: "Kreatif", tone: "grape", imageUrl: "/images/galeri-03.jpg", imageAlt: "Tangan anak melukis di atas kertas dengan cat warna-warni" },
  { name: "Eksplorasi", tone: "sky", imageUrl: "/images/galeri-01.jpg", imageAlt: "Tiga anak kecil berpelukan sambil tertawa" },
  { name: "Outdoor", tone: "pine", imageUrl: "/images/galeri-06.jpg", imageAlt: "Anak laki-laki tertawa sambil memegang buku di bangku taman" },
];

export function isCategoryTone(value: unknown): value is CategoryTone {
  return CATEGORY_TONES.some((tone) => tone.value === value);
}

/** Warna dan foto untuk satu nama kategori. Nama yang tidak dikenal tetap aman. */
export function resolveCategoryStyle(
  name: string,
  categories: readonly CategoryDef[],
): { tone: CategoryTone; image: ImageAsset } {
  const found = categories.find((item) => item.name === name);
  return {
    tone: found?.tone ?? "neutral",
    image: {
      src: found?.imageUrl || DEFAULT_CATEGORY_IMAGE,
      alt: found?.imageAlt || `Kegiatan ${name}`,
      // Foto "Tentang Event" ditampilkan 5:4 dan dipotong mengisi kotaknya.
      width: 1200,
      height: 800,
    },
  };
}

/** Panjang nama yang masuk akal untuk lencana dan tombol filter. */
export const CATEGORY_NAME_MAX = 30;
