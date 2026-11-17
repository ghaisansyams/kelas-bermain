import type { AboutEventContent, EventRecord, ImageAsset } from "@/lib/types";

/**
 * Ukuran foto "Tentang Event" (rasio 5:4). Halaman publik, pratinjau admin,
 * dan data yang disimpan semuanya memakai angka ini, supaya foto selalu
 * tampil dengan bentuk yang sama di semua event.
 */
export const ABOUT_IMAGE_WIDTH = 1350;
export const ABOUT_IMAGE_HEIGHT = 1080;

/**
 * Menyelesaikan isi "Tentang Event". Event tanpa foto sendiri memakai foto
 * cadangan kategorinya (`categoryImage`, diatur admin di Event → Kategori),
 * bukan sampul atau poster event, supaya tidak sama dengan gambar di atasnya.
 */
export function resolveAboutEvent(
  event: Pick<EventRecord, "description" | "aboutEvent"> & { categoryImage: ImageAsset },
): Required<AboutEventContent> {
  return {
    description: event.aboutEvent?.description ?? event.description,
    images:
      event.aboutEvent?.images && event.aboutEvent.images.length > 0
        ? event.aboutEvent.images
        : [event.categoryImage],
  };
}
