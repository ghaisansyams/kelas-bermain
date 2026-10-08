import type { PaymentMethod } from "@/lib/repositories/types";

/**
 * Domain model for Kelas Bermain.
 *
 * These types are the contract between the UI and whatever supplies the
 * content. Today the supplier is the static fixtures in `src/data`; later it
 * can be a CMS, Supabase, or a REST API. As long as the new source returns
 * these shapes, no component has to change.
 */

export type EventCategory =
  | "Profesi"
  | "Kuliner"
  | "Alam"
  | "Kreatif"
  | "Eksplorasi"
  | "Outdoor";

export const EVENT_CATEGORIES: EventCategory[] = [
  "Profesi",
  "Kuliner",
  "Alam",
  "Kreatif",
  "Eksplorasi",
  "Outdoor",
];

/** How a participant pays to join. */
export type RegistrationType = "FREE" | "PAID";

/**
 * How a price is shown on the event *card* — independent of whether the
 * event actually costs money. A PAID event can still hide its price
 * (HIDDEN); a FREE event always resolves to FREE. When an event doesn't set
 * this explicitly, `resolvePriceDisplay` derives it from `type` so existing
 * data keeps working unchanged.
 */
export type PriceDisplay = "HIDDEN" | "SHOW_PRICE" | "FREE";

/** Card-display price rule, defaulting from `type` when not set explicitly. */
export function resolvePriceDisplay(registration: {
  type: RegistrationType;
  priceDisplay?: PriceDisplay;
}): PriceDisplay {
  if (registration.priceDisplay) return registration.priceDisplay;
  return registration.type === "FREE" ? "FREE" : "SHOW_PRICE";
}

/** Where an event sits on the calendar. Derived from its dates, never stored. */
export type EventLifecycle = "upcoming" | "ongoing" | "past";

/** Whether the registration desk is taking sign-ups. */
export type RegistrationAvailability = "open" | "full" | "closed";

export interface ImageAsset {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface EventLocation {
  venue: string;
  city: string;
  address?: string;
  /** Free-text hint shown under the address, e.g. "5 menit dari Stasiun". */
  note?: string;
}

export interface AgendaItem {
  time: string;
  title: string;
  description?: string;
}

export interface EventRegistrationInfo {
  type: RegistrationType;
  /**
   * How the money is collected. A PAID event is either settled on this site
   * (WEBSITE, mock gateway for now) or handed off to an external platform
   * (THIRD_PARTY). FREE events use NONE.
   */
  method: PaymentMethod;
  /** Rupiah, integer. Only meaningful when `type` is PAID. */
  price?: number;
  /** Card-display override — see `resolvePriceDisplay`. Rarely set explicitly. */
  priceDisplay?: PriceDisplay;
  currency?: "IDR";
  /** Where THIRD_PARTY registrations continue. */
  thirdPartyUrl?: string;
  /** ISO date; sign-ups close at the end of this day. */
  deadline: string;
  /** Explicit override. When absent, availability is derived from capacity. */
  status?: RegistrationAvailability;
  notes?: string[];
}

export interface CertificatePolicy {
  available: boolean;
  /** Template identifier, so an admin can pick a design per event later. */
  template: "classic" | "playful";
  /** Certificates are only issued once attendance is recorded. */
  requiresAttendance: boolean;
}

/**
 * Visual-first "Tentang Event" content. Both fields are optional per event —
 * `description` falls back to the event's own `description` paragraphs, and
 * `images` falls back to a category default (see `resolveAboutEvent`) — so
 * existing events need no changes and an admin can override either piece
 * independently later. `images` is a list (not a single field) so a second
 * or third photo can be added without a shape change.
 */
export interface AboutEventContent {
  description?: string[];
  images: ImageAsset[];
}

/**
 * Preview video for the detail page's sidebar, shown right under the
 * registration card. Optional — an event without one simply renders no
 * video card, never an empty placeholder (see `EventVideoCard`).
 */
export interface EventVideo {
  /** Empty when the event uses an uploaded file instead. */
  youtubeUrl: string;
  title?: string;
  thumbnail?: string;
  /** Media Library URL of an uploaded MP4/WEBM. Takes priority over YouTube. */
  fileUrl?: string;
}

/** An event exactly as an admin would store it. */
export interface EventRecord {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  /** Long description, one string per paragraph. */
  description: string[];
  /** Visual-first content for the detail page's "Tentang Event" section. */
  aboutEvent?: AboutEventContent;
  category: EventCategory;
  /** Wide image used for card and hero crops. */
  cover: ImageAsset;
  /**
   * The designer's original poster, usually Instagram portrait (4:5).
   * Shown uncropped — the card letterboxes it over a blurred copy of itself,
   * and the detail page renders it at full size.
   */
  poster?: ImageAsset;
  /** ISO date-time of the first and last day. */
  startDate: string;
  endDate: string;
  /** Display-only clock times, e.g. "09:00". */
  timeStart: string;
  timeEnd: string;
  timezone: string;
  location: EventLocation;
  organizer: string;
  /** Inclusive age range in years, e.g. [3, 15]. */
  ageRange: [number, number];
  capacity: number;
  registered: number;
  registration: EventRegistrationInfo;
  agenda: AgendaItem[];
  /** Speaker ids resolved against `speakers` data. */
  speakerIds: string[];
  facilities: string[];
  requirements: string[];
  certificate: CertificatePolicy;
  /** Preview video for the detail page — absent for most events today. */
  video?: EventVideo;
  featured: boolean;
  published: boolean;
}

/** An event enriched with everything the UI needs, computed on the server. */
export interface EventView extends EventRecord {
  lifecycle: EventLifecycle;
  availability: RegistrationAvailability;
  seatsLeft: number;
  /** 0–100, for the capacity meter. */
  filledPercent: number;
}

/** Activities use the same taxonomy as events. */
export type ActivityCategory = EventCategory;

export interface ActivityHighlight {
  label: string;
  value: string;
}

export interface ActivityRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string[];
  category: ActivityCategory;
  cover: ImageAsset;
  date: string;
  endDate?: string;
  location: EventLocation;
  participants: number;
  highlights: ActivityHighlight[];
  timeline: AgendaItem[];
  /** Gallery item ids belonging to this activity. */
  galleryIds: string[];
  relatedSlugs: string[];
  published: boolean;
}

export type GalleryCategory = "Event" | "Kegiatan" | "Kreatif" | "Kuliner";

export interface GalleryItem {
  id: string;
  image: ImageAsset;
  title: string;
  category: GalleryCategory;
  date: string;
  caption: string;
  /** Optional links back to the event or activity the photo came from. */
  eventSlug?: string;
  activitySlug?: string;
}

export interface Speaker {
  id: string;
  name: string;
  role: string;
  organization: string;
  bio: string;
  avatar: ImageAsset;
}

/**
 * Optional per testimonial — the section renders whatever it's given, so a
 * testimonial that hasn't been recorded on video yet still shows fine.
 */
export interface TestimonialVideo {
  youtubeUrl: string;
  /** Falls back to a YouTube-hosted thumbnail derived from the URL when absent. */
  thumbnail?: string;
  /** e.g. "1:24". Purely a display label, not validated against the video. */
  duration?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar: ImageAsset;
  eventTitle?: string;
  video?: TestimonialVideo;
}

export type UpdateCategory = "Kegiatan" | "Event" | "Pengumuman" | "Dokumentasi";

export type UpdateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/**
 * A public update, independent of where it came from. Today the mock adapter
 * fills these in; a future Instagram Graph API adapter or ERP-managed post
 * fills the same shape. Only PUBLISHED items ever reach the public site.
 */
export interface UpdatePost {
  id: string;
  slug: string;
  platform: "instagram";
  username: string;
  /** Link to the original post, for the "Lihat di Instagram" CTA. */
  postUrl: string;
  image: ImageAsset;
  title: string;
  caption: string;
  excerpt: string;
  /** ISO date (YYYY-MM-DD). Sorted newest first. */
  publishedAt: string;
  type: "POST";
  category: UpdateCategory;
  status: UpdateStatus;
}
