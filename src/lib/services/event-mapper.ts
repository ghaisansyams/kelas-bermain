import type {
  AgendaItem,
  EventCategory,
  EventRecord,
  EventRegistrationInfo,
  ImageAsset,
} from "@/lib/types";

/**
 * Row shape of the `events` table. JSON columns keep the nested parts of an
 * event (location, agenda, registration) in one place instead of spreading
 * them over a dozen scalar columns nobody queries individually.
 */
export interface EventRow {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  description: string[] | null;
  about_event: EventRecord["aboutEvent"] | null;
  category: string;
  cover: ImageAsset;
  poster: ImageAsset | null;
  start_date: string;
  end_date: string;
  time_start: string;
  time_end: string;
  timezone: string;
  location: EventRecord["location"];
  organizer: string;
  age_min: number;
  age_max: number;
  capacity: number;
  registered: number;
  registration: EventRegistrationInfo;
  agenda: AgendaItem[] | null;
  speaker_ids: string[] | null;
  facilities: string[] | null;
  requirements: string[] | null;
  certificate: EventRecord["certificate"];
  video: EventRecord["video"] | null;
  featured: boolean;
  status: string;
}

export const EVENT_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_STATUS_LABEL: Record<string, { text: string; tone: string }> = {
  DRAFT: { text: "Draft", tone: "grey" },
  PUBLISHED: { text: "Tayang", tone: "green" },
  ONGOING: { text: "Berlangsung", tone: "amber" },
  COMPLETED: { text: "Selesai", tone: "grey" },
  CANCELLED: { text: "Dibatalkan", tone: "red" },
  ARCHIVED: { text: "Diarsipkan", tone: "grey" },
};

/** DB row → the EventRecord shape every page already understands. */
export function rowToEventRecord(row: EventRow): EventRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: row.tagline ?? "",
    summary: row.summary ?? "",
    description: row.description ?? [],
    aboutEvent: row.about_event ?? undefined,
    category: row.category as EventCategory,
    cover: row.cover,
    poster: row.poster ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    timeStart: row.time_start,
    timeEnd: row.time_end,
    timezone: row.timezone,
    location: row.location,
    organizer: row.organizer,
    ageRange: [row.age_min, row.age_max],
    capacity: row.capacity,
    registered: row.registered,
    registration: row.registration,
    agenda: row.agenda ?? [],
    speakerIds: row.speaker_ids ?? [],
    facilities: row.facilities ?? [],
    requirements: row.requirements ?? [],
    certificate: row.certificate,
    video: row.video ?? undefined,
    featured: row.featured,
    published: row.status === "PUBLISHED" || row.status === "ONGOING",
  };
}

/** EventRecord → DB row, used by the catalogue import and the admin form. */
export function eventRecordToRow(record: EventRecord, status: EventStatus) {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    tagline: record.tagline,
    summary: record.summary,
    description: record.description,
    about_event: record.aboutEvent ?? null,
    category: record.category,
    cover: record.cover,
    poster: record.poster ?? null,
    start_date: record.startDate,
    end_date: record.endDate,
    time_start: record.timeStart,
    time_end: record.timeEnd,
    timezone: record.timezone,
    location: record.location,
    organizer: record.organizer,
    age_min: record.ageRange[0],
    age_max: record.ageRange[1],
    capacity: record.capacity,
    registered: record.registered,
    registration: record.registration,
    agenda: record.agenda,
    speaker_ids: record.speakerIds,
    facilities: record.facilities,
    requirements: record.requirements,
    certificate: record.certificate,
    video: record.video ?? null,
    featured: record.featured,
    status,
  };
}
