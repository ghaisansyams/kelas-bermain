"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { events as catalogueEvents } from "@/data/events";
import { Prisma } from "@prisma/client";
import { ABOUT_IMAGE_HEIGHT, ABOUT_IMAGE_WIDTH } from "@/lib/utils/about-event";
import { requireAdmin, requireRole } from "@/lib/admin/auth";
import { confirmationMatches } from "@/lib/admin/delete-records";
import { moveEventToBin, purgeExpired } from "@/lib/admin/recycle-bin";
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
    about_event: nullable(row.about_event),
    category: row.category,
    cover: json(row.cover),
    // Impor katalog tidak selalu membawa poster; tanpa pengecekan ini
    // mengimpor ulang akan mengosongkan poster yang sudah diisi di admin.
    ...("poster" in row ? { poster: nullable(row.poster) } : {}),
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
    ...("speaker_ids" in row ? { speaker_ids: json(row.speaker_ids) } : {}),
    facilities: json(row.facilities),
    requirements: json(row.requirements),
    certificate: json(row.certificate),
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

/** Kolom daftar di formulir: satu input per item dengan `name` yang sama. */
function listValues(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

/** Pasangan input yang dikirim berurutan (jam + kegiatan, url + alt). */
function pairedValues(formData: FormData, first: string, second: string): [string, string][] {
  const a = formData.getAll(first).map((value) => String(value).trim());
  const b = formData.getAll(second).map((value) => String(value).trim());
  return a.map((value, index) => [value, b[index] ?? ""]);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildPayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  // Slug yang diketik admin ikut dibersihkan: "testing 1" menjadi "testing-1".
  // Slug berspasi tidak bisa dibuka di halaman publik (alamatnya dikirim browser
  // sebagai "testing%201", yang tidak dikenali sebagai "testing 1").
  const slug =
    slugify(String(formData.get("slug") ?? "")) || slugify(title) || `event-${Date.now()}`;
  const priceRaw = Number(formData.get("price") ?? 0);
  const price = Number.isFinite(priceRaw) ? priceRaw : 0;
  const extraRaw = Math.floor(Number(formData.get("extraCompanionPrice") ?? 0));
  // Kelas gratis tidak menagih siapa pun, jadi biaya pendamping diabaikan di sana.
  const extraCompanionPrice = price > 0 && Number.isFinite(extraRaw) && extraRaw > 0 ? extraRaw : undefined;
  const registrationType = price > 0 ? "PAID" : "FREE";
  const aboutImages = pairedValues(formData, "aboutImageSrc", "aboutImageAlt")
    .filter(([src]) => src.startsWith("/") || /^https?:\/\//.test(src))
    .slice(0, 4)
    .map(([src, alt]) => ({ src, alt, width: ABOUT_IMAGE_WIDTH, height: ABOUT_IMAGE_HEIGHT }));

  const posterSrc = String(formData.get("posterSrc") ?? "").trim();
  const posterWidth = Number(formData.get("posterWidth") ?? 0);
  const posterHeight = Number(formData.get("posterHeight") ?? 0);
  // Kosong berarti event ini tidak punya poster: bagian "Poster" tidak tampil.
  const poster =
    posterSrc.startsWith("/") || /^https?:\/\//.test(posterSrc)
      ? {
          src: posterSrc,
          alt: String(formData.get("posterAlt") ?? "").trim(),
          ...(posterWidth > 0 && posterHeight > 0
            ? { width: Math.round(posterWidth), height: Math.round(posterHeight) }
            : {}),
        }
      : null;

  return {
    slug,
    title,
    poster,
    tagline: String(formData.get("tagline") ?? "").trim(),
    summary: String(formData.get("summary") ?? "").trim(),
    description: lines(formData.get("description")),
    // Kosong berarti halaman detail memakai foto bawaan kategori.
    about_event: aboutImages.length > 0 ? { images: aboutImages } : null,
    category: String(formData.get("category") ?? "").trim(),
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
      extraCompanionPrice,
      priceDisplay: String(formData.get("priceDisplay") ?? "SHOW_PRICE"),
      currency: "IDR" as const,
      deadline: String(formData.get("deadline") ?? "") || String(formData.get("startDate") ?? ""),
      notes: listValues(formData, "registrationNotes"),
    },
    agenda: pairedValues(formData, "agendaTime", "agendaTitle")
      .filter(([time, title]) => time || title)
      .map(([time, title]) => ({ time, title: title || time })),
    facilities: listValues(formData, "facilities"),
    requirements: listValues(formData, "requirements"),
    certificate: {
      available: formData.get("certificateAvailable") === "on",
      template: "classic" as const,
      requiresAttendance: true,
    },
    featured: formData.get("featured") === "on",
    status: parseStatus(formData.get("status")),
  };
}

/** Status dari formulir bukan nilai tepercaya; yang tidak dikenal jadi DRAFT. */
function parseStatus(value: FormDataEntryValue | null): EventStatus {
  const status = String(value ?? "");
  return (EVENT_STATUSES as readonly string[]).includes(status) ? (status as EventStatus) : "DRAFT";
}

/** Tampil di website publik: Tayang dan Berlangsung. */
function isLive(status: string): boolean {
  return status === "PUBLISHED" || status === "ONGOING";
}

/**
 * Kategori harus salah satu yang diatur di Event → Kategori. Event lama yang
 * kategorinya sudah tidak ada di daftar boleh tetap memakainya sampai diganti.
 */
async function categoryAllowed(category: string, current?: string): Promise<boolean> {
  if (!category) return false;
  if (category === current) return true;
  try {
    return (await db.event_categories.count({ where: { name: category } })) > 0;
  } catch {
    return false;
  }
}

export async function createEventAction(formData: FormData) {
  const session = await requireAdmin();
  const payload = buildPayload(formData);

  if (!payload.title || !payload.start_date) redirect("/admin/events/new?status=invalid");
  if (!(await categoryAllowed(payload.category))) redirect("/admin/events/new?status=bad-category");

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
  redirect(`/admin/events/${id}?status=${isLive(payload.status) ? "created-live" : "created-draft"}`);
}

export async function updateEventAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/events?status=error");

  const payload = buildPayload(formData);
  const currentCategory = (await db.events.findUnique({ where: { id }, select: { category: true } }))?.category;
  if (!(await categoryAllowed(payload.category, currentCategory))) redirect(`/admin/events/${id}?status=bad-category`);
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
  redirect(`/admin/events/${id}?status=${isLive(payload.status) ? "saved" : "saved-draft"}`);
}

/**
 * Memindahkan event beserta seluruh pendaftarannya ke Terhapus.
 *
 * Hanya SUPER_ADMIN, dan judul yang diketik admin dicocokkan lagi di server.
 * Pendaftaran event ini (beserta pembayaran, bukti transfer, kehadiran,
 * sertifikat, dan catatan keuangannya) ikut dipindahkan; data pendamping dan
 * anak tetap ada karena mereka bisa mendaftar di event lain. Salinannya bisa
 * dipulihkan dari menu Terhapus selama 30 hari.
 */
export async function deleteEventAction(formData: FormData) {
  const session = await requireRole("SUPER_ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/events?status=error");

  let outcome = "deleted";
  let slug = "";
  try {
    const event = await db.events.findUnique({
      where: { id },
      select: { title: true, slug: true, status: true },
    });
    if (!event) {
      outcome = "error";
    } else if (!confirmationMatches(formData.get("confirm"), event.title)) {
      outcome = "wrong-confirm";
    } else {
      slug = event.slug;
      const stats = await db.$transaction((tx) => moveEventToBin(tx, id, session.fullName), {
        timeout: 60_000,
      });
      await logActivity(
        session.userId,
        "DELETE_EVENT",
        id,
        null,
        { title: event.title, slug: event.slug, status: event.status, movedToBin: true, ...(stats ?? {}) },
      );
      await purgeExpired();
    }
  } catch {
    outcome = "error";
  }

  if (outcome === "deleted") {
    revalidatePublicEventPages(slug);
    for (const path of ["/admin", "/admin/registrations", "/admin/payments", "/admin/finance", "/admin/customers", "/admin/children", "/admin/trash"]) {
      revalidatePath(path);
    }
    revalidatePath("/register", "layout");
    redirect("/admin/events?status=deleted");
  }
  redirect(`/admin/events?status=${outcome}`);
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
  // Tombol di halaman detail event kembali ke halaman itu, bukan ke daftar.
  if (formData.get("next") === "detail") {
    redirect(`/admin/events/${id}?status=${isLive(status) ? "now-live" : "now-hidden"}`);
  }
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

  redirect(`/admin/events/${newId}?status=created-draft`);
}
