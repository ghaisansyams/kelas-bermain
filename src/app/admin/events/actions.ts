"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { events as catalogueEvents } from "@/data/events";
import { requireAdmin } from "@/lib/admin/auth";
import { eventRecordToRow, type EventStatus } from "@/lib/services/event-mapper";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  action: string,
  entityId: string,
  newValue: unknown,
  oldValue?: unknown,
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("activity_logs").insert({
    user_id: user?.id ?? null,
    action,
    entity: "events",
    entity_id: entityId,
    old_value: (oldValue ?? null) as never,
    new_value: newValue as never,
  });
}

/** One-time move of the hard-coded catalogue into the database. */
export async function importCatalogueAction() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const rows = catalogueEvents.map((event) =>
    eventRecordToRow(event, event.published ? "PUBLISHED" : "DRAFT"),
  );
  const { error } = await supabase.from("events").upsert(rows, { onConflict: "id" });
  if (error) redirect("/admin/events?status=error");

  await logActivity("IMPORT_CATALOGUE", "events", { count: rows.length });
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
    video: String(formData.get("youtubeUrl") ?? "").trim()
      ? {
          youtubeUrl: String(formData.get("youtubeUrl") ?? "").trim(),
          title: String(formData.get("videoTitle") ?? "").trim() || undefined,
        }
      : null,
    featured: formData.get("featured") === "on",
    status: String(formData.get("status") ?? "DRAFT") as EventStatus,
    updated_at: new Date().toISOString(),
  };
}

export async function createEventAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const payload = buildPayload(formData);

  if (!payload.title || !payload.start_date) redirect("/admin/events/new?status=invalid");

  const id = `evt-${Date.now().toString(36)}`;
  const { error } = await supabase.from("events").insert({ ...payload, id, registered: 0 });
  if (error) redirect("/admin/events/new?status=error");

  await logActivity("CREATE_EVENT", id, { title: payload.title, status: payload.status });
  revalidatePublicEventPages(payload.slug);
  redirect(`/admin/events/${id}?status=created`);
}

export async function updateEventAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/events?status=error");

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase
    .from("events")
    .select("title, status, slug")
    .eq("id", id)
    .maybeSingle();

  const payload = buildPayload(formData);
  const { error } = await supabase.from("events").update(payload).eq("id", id);
  if (error) redirect(`/admin/events/${id}?status=error`);

  await logActivity(
    "UPDATE_EVENT",
    id,
    { title: payload.title, status: payload.status },
    before ?? undefined,
  );
  revalidatePublicEventPages(payload.slug);
  if (before?.slug && before.slug !== payload.slug) revalidatePublicEventPages(before.slug);
  redirect(`/admin/events/${id}?status=saved`);
}

export async function setEventStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as EventStatus;
  if (!id || !status) redirect("/admin/events?status=error");

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase
    .from("events")
    .select("status, slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("events")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect("/admin/events?status=error");

  await logActivity("SET_EVENT_STATUS", id, { status }, before ?? undefined);
  revalidatePublicEventPages(before?.slug);
  redirect("/admin/events?status=status-changed");
}

export async function duplicateEventAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/events?status=error");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!data) redirect("/admin/events?status=error");

  const source = data as Record<string, unknown>;
  const newId = `evt-${Date.now().toString(36)}`;
  const copy = {
    ...source,
    id: newId,
    slug: `${String(source.slug)}-salinan-${Date.now().toString(36)}`,
    title: `${String(source.title)} (Salinan)`,
    status: "DRAFT",
    registered: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("events").insert(copy);
  if (error) redirect("/admin/events?status=error");

  await logActivity("DUPLICATE_EVENT", newId, { from: id });
  redirect(`/admin/events/${newId}?status=created`);
}
