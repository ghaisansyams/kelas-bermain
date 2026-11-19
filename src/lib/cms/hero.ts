import { heroSlides as defaultSlides, type HeroSlide } from "@/data/hero-slides";
import type { EventView } from "@/lib/types";
import { formatDateRange } from "@/lib/utils/date";

/**
 * Banner beranda punya dua mode:
 *  - "auto": diisi dari event yang tayang, yang tanggalnya paling dekat paling
 *    depan. Event baru langsung masuk, event yang sudah lewat keluar sendiri.
 *  - "manual": slide yang disusun admin satu per satu di CMS.
 */
export type HeroMode = "auto" | "manual";

/** Jumlah event paling banyak di banner otomatis. */
export const AUTO_HERO_MAX = 5;

type Content = Record<string, unknown> | null | undefined;

/** Slide buatan admin; slide tanpa gambar tidak pernah sampai ke publik. */
export function parseManualSlides(content: Content): HeroSlide[] {
  const raw = content?.slides;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: String(item.id ?? `slide-${index}`),
      image: String(item.image ?? ""),
      alt: String(item.alt ?? ""),
      title: String(item.title ?? ""),
      date: String(item.date ?? ""),
      location: String(item.location ?? ""),
      eventSlug: String(item.eventSlug ?? ""),
    }))
    .filter((slide) => slide.image !== "");
}

/**
 * Isi lama yang tersimpan tanpa mode dianggap manual kalau sudah punya slide,
 * supaya banner yang sudah diatur admin tidak berubah sendiri; selain itu otomatis.
 */
export function heroMode(content: Content): HeroMode {
  if (content?.mode === "manual") return "manual";
  if (content?.mode === "auto") return "auto";
  return parseManualSlides(content).length > 0 ? "manual" : "auto";
}

/**
 * Event menjadi slide. `events` sudah terurut dari yang paling dekat
 * (berlangsung dulu, lalu paling cepat dimulai). Yang sudah lewat tidak
 * dipakai; kalau tidak ada yang akan datang, tiga event terbaru ditampilkan
 * supaya banner tidak kosong.
 */
export function eventsToHeroSlides(events: EventView[], max = AUTO_HERO_MAX): HeroSlide[] {
  const withCover = events.filter((event) => Boolean(event.cover?.src));
  const upcoming = withCover.filter((event) => event.lifecycle !== "past");
  const chosen = upcoming.length > 0 ? upcoming.slice(0, max) : withCover.slice(0, 3);
  return chosen.map((event) => ({
    id: `event-${event.slug}`,
    image: event.cover.src,
    alt: event.cover.alt || `Foto ${event.title}`,
    title: event.title,
    date: formatDateRange(event.startDate, event.endDate),
    location: event.location.city || event.location.venue,
    eventSlug: event.slug,
  }));
}

/** Slide yang akhirnya tampil di beranda. */
export function resolveHeroSlides(content: Content, events: EventView[]): HeroSlide[] {
  if (heroMode(content) === "manual") {
    const manual = parseManualSlides(content);
    if (manual.length > 0) return manual;
  }
  const fromEvents = eventsToHeroSlides(events);
  return fromEvents.length > 0 ? fromEvents : defaultSlides;
}
