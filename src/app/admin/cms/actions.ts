"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * CMS writes. Every action re-checks the admin session server-side — hiding a
 * button in the UI is never the gate — and revalidates the public pages so a
 * publish shows up without a redeploy.
 */

const HOME_FIELDS = {
  hero: [
    "eyebrow",
    "title",
    "highlight",
    "description",
    "primaryCtaLabel",
    "primaryCtaHref",
    "secondaryCtaLabel",
    "secondaryCtaHref",
    "statValue",
    "statLabel",
  ],
  events_teaser: ["eyebrow", "title", "description"],
} as const;

/** Slides arrive as JSON from the client-side editor, not as flat fields. */
function readHeroSlides(formData: FormData): { slides: unknown[] } | null {
  const raw = formData.get("hero_slides.json");
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const slides = parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const slide = item as Record<string, unknown>;
        return {
          id: String(slide.id ?? ""),
          image: String(slide.image ?? "").trim(),
          alt: String(slide.alt ?? "").trim(),
          title: String(slide.title ?? "").trim(),
          date: String(slide.date ?? "").trim(),
          location: String(slide.location ?? "").trim(),
          eventSlug: String(slide.eventSlug ?? "").trim(),
        };
      })
      .filter((slide) => slide.image !== "");
    return { slides };
  } catch {
    return null;
  }
}

type SectionKey = keyof typeof HOME_FIELDS;

function readSection(formData: FormData, section: SectionKey): Record<string, string> {
  const content: Record<string, string> = {};
  for (const field of HOME_FIELDS[section]) {
    content[field] = String(formData.get(`${section}.${field}`) ?? "").trim();
  }
  return content;
}

async function logActivity(
  action: string,
  entity: string,
  entityId: string,
  newValue: unknown,
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("activity_logs").insert({
    user_id: user?.id ?? null,
    action,
    entity,
    entity_id: entityId,
    new_value: newValue as never,
  });
}

/** Saves the working copy. The public site keeps showing the published one. */
export async function saveHomeDraftAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  for (const section of Object.keys(HOME_FIELDS) as SectionKey[]) {
    const content = readSection(formData, section);
    const { error } = await supabase
      .from("cms_sections")
      .update({ draft: content, updated_at: new Date().toISOString() })
      .eq("page_key", "home")
      .eq("section_key", section);

    if (error) redirect("/admin/cms/home?status=error");
    await logActivity("SAVE_DRAFT", "cms_sections", `home.${section}`, content);
  }

  const slides = readHeroSlides(formData);
  if (slides) {
    const { error } = await supabase
      .from("cms_sections")
      .update({ draft: slides, updated_at: new Date().toISOString() })
      .eq("page_key", "home")
      .eq("section_key", "hero_slides");
    if (error) redirect("/admin/cms/home?status=error");
    await logActivity("SAVE_DRAFT", "cms_sections", "home.hero_slides", slides);
  }

  redirect("/admin/cms/home?status=draft-saved");
}

/** Copies draft → published, then revalidates the public home page. */
export async function publishHomeAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  for (const section of Object.keys(HOME_FIELDS) as SectionKey[]) {
    const content = readSection(formData, section);
    const { error } = await supabase
      .from("cms_sections")
      .update({
        draft: content,
        published: content,
        updated_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      })
      .eq("page_key", "home")
      .eq("section_key", section);

    if (error) redirect("/admin/cms/home?status=error");
    await logActivity("PUBLISH", "cms_sections", `home.${section}`, content);
  }

  const slides = readHeroSlides(formData);
  if (slides) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("cms_sections")
      .update({ draft: slides, published: slides, updated_at: now, published_at: now })
      .eq("page_key", "home")
      .eq("section_key", "hero_slides");
    if (error) redirect("/admin/cms/home?status=error");
    await logActivity("PUBLISH", "cms_sections", "home.hero_slides", slides);
  }

  revalidatePath("/");
  redirect("/admin/cms/home?status=published");
}

export async function saveNavigationAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const ids = formData.getAll("id").map(String);
  for (const id of ids) {
    const label = String(formData.get(`label.${id}`) ?? "").trim();
    const href = String(formData.get(`href.${id}`) ?? "").trim();
    const sortOrder = Number(formData.get(`order.${id}`) ?? 0);
    const isVisible = formData.get(`visible.${id}`) === "on";
    const openInNewTab = formData.get(`newtab.${id}`) === "on";

    if (!label || !href) continue;

    const { error } = await supabase
      .from("navigation_items")
      .update({
        label,
        href,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        is_visible: isVisible,
        open_in_new_tab: openInNewTab,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) redirect("/admin/cms/navigation?status=error");
    await logActivity("UPDATE", "navigation_items", id, { label, href, isVisible });
  }

  // The navbar lives in the public layout, so every page needs refreshing.
  revalidatePath("/", "layout");
  redirect("/admin/cms/navigation?status=saved");
}
