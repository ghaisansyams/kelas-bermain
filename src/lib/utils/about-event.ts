import type { AboutEventContent, EventCategory, EventRecord, ImageAsset } from "@/lib/types";

/**
 * Category fallback for events that haven't been given a bespoke
 * `aboutEvent.images` yet — real photos from the gallery library, never an
 * event's own cover/poster, so "Tentang Event" always shows a different
 * asset than the hero above it. Swap an event to a specific photo by adding
 * `aboutEvent` to its record in `src/data/events.ts`; this map only covers
 * the gap until that's done.
 */
const CATEGORY_FALLBACK_IMAGE: Record<EventCategory, ImageAsset> = {
  Profesi: {
    src: "/images/galeri-08.jpg",
    alt: "Anak kecil berjaket kuning berjalan membawa ransel",
    width: 1200,
    height: 800,
  },
  Kuliner: {
    src: "/images/galeri-14.jpg",
    alt: "Kue bundar yang sudah dihias dengan krim dan hiasan",
    width: 1200,
    height: 800,
  },
  Alam: {
    src: "/images/galeri-13.jpg",
    alt: "Aneka sayuran segar hasil panen ditata dalam wadah",
    width: 1200,
    height: 800,
  },
  Kreatif: {
    src: "/images/galeri-03.jpg",
    alt: "Tangan anak melukis di atas kertas dengan cat warna-warni",
    width: 1200,
    height: 800,
  },
  Eksplorasi: {
    src: "/images/galeri-01.jpg",
    alt: "Tiga anak kecil berpelukan sambil tertawa",
    width: 1200,
    height: 800,
  },
  Outdoor: {
    src: "/images/galeri-06.jpg",
    alt: "Anak laki-laki tertawa sambil memegang buku di bangku taman",
    width: 1200,
    height: 800,
  },
};

/** Resolves the "Tentang Event" content, filling in what an event didn't set. */
export function resolveAboutEvent(
  event: Pick<EventRecord, "description" | "category" | "aboutEvent">,
): Required<AboutEventContent> {
  return {
    description: event.aboutEvent?.description ?? event.description,
    images:
      event.aboutEvent?.images && event.aboutEvent.images.length > 0
        ? event.aboutEvent.images
        : [CATEGORY_FALLBACK_IMAGE[event.category]],
  };
}
