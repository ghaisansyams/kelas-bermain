import { activities } from "@/data/activities";
import { events } from "@/data/events";
import { galleryDrive, galleryFeatured, galleryItems } from "@/data/gallery";
import { instagramPosts } from "@/data/instagram";
import { speakers } from "@/data/speakers";
import { testimonials } from "@/data/testimonials";
import { isDeadlinePassed, resolveLifecycle } from "@/lib/utils/date";
import type {
  ActivityRecord,
  EventRecord,
  EventView,
  GalleryItem,
  RegistrationAvailability,
  SocialPost,
  Speaker,
  Testimonial,
} from "@/lib/types";

/**
 * Read model for published content.
 *
 * Everything is async on purpose: the current implementation resolves from the
 * static fixtures in `src/data`, but the signatures already match what a CMS or
 * database client would return, so swapping the source never reaches the UI.
 *
 * Call these from server components only — they compute event lifecycle against
 * the server clock, and passing the resolved values down keeps client and
 * server markup identical.
 */

function resolveAvailability(
  record: EventRecord,
  lifecycle: EventView["lifecycle"],
  now: Date,
): RegistrationAvailability {
  if (record.registration.status) return record.registration.status;
  if (lifecycle !== "upcoming") return "closed";
  if (isDeadlinePassed(record.registration.deadline, now)) return "closed";
  if (record.registered >= record.capacity) return "full";
  return "open";
}

function toEventView(record: EventRecord, now: Date): EventView {
  const lifecycle = resolveLifecycle(record.startDate, record.endDate, now);
  const seatsLeft = Math.max(0, record.capacity - record.registered);
  const filledPercent =
    record.capacity > 0
      ? Math.min(100, Math.round((record.registered / record.capacity) * 100))
      : 0;
  return {
    ...record,
    lifecycle,
    availability: resolveAvailability(record, lifecycle, now),
    seatsLeft,
    filledPercent,
  };
}

/** Upcoming first (soonest first), then ongoing, then past (most recent first). */
const LIFECYCLE_ORDER: Record<EventView["lifecycle"], number> = {
  ongoing: 0,
  upcoming: 1,
  past: 2,
};

function sortEvents(a: EventView, b: EventView): number {
  const order = LIFECYCLE_ORDER[a.lifecycle] - LIFECYCLE_ORDER[b.lifecycle];
  if (order !== 0) return order;
  const aTime = new Date(a.startDate).getTime();
  const bTime = new Date(b.startDate).getTime();
  return a.lifecycle === "past" ? bTime - aTime : aTime - bTime;
}

export async function getEvents(now: Date = new Date()): Promise<EventView[]> {
  return events
    .filter((event) => event.published)
    .map((event) => toEventView(event, now))
    .sort(sortEvents);
}

export async function getUpcomingEvents(
  limit = 3,
  now: Date = new Date(),
): Promise<EventView[]> {
  const all = await getEvents(now);
  const upcoming = all.filter((event) => event.lifecycle !== "past");
  // Fall back to the most recent events so the home page is never empty.
  const list = upcoming.length > 0 ? upcoming : all;
  return list.slice(0, limit);
}

export async function getEventBySlug(
  slug: string,
  now: Date = new Date(),
): Promise<EventView | null> {
  const record = events.find((event) => event.slug === slug && event.published);
  return record ? toEventView(record, now) : null;
}

export async function getEventSlugs(): Promise<string[]> {
  return events.filter((event) => event.published).map((event) => event.slug);
}

export async function getRelatedEvents(
  slug: string,
  limit = 3,
  now: Date = new Date(),
): Promise<EventView[]> {
  const current = await getEventBySlug(slug, now);
  if (!current) return [];
  const all = await getEvents(now);
  const others = all.filter((event) => event.slug !== slug);
  const sameCategory = others.filter((event) => event.category === current.category);
  const rest = others.filter((event) => event.category !== current.category);
  return [...sameCategory, ...rest].slice(0, limit);
}

export async function getActivities(): Promise<ActivityRecord[]> {
  return activities
    .filter((activity) => activity.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getActivityBySlug(slug: string): Promise<ActivityRecord | null> {
  return activities.find((item) => item.slug === slug && item.published) ?? null;
}

export async function getActivitySlugs(): Promise<string[]> {
  return activities.filter((activity) => activity.published).map((a) => a.slug);
}

export async function getRelatedActivities(
  slug: string,
  limit = 3,
): Promise<ActivityRecord[]> {
  const current = await getActivityBySlug(slug);
  if (!current) return [];
  const all = await getActivities();
  const explicit = current.relatedSlugs
    .map((related) => all.find((item) => item.slug === related))
    .filter((item): item is ActivityRecord => Boolean(item));
  const filler = all.filter(
    (item) => item.slug !== slug && !explicit.some((pick) => pick.slug === item.slug),
  );
  return [...explicit, ...filler].slice(0, limit);
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  return [...galleryItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getGalleryFeatured(): Promise<typeof galleryFeatured> {
  return galleryFeatured;
}

/** The Drive folder the gallery page links to, in place of a photo grid. */
export async function getGalleryDrive(): Promise<typeof galleryDrive> {
  return galleryDrive;
}

export async function getGalleryByIds(ids: readonly string[]): Promise<GalleryItem[]> {
  return ids
    .map((id) => galleryItems.find((item) => item.id === id))
    .filter((item): item is GalleryItem => Boolean(item));
}

export async function getSpeakersByIds(ids: readonly string[]): Promise<Speaker[]> {
  return ids
    .map((id) => speakers.find((speaker) => speaker.id === id))
    .filter((speaker): speaker is Speaker => Boolean(speaker));
}

export async function getSpeakers(): Promise<Speaker[]> {
  return speakers;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  return testimonials;
}

export async function getSocialFeed(): Promise<SocialPost[]> {
  return instagramPosts;
}
