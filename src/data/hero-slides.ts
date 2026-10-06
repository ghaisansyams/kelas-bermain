/**
 * Home hero carousel — 4 real event photos standing in for the "Kelas
 * terdekat" floating card, one per slide. Each `eventSlug` should resolve
 * against `src/data/events.ts`; swap the array's contents to change what the
 * hero shows without touching `HeroSlider` itself.
 */
export interface HeroSlide {
  id: string;
  image: string;
  alt: string;
  title: string;
  date: string;
  location: string;
  eventSlug: string;
}

export const heroSlides: HeroSlide[] = [
  {
    id: "pemadam-cilik",
    image: "/images/event-pemadam-cilik.jpg",
    alt: "Anak-anak mengenal profesi pemadam kebakaran dan berkeliling naik mobil damkar",
    title: "Pemadam Cilik",
    date: "4 Oktober 2026",
    location: "Depok",
    eventSlug: "pemadam-cilik-oktober-2026",
  },
  {
    id: "decorate-mini-cake",
    image: "/images/event-decorate-mini-cake.jpg",
    alt: "Anak-anak menghias mini cake sendiri di meja kerja mereka",
    title: "Decorate Mini Cake",
    date: "11 Oktober 2026",
    location: "Depok",
    eventSlug: "decorate-mini-cake-oktober-2026",
  },
  {
    id: "cocoa-maker",
    image: "/images/event-cocoa-maker.jpg",
    alt: "Anak-anak membuat cokelat dari biji kakao bersama fasilitator",
    title: "Cocoa Maker",
    date: "8 November 2026",
    location: "Depok",
    eventSlug: "cocoa-maker-november-2026",
  },
  {
    id: "little-farmer",
    image: "/images/event-little-farmer.jpg",
    alt: "Anak-anak menanam dan memanen sayuran di kebun konservasi",
    title: "Little Farmer",
    date: "22 November 2026",
    location: "Tangerang Selatan",
    eventSlug: "little-farmer-november-2026",
  },
];
