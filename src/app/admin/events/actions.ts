"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { events as catalogueEvents } from "@/data/events";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { EVENT_STATUSES, eventRecordToRow, type EventStatus } from "@/lib/services/event-mapper";

/** Everything the public site caches off events. */
function revalidatePublicEventPages(slug?: string) {
  revalidatePath("/");
  revalidatePath("/event");
  if (slug) {
    revalidatePath(`/event/${slug}`);
    revalidatePath(`/register/${slug}`);
  }
  revalidatePath("/admin/events");
}

async function logActivity(
  userId: string,
  action: string,
  entityId: string,
  newValue: unknown,
  oldValue?: unknown,
) {
  const json = (value: unknown) =>
    value === null || value === undefined ? Prisma.DbNull : (value as Prisma.InputJsonValue);

  await db.activity_logs.create({
    data: {
      user_id: userId,
      action,
      entity: "events",
      entity_id: entityId,
      old_value: json(oldValue),
      new_value: json(newValue),
    },
  });
}

/**
 * Baris event dari formulir/katalog ke bentuk yang diminta Prisma.
 *
 * Tanggal datang sebagai teks "YYYY-MM-DD" dan kolomnya bertipe date. Kolom
 * JSON yang boleh kosong tidak menerima null biasa; harus JsonNull, kalau
 * tidak Prisma menolaknya sebagai nilai JSON yang tidak sah.
 */
type EventRowInput = ReturnType<typeof eventRecordToRow> | ReturnType<typeof buildPayload>;

function toEventData(row: EventRowInput) {
  const nullable = (value: unknown) =>
    value === null || value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  const json = (value: unknown) => value as Prisma.InputJsonValue;

  return {
    slug: row.slug,
    title: row.title,
    tagline: row.tagline,
    summary: row.summary,
    description: json(row.description),
    about_event: nullable("about_event" in row ? row.about_event : null),
    category: row.category,
    cover: json(row.cover),
    poster: nullable("poster" in row ? row.poster : null),
    start_date: new Date(row.start_date),
    end_date: new Date(row.end_date),
    time_start: row.time_start,
    time_end: row.time_end,
    timezone: row.timezone,
    location: json(row.location),
    organizer: row.organizer,
    age_min: row.age_min,
    age_max: row.age_max,
    capacity: row.capacity,
    registration: json(row.registration),
    agenda: json(row.agenda),
    speaker_ids: json("speaker_ids" in row ? row.speaker_ids : []),
    facilities: json(row.facilities),
    requirements: json(row.requirements),
    certificate: json(row.certificate),
    video: nullable(row.video),
    featured: row.featured,
    status: row.status,
  };
}

/** One-time move of the hard-coded catalogue into the database. */
export async function importCatalogueAction() {
  const session = await requireAdmin();

  const rows = catalogueEvents.map((event) =>
    eventRecordToRow(event, event.published ? "PUBLISHED" : "DRAFT"),
  );

  let failed = false;
  try {
    // Satu transaksi: katalog masuk seluruhnya atau tidak sama sekali.
    await db.$transaction(
      rows.map((row) =>
        db.events.upsert({
          where: { id: row.id },
          // `registered` sengaja hanya diisi saat membuat. Angka itu dijaga
          // trigger dari jumlah pendaftaran yang nyata; menimpanya dengan
          // angka contoh dari katalog saat impor ulang akan membuat kuota
          // bohong sampai pendaftaran berikutnya.
          create: { id: row.id, registered: 0, ...toEventData(row) },
          update: toEventData(row),
        }),
      ),
    );
    await logActivity(session.userId, "IMPORT_CATALOGUE", "events", { count: rows.length });
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/events?status=error");

  revalidatePublicEventPages();
  redirect("/admin/events?status=imported");
}

function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildPayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim() || slugify(title);
  const priceRaw = Number(formData.get("price") ?? 0);
  const youtubeUrl = String(formData.get("youtubeUrl") ?? "").trim();
  const videoFileUrl = String(formData.get("videoFileUrl") ?? "").trim();
  const price = Number.isFinite(priceRaw) ? priceRaw : 0;
  const registrationType = price > 0 ? "PAID" : "FREE";

  return {
    slug,
    title,
    tagline: String(formData.get("tagline") ?? "").trim(),
    summary: String(formData.get("summary") ?? "").trim(),
    description: lines(formData.get("description")),
    category: String(formData.get("category") ?? "Kegiatan"),
    cover: {
      src: String(formData.get("coverSrc") ?? "").trim(),
      alt: String(formData.get("coverAlt") ?? "").trim(),
      width: 1600,
      height: 1000,
    },
    start_date: String(formData.get("startDate") ?? ""),
    end_date: String(formData.get("endDate") ?? "") || String(formData.get("startDate") ?? ""),
    time_start: String(formData.get("timeStart") ?? "09:00"),
    time_end: String(formData.get("timeEnd") ?? "12:00"),
    timezone: "WIB",
    location: {
      venue: String(formData.get("venue") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim() || undefined,
      note: String(formData.get("locationNote") ?? "").trim() || undefined,
    },
    organizer: String(formData.get("organizer") ?? "Kelas Bermain").trim(),
    age_min: Number(formData.get("ageMin") ?? 3) || 3,
    age_max: Number(formData.get("ageMax") ?? 15) || 15,
    capacity: Number(formData.get("capacity") ?? 0) || 0,
    registration: {
      type: registrationType,
      method: registrationType === "FREE" ? "NONE" : "WEBSITE",
      price: price > 0 ? price : undefined,
      priceDisplay: String(formData.get("priceDisplay") ?? "SHOW_PRICE"),
      currency: "IDR" as const,
      deadline: String(formData.get("deadline") ?? "") || String(formData.get("startDate") ?? ""),
      notes: lines(formData.get("registrationNotes")),
    },
    agenda: lines(formData.get("agenda")).map((line) => {
      const [time, ...rest] = line.split("|");
      return { time: time.trim(), title: rest.join("|").trim() || time.trim() };
    }),
    facilities: lines(formData.get("facilities")),
    requirements: lines(formData.get("requirements")),
    certificate: {
      available: formData.get("certificateAvailable") === "on",
      template: "classic" as const,
      requiresAttendance: true,
    },
    // An uploaded file wins over a YouTube link when both are filled in.
    video: videoFileUrl || youtubeUrl
      ? {
          youtubeUrl,
          fileUrl: videoFileUrl || undefined,
          title: String(formData.get("videoTitle") ?? "").trim() || undefined,
          thumbnail: String(formData.get("videoThumbnail") ?? "").trim() || undefined,
        }
      : null,
    featured: formData.get("featured") === "on",
    status: String(formData.get("status") ?? "DRAFT") as EventStatus,
  };
}

export async function createEventAction(formData: FormData) {
  const session = await requireAdmin();
  const payload = buildPayload(formData);

  if (!payload.title || !payload.start_date) redirect("/admin/events/new?status=invalid");

  const id = `evt-${Date.now().toString(36)}`;
  let failed = false;
  try {
    await db.events.create({ data: { id, registered: 0, ...toEventData(payload) } });
    await logActivity(session.userId, "CREATE_EVENT", id, {
      title: payload.title,
      status: payload.status,
    });
  } catch {
    // Slug yang sudah dipakai event lain juga berakhir di sini (unik di database).
    failed = true;
  }
  if (failed) redirect("/admin/events/new?status=error");

  revalidatePublicEventPages(payload.slug);
  redirect(`/admin/events/${id}?status=created`);
}

export async function updateEventAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/events?status=error");

  const payload = buildPayload(formData);
  let before: { title: string; status: string; slug: string } | null = null;
  let failed = false;
  try {
    before = await db.events.findUnique({
      where: { id },
      select: { title: true, status: true, slug: true },
    });
    await db.events.update({ where: { id }, data: toEventData(payload) });
    await logActivity(
      session.userId,
      "UPDATE_EVENT",
      id,
      { title: payload.title, status: payload.status },
      before ?? undefined,
    );
  } catch {
    failed = true;
  }
  if (failed) redirect(`/admin/events/${id}?status=error`);

  revalidatePublicEventPages(payload.slug);
  if (before?.slug && before.slug !== payload.slug) revalidatePublicEventPages(before.slug);
  redirect(`/admin/events/${id}?status=saved`);
}

export async function setEventStatusAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as EventStatus;
  // Status dari formulir bukan nilai tepercaya: hanya yang dikenal yang boleh
  // sampai ke database, supaya event tidak bisa diberi status karangan sendiri.
  if (!id || !(EVENT_STATUSES as readonly string[]).includes(status)) redirect("/admin/events?status=error");

  let before: { status: string; slug: string } | null = null;
  let failed = false;
  try {
    before = await db.events.findUnique({ where: { id }, select: { status: true, slug: true } });
    await db.events.update({ where: { id }, data: { status, updated_at: new Date() } });
    await logActivity(session.userId, "SET_EVENT_STATUS", id, { status }, before ?? undefined);
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/events?status=error");

  revalidatePublicEventPages(before?.slug);
  redirect("/admin/events?status=status-changed");
}

export async function duplicateEventAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/events?status=error");

  const newId = `evt-${Date.now().toString(36)}`;
  let failed = false;
  try {
    const source = await db.events.findUnique({ where: { id } });
    if (!source) throw new Error("not found");

    // Salinan selalu lahir sebagai DRAFT dengan 0 terdaftar: menyalin status
    // PUBLISHED akan menayangkan duplikat ke publik seketika, dan menyalin
    // hitungan terdaftar membuat kuota salinan bohong.
    await db.events.create({
      data: {
        ...toEventData({
          ...source,
          // Kolom JSON dari database sudah berbentuk objek; toEventData
          // menerima bentuk baris, jadi tanggalnya dikembalikan ke teks dulu.
          start_date: source.start_date.toISOString().slice(0, 10),
          end_date: source.end_date.toISOString().slice(0, 10),
          video: source.video as never,
          status: "DRAFT",
        } as never),
        id: newId,
        slug: `${source.slug}-salinan-${Date.now().toString(36)}`,
        title: `${source.title} (Salinan)`,
        registered: 0,
        show_on_event_page: source.show_on_event_page,
        show_in_history: source.show_in_history,
      },
    });
    await logActivity(session.userId, "DUPLICATE_EVENT", newId, { from: id });
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/events?status=error");

  redirect(`/admin/events/${newId}?status=created`);
}
