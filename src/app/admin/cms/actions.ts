"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { requireAdmin } from "@/lib/admin/auth";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tautan menu: jalur situs atau http(s). Bukan javascript: atau data:. */
const SAFE_HREF = /^(\/|https?:\/\/|mailto:|tel:)/i;

/**
 * Menyimpan salinan kerja. Situs publik tetap menampilkan yang sudah terbit.
 *
 * Semua bagian ditulis dalam SATU transaksi. Dulu tiap bagian disimpan satu per
 * satu, jadi galat di bagian kedua meninggalkan bagian pertama sudah tersimpan
 * dan sisanya tidak — halaman depan setengah diperbarui.
 */
export async function saveHomeDraftAction(formData: FormData) {
  const session = await requireAdmin();
  const slides = readHeroSlides(formData);
  const sections = (Object.keys(HOME_FIELDS) as SectionKey[]).map((section) => ({
    section,
    content: readSection(formData, section),
  }));

  let failed = false;
  try {
    await db.$transaction([
      ...sections.map(({ section, content }) =>
        db.cms_sections.updateMany({
          where: { page_key: "home", section_key: section },
          data: {
            draft: content as Prisma.InputJsonValue,
            updated_at: new Date(),
            updated_by: session.userId,
          },
        }),
      ),
      ...(slides
        ? [
            db.cms_sections.updateMany({
              where: { page_key: "home", section_key: "hero_slides" },
              data: {
                draft: slides as Prisma.InputJsonValue,
                updated_at: new Date(),
                updated_by: session.userId,
              },
            }),
          ]
        : []),
    ]);
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/cms/home?status=error");

  for (const { section, content } of sections) {
    await logActivity("SAVE_DRAFT", "cms_sections", `home.${section}`, null, content);
  }
  if (slides) await logActivity("SAVE_DRAFT", "cms_sections", "home.hero_slides", null, slides);

  redirect("/admin/cms/home?status=draft-saved");
}

/** Copies draft → published, then revalidates the public home page. */
export async function publishHomeAction(formData: FormData) {
  const session = await requireAdmin();
  const slides = readHeroSlides(formData);
  const sections = (Object.keys(HOME_FIELDS) as SectionKey[]).map((section) => ({
    section,
    content: readSection(formData, section),
  }));

  const now = new Date();
  const publish = (content: unknown) => ({
    draft: content as Prisma.InputJsonValue,
    published: content as Prisma.InputJsonValue,
    updated_at: now,
    published_at: now,
    updated_by: session.userId,
  });

  // Satu transaksi, sama alasannya dengan menyimpan draf: halaman depan yang
  // terbit setengah — judul baru, slide lama — lebih buruk daripada yang gagal.
  let failed = false;
  try {
    await db.$transaction([
      ...sections.map(({ section, content }) =>
        db.cms_sections.updateMany({
          where: { page_key: "home", section_key: section },
          data: publish(content),
        }),
      ),
      ...(slides
        ? [
            db.cms_sections.updateMany({
              where: { page_key: "home", section_key: "hero_slides" },
              data: publish(slides),
            }),
          ]
        : []),
    ]);
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/cms/home?status=error");

  for (const { section, content } of sections) {
    await logActivity("PUBLISH", "cms_sections", `home.${section}`, null, content);
  }
  if (slides) await logActivity("PUBLISH", "cms_sections", "home.hero_slides", null, slides);

  revalidatePath("/");
  redirect("/admin/cms/home?status=published");
}

export async function saveNavigationAction(formData: FormData) {
  await requireAdmin();

  const ids = formData.getAll("id").map(String);
  const updates: { id: string; label: string; href: string; data: Prisma.navigation_itemsUpdateInput }[] = [];

  for (const id of ids) {
    if (!UUID.test(id)) continue;

    const label = String(formData.get(`label.${id}`) ?? "").trim();
    const href = String(formData.get(`href.${id}`) ?? "").trim();
    const sortOrder = Number(formData.get(`order.${id}`) ?? 0);
    if (!label || !href) continue;

    // Menu tampil di setiap halaman publik. Tautan javascript: atau data:
    // yang diketik di sini akan jalan di browser pengunjung.
    if (!SAFE_HREF.test(href)) redirect("/admin/cms/navigation?status=error");

    updates.push({
      id,
      label,
      href,
      data: {
        label,
        href,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        is_visible: formData.get(`visible.${id}`) === "on",
        open_in_new_tab: formData.get(`newtab.${id}`) === "on",
        updated_at: new Date(),
      },
    });
  }

  let failed = false;
  try {
    // Seluruh menu diperbarui bersama: menu yang tersimpan separuh bisa
    // kehilangan tautan di tengah daftar.
    await db.$transaction(
      updates.map((item) => db.navigation_items.update({ where: { id: item.id }, data: item.data })),
    );
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/cms/navigation?status=error");

  for (const item of updates) {
    await logActivity("UPDATE", "navigation_items", item.id, null, { label: item.label, href: item.href });
  }

  // The navbar lives in the public layout, so every page needs refreshing.
  revalidatePath("/", "layout");
  redirect("/admin/cms/navigation?status=saved");
}
