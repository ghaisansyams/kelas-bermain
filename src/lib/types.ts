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
  /** Rupiah, integer. Only meaningful when `type` is PAID. */
  price?: number;
  currency?: "IDR";
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

/** An event exactly as an admin would store it. */
export interface EventRecord {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  /** Long description, one string per paragraph. */
  description: string[];
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

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar: ImageAsset;
  eventTitle?: string;
}

export interface SocialPost {
  id: string;
  image: ImageAsset;
  caption: string;
  likes: number;
  comments: number;
  permalink: string;
  postedAt: string;
}
