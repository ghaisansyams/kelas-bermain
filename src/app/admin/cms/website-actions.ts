"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { requireAdmin } from "@/lib/admin/auth";
import { findCollection, findPage, findSection, type FieldDef } from "@/lib/cms/schema";
import { findTemplate, TEMPLATE_PAGE_KEY } from "@/lib/cms/section-templates";
import { findThemePreset } from "@/lib/cms/theme-presets";
import { Prisma } from "@prisma/client";
import { asAdmin } from "@/lib/admin/actor";
import { db } from "@/lib/db";

/**
 * Every CMS write goes through here. Authorisation is re-checked server-side
 * on each call — the buttons the admin can see are never the gate — and the
 * public pages are revalidated on publish so a change is live without a
 * deploy.
 */

function back(tab: string, status: string): never {
  redirect(`/admin/cms?tab=${tab}&status=${status}`);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Pembaruan yang tidak menemukan baris bukan keberhasilan. Supabase membalas
 * UPDATE tanpa baris cocok dengan "tidak ada galat", jadi admin melihat
 * "tersimpan" padahal tidak ada yang berubah — kunci bagian yang salah, atau
 * bagian yang sudah dihapus, tampak sukses. Nol baris dihitung gagal.
 */
function changed(result: { count: number }) {
  if (result.count === 0) throw new Error("no rows matched");
}

/** Reads a form against a field list, so only known fields are ever stored. */
function collect(formData: FormData, fields: FieldDef[]): Record<string, unknown> {
  const content: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = formData.getAll(field.key);
    const value = raw.length > 0 ? String(raw[raw.length - 1]) : "";
    if (field.type === "boolean") {
      content[field.key] = value === "true";
    } else if (field.type === "number") {
      const parsed = Number(value);
      content[field.key] = Number.isFinite(parsed) ? parsed : 0;
    } else {
      content[field.key] = value;
    }
  }
  return content;
}

/** Publish-time checks, in plain language. Section 45 of the brief. */
function validate(content: Record<string, unknown>, fields: FieldDef[]): string | null {
  for (const field of fields) {
    const value = content[field.key];
    if (field.type === "url" && typeof value === "string" && value.trim()) {
      const ok = value.startsWith("/") || /^https?:\/\//.test(value);
      if (!ok) return `"${field.label}" harus diawali / atau http.`;
    }
  }
  return null;
}

function revalidatePublic() {
  // layout covers the header, footer and theme, which every page shares.
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/event");
  revalidatePath("/galeri");
  revalidatePath("/update");
  revalidatePath("/kegiatan");
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export async function saveSectionDraftAction(formData: FormData) {
  const session = await requireAdmin();
  const pageKey = String(formData.get("pageKey") ?? "");
  const sectionKey = String(formData.get("sectionKey") ?? "");
  const tab = String(formData.get("tab") ?? pageKey);

  const section = findSection(pageKey, sectionKey);
  if (!section) back(tab, "error");

  const content = collect(formData, section.fields);
  const problem = validate(content, section.fields);
  if (problem) redirect(`/admin/cms?tab=${tab}&status=invalid&message=${encodeURIComponent(problem)}`);

  let failed = false;
  try {
    changed(
      await db.cms_sections.updateMany({
        where: { page_key: pageKey, section_key: sectionKey },
        data: {
          draft: content as Prisma.InputJsonValue,
          updated_at: new Date(),
          updated_by: session.userId,
        },
      }),
    );
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  await logActivity("CMS_UPDATE", "cms_sections", `${pageKey}.${sectionKey}`, null, content);
  revalidatePath("/admin/cms");
  back(tab, "draft-saved");
}

export async function setSectionVisibilityAction(formData: FormData) {
  await requireAdmin();
  const pageKey = String(formData.get("pageKey") ?? "");
  const sectionKey = String(formData.get("sectionKey") ?? "");
  const tab = String(formData.get("tab") ?? pageKey);
  const visible = String(formData.get("visible")) === "true";

  let failed = false;
  try {
    changed(
      await db.cms_sections.updateMany({
        where: { page_key: pageKey, section_key: sectionKey },
        data: { is_visible: visible },
      }),
    );
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  await logActivity(
    visible ? "SECTION_SHOW" : "SECTION_HIDE",
    "cms_sections",
    `${pageKey}.${sectionKey}`,
    null,
    { isVisible: visible },
  );
  revalidatePublic();
  revalidatePath("/admin/cms");
  back(tab, visible ? "shown" : "hidden");
}

/** Swaps this section's order with its neighbour, so order is always unique. */
export async function moveSectionAction(formData: FormData) {
  await requireAdmin();
  const pageKey = String(formData.get("pageKey") ?? "");
  const sectionKey = String(formData.get("sectionKey") ?? "");
  const tab = String(formData.get("tab") ?? pageKey);
  const direction = String(formData.get("direction") ?? "up");

  const rows = await db.cms_sections.findMany({
    where: { page_key: pageKey },
    orderBy: { sort_order: "asc" },
    select: { section_key: true, sort_order: true },
  });

  const index = rows.findIndex((row) => row.section_key === sectionKey);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= rows.length) back(tab, "error");

  const current = rows[index];
  const other = rows[swapWith];

  // Satu transaksi: dua UPDATE terpisah yang berhenti di tengah menyisakan dua
  // bagian dengan urutan yang sama, dan urutannya tidak lagi unik.
  let failed = false;
  try {
    await db.$transaction([
      db.cms_sections.updateMany({
        where: { page_key: pageKey, section_key: current.section_key },
        data: { sort_order: other.sort_order },
      }),
      db.cms_sections.updateMany({
        where: { page_key: pageKey, section_key: other.section_key },
        data: { sort_order: current.sort_order },
      }),
    ]);
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  await logActivity("CMS_UPDATE", "cms_sections", `${pageKey}.${sectionKey}`, null, {
    direction,
  });
  revalidatePublic();
  revalidatePath("/admin/cms");
  back(tab, "reordered");
}

export async function publishPageAction(formData: FormData) {
  const session = await requireAdmin();
  const pageKey = String(formData.get("pageKey") ?? "");
  const tab = String(formData.get("tab") ?? pageKey);
  if (!findPage(pageKey)) back(tab, "error");

  // Fungsi database menyalin draf ke tayang dan menyimpan snapshot versi dalam
  // satu transaksi, dan memeriksa is_admin() sendiri.
  let failed = false;
  try {
    await asAdmin(
      session,
      (tx) => tx.$executeRaw`select admin_publish_page(${pageKey}, ${""})`,
    );
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  revalidatePublic();
  revalidatePath("/admin/cms");
  back(tab, "published");
}

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export async function saveCollectionItemAction(formData: FormData) {
  const session = await requireAdmin();
  const collectionKey = String(formData.get("collectionKey") ?? "");
  const tab = String(formData.get("tab") ?? "home");
  const itemKey = String(formData.get("itemKey") ?? "").trim();

  const collection = findCollection(collectionKey);
  if (!collection) back(tab, "error");

  const content = collect(formData, collection.fields);
  const problem = validate(content, collection.fields);
  if (problem) redirect(`/admin/cms?tab=${tab}&status=invalid&message=${encodeURIComponent(problem)}`);

  const draft = content as Prisma.InputJsonValue;

  try {
    if (itemKey) {
      await db.cms_collections.update({
        where: { collection_key_item_key: { collection_key: collectionKey, item_key: itemKey } },
        data: { draft, updated_at: new Date(), updated_by: session.userId },
      });
      await logActivity("CMS_UPDATE", "cms_collections", `${collectionKey}.${itemKey}`, null, content);
    } else {
      // New items go to the end of the list.
      const last = await db.cms_collections.findFirst({
        where: { collection_key: collectionKey },
        orderBy: { sort_order: "desc" },
        select: { sort_order: true },
      });
      const newKey = `item-${Date.now().toString(36)}`;

      await db.cms_collections.create({
        data: {
          collection_key: collectionKey,
          item_key: newKey,
          draft,
          sort_order: (last?.sort_order ?? 0) + 10,
          updated_by: session.userId,
        },
      });
      await logActivity("CMS_CREATE", "cms_collections", `${collectionKey}.${newKey}`, null, content);
    }
  } catch {
    back(tab, "error");
  }

  revalidatePath("/admin/cms");
  back(tab, "draft-saved");
}

export async function deleteCollectionItemAction(formData: FormData) {
  await requireAdmin();
  const collectionKey = String(formData.get("collectionKey") ?? "");
  const itemKey = String(formData.get("itemKey") ?? "");
  const tab = String(formData.get("tab") ?? "home");

  try {
    await db.cms_collections.deleteMany({
      where: { collection_key: collectionKey, item_key: itemKey },
    });
  } catch {
    back(tab, "error");
  }

  await logActivity("CMS_DELETE", "cms_collections", `${collectionKey}.${itemKey}`, { itemKey }, null);
  revalidatePublic();
  revalidatePath("/admin/cms");
  back(tab, "deleted");
}

export async function moveCollectionItemAction(formData: FormData) {
  await requireAdmin();
  const collectionKey = String(formData.get("collectionKey") ?? "");
  const itemKey = String(formData.get("itemKey") ?? "");
  const tab = String(formData.get("tab") ?? "home");
  const direction = String(formData.get("direction") ?? "up");

  const rows = await db.cms_collections.findMany({
    where: { collection_key: collectionKey },
    orderBy: { sort_order: "asc" },
    select: { item_key: true, sort_order: true },
  });

  const index = rows.findIndex((row) => row.item_key === itemKey);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= rows.length) back(tab, "error");

  const current = rows[index];
  const other = rows[swapWith];

  await db.$transaction([
    db.cms_collections.update({
      where: { collection_key_item_key: { collection_key: collectionKey, item_key: current.item_key } },
      data: { sort_order: other.sort_order },
    }),
    db.cms_collections.update({
      where: { collection_key_item_key: { collection_key: collectionKey, item_key: other.item_key } },
      data: { sort_order: current.sort_order },
    }),
  ]);

  revalidatePublic();
  revalidatePath("/admin/cms");
  back(tab, "reordered");
}

export async function setCollectionItemVisibilityAction(formData: FormData) {
  await requireAdmin();
  const collectionKey = String(formData.get("collectionKey") ?? "");
  const itemKey = String(formData.get("itemKey") ?? "");
  const tab = String(formData.get("tab") ?? "home");
  const visible = String(formData.get("visible")) === "true";

  await db.cms_collections.updateMany({
    where: { collection_key: collectionKey, item_key: itemKey },
    data: { is_visible: visible },
  });

  revalidatePublic();
  revalidatePath("/admin/cms");
  back(tab, visible ? "shown" : "hidden");
}

/**
 * Menerbitkan semua draf di sebuah koleksi. Snapshot isi yang sedang tayang
 * disimpan dulu ke cms_versions supaya bisa dipulihkan, lalu draf disalin ke
 * `published` — hanya untuk baris yang drafnya memang berbeda.
 */
export async function publishCollectionAction(formData: FormData) {
  const session = await requireAdmin();
  const collectionKey = String(formData.get("collectionKey") ?? "");
  const tab = String(formData.get("tab") ?? "home");

  try {
    const rows = await db.cms_collections.findMany({ where: { collection_key: collectionKey } });
    const changed = rows.filter(
      (row) => JSON.stringify(row.draft ?? null) !== JSON.stringify(row.published ?? null),
    );

    await db.$transaction([
      db.cms_versions.create({
        data: {
          scope: "collection",
          scope_key: collectionKey,
          snapshot: rows.map((row) => ({
            itemKey: row.item_key,
            published: row.published,
            sortOrder: row.sort_order,
            isVisible: row.is_visible,
          })) as Prisma.InputJsonValue,
          created_by: session.userId,
        },
      }),
      ...changed.map((row) =>
        db.cms_collections.update({
          where: { id: row.id },
          data: {
            published: row.draft as Prisma.InputJsonValue,
            published_at: new Date(),
            updated_by: session.userId,
          },
        }),
      ),
    ]);

    await logActivity("CMS_PUBLISH", "cms_collections", collectionKey, null, { items: changed.length });
  } catch {
    back(tab, "error");
  }

  revalidatePublic();
  revalidatePath("/admin/cms");
  back(tab, "published");
}

/** Restores the content a page or collection had before an earlier publish. */
export async function restoreVersionAction(formData: FormData) {
  const session = await requireAdmin();
  const versionId = String(formData.get("versionId") ?? "");
  const tab = String(formData.get("tab") ?? "home");
  if (!UUID.test(versionId)) back(tab, "error");

  let failed = false;
  try {
    await asAdmin(
      session,
      (tx) => tx.$executeRaw`select admin_restore_version(${versionId}::uuid)`,
    );
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  revalidatePublic();
  revalidatePath("/admin/cms");
  back(tab, "restored");
}

/* ------------------------------------------------------------------ */
/* Hero slides — stored as one array inside the hero_slides section     */
/* ------------------------------------------------------------------ */

/**
 * The carousel is a list, but it lives inside a single section rather than a
 * collection, because that is how it was already stored and how the public
 * reader (`readSlides` in services/cms.ts) expects it. Keeping that shape
 * means slides the team already published are not lost.
 */
export async function saveHeroSlidesAction(formData: FormData) {
  const session = await requireAdmin();
  const tab = String(formData.get("tab") ?? "home");
  const raw = String(formData.get("hero_slides.json") ?? "[]");

  let slides: unknown;
  try {
    slides = JSON.parse(raw);
  } catch {
    back(tab, "error");
  }
  if (!Array.isArray(slides)) back(tab, "error");

  // Drop blank rows so an empty slot never renders as a missing image.
  const cleaned = (slides as Record<string, unknown>[]).filter(
    (slide) => typeof slide?.image === "string" && slide.image.trim(),
  );

  let failed = false;
  try {
    changed(
      await db.cms_sections.updateMany({
        where: { page_key: "home", section_key: "hero_slides" },
        data: {
          draft: { slides: cleaned } as Prisma.InputJsonValue,
          updated_at: new Date(),
          updated_by: session.userId,
        },
      }),
    );
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  await logActivity("CMS_UPDATE", "cms_sections", "home.hero_slides", null, {
    slides: cleaned.length,
  });
  revalidatePath("/admin/cms");
  back(tab, "draft-saved");
}

/* ------------------------------------------------------------------ */
/* Event placement — the events table stays the source of truth         */
/* ------------------------------------------------------------------ */

/**
 * Sets only where an event appears. Nothing about the event itself is edited
 * or copied here, so the CMS and the ERP can never disagree about a date or
 * a price.
 */
export async function setEventPlacementAction(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) back("events", "error");

  const flag = (key: string) => formData.getAll(key).pop() === "true";
  const placement = {
    featured: flag("featured"),
    show_on_event_page: flag("showOnEventPage"),
    show_in_history: flag("showInHistory"),
  };

  let failed = false;
  try {
    await db.events.update({ where: { id: eventId }, data: placement });
  } catch {
    failed = true;
  }
  if (failed) back("events", "error");

  await logActivity(
    placement.featured ? "EVENT_FEATURED" : "EVENT_UNFEATURED",
    "events",
    eventId,
    null,
    placement,
  );

  revalidatePublic();
  revalidatePath("/admin/cms");
  back("events", "published");
}

/* ------------------------------------------------------------------ */
/* Certificate Designer                                                */
/* ------------------------------------------------------------------ */

/**
 * Saves a template. Templates are additive on purpose: certificates already
 * issued are untouched, so publishing a new design never rewrites a document
 * somebody has already been given.
 */
export async function saveCertificateTemplateAction(formData: FormData) {
  await requireAdmin();
  const templateId = String(formData.get("templateId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) back("certificates", "invalid");
  if (templateId && !UUID.test(templateId)) back("certificates", "error");

  let config: unknown;
  try {
    config = JSON.parse(String(formData.get("config") ?? '{"elements":[]}'));
  } catch {
    back("certificates", "error");
  }

  const statusRaw = String(formData.get("status") ?? "DRAFT");
  const payload = {
    name,
    description: String(formData.get("description") ?? ""),
    background_url: String(formData.get("backgroundUrl") ?? ""),
    logo_url: String(formData.get("logoUrl") ?? ""),
    orientation: String(formData.get("orientation") ?? "LANDSCAPE") === "PORTRAIT"
      ? "PORTRAIT"
      : "LANDSCAPE",
    config: config as Prisma.InputJsonValue,
    status: ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(statusRaw) ? statusRaw : "DRAFT",
    updated_at: new Date(),
  };

  let failed = false;
  try {
    if (templateId) {
      await db.certificate_templates.update({ where: { id: templateId }, data: payload });
    } else {
      await db.certificate_templates.create({ data: payload });
    }
  } catch {
    failed = true;
  }
  if (failed) back("certificates", "error");

  await logActivity(
    templateId ? "CERTIFICATE_TEMPLATE_UPDATE" : "CERTIFICATE_TEMPLATE_CREATE",
    "certificate_templates",
    templateId || name,
    null,
    { name, status: payload.status },
  );

  revalidatePath("/admin/cms");
  back("certificates", "published");
}

export async function setDefaultCertificateTemplateAction(formData: FormData) {
  const session = await requireAdmin();
  const templateId = String(formData.get("templateId") ?? "");
  if (!UUID.test(templateId)) back("certificates", "error");

  // Fungsi database yang melepas bawaan lama dan memasang yang baru dalam satu
  // transaksi: tanpa itu ada saat singkat tanpa template bawaan sama sekali,
  // atau dua sekaligus.
  let failed = false;
  try {
    await asAdmin(
      session,
      (tx) =>
        tx.$executeRaw`select admin_set_default_certificate_template(${templateId}::uuid)`,
    );
  } catch {
    failed = true;
  }
  if (failed) back("certificates", "error");

  revalidatePath("/admin/cms");
  revalidatePath("/certificate", "layout");
  back("certificates", "published");
}

export async function deleteCertificateTemplateAction(formData: FormData) {
  await requireAdmin();
  const templateId = String(formData.get("templateId") ?? "");
  if (!UUID.test(templateId)) back("certificates", "error");

  // Archive rather than delete: a certificate issued with this design should
  // still be renderable later.
  let failed = false;
  try {
    await db.certificate_templates.update({
      where: { id: templateId },
      data: { status: "ARCHIVED", is_default: false },
    });
  } catch {
    failed = true;
  }
  if (failed) back("certificates", "error");

  await logActivity("CERTIFICATE_TEMPLATE_ARCHIVE", "certificate_templates", templateId, null, {
    status: "ARCHIVED",
  });
  revalidatePath("/admin/cms");
  back("certificates", "published");
}

/** Clears every theme override, putting the site back to its shipped look. */
export async function resetThemeAction(formData: FormData) {
  const session = await requireAdmin();
  const tab = String(formData.get("tab") ?? "global");
  const empty = Object.fromEntries(
    (findSection("global", "theme")?.fields ?? []).map((field) => [field.key, ""]),
  );

  let failed = false;
  try {
    changed(
      await db.cms_sections.updateMany({
        where: { page_key: "global", section_key: "theme" },
        data: { draft: empty, updated_at: new Date(), updated_by: session.userId },
      }),
    );
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  await logActivity("CMS_UPDATE", "cms_sections", "global.theme", null, { reset: true });
  revalidatePath("/admin/cms");
  back(tab, "draft-saved");
}

/* ------------------------------------------------------------------ */
/* Website Builder — structure                                          */
/* ------------------------------------------------------------------ */

/**
 * Applies a whole new order in one call. Only `sort_order` changes: content,
 * database relations, events, payments and registrations are untouched, which
 * is what makes dragging safe (§6).
 */
export async function reorderSectionsAction(formData: FormData) {
  const session = await requireAdmin();
  const pageKey = String(formData.get("pageKey") ?? "");
  const tab = String(formData.get("tab") ?? pageKey);
  const keys = String(formData.get("order") ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  if (!pageKey || keys.length === 0) back(tab, "error");

  let failed = false;
  try {
    await asAdmin(
      session,
      (tx) => tx.$executeRaw`select admin_reorder_sections(${pageKey}, ${keys}::text[])`,
    );
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  revalidatePublic();
  revalidatePath("/admin/cms");
  back(tab, "reordered");
}

/** Copies a section's content into a new one. Collections are not copied —
 *  a duplicated "Yang Diasah" shares the same items rather than cloning rows
 *  that are supposed to exist once (§7). */
export async function duplicateSectionAction(formData: FormData) {
  const session = await requireAdmin();
  const pageKey = String(formData.get("pageKey") ?? "");
  const sectionKey = String(formData.get("sectionKey") ?? "");
  const tab = String(formData.get("tab") ?? pageKey);

  const row = await db.cms_sections.findUnique({
    where: { page_key_section_key: { page_key: pageKey, section_key: sectionKey } },
    select: { draft: true, label: true, sort_order: true, section_type: true, presentation: true },
  });
  if (!row) back(tab, "error");

  const newKey = `${sectionKey}-copy-${Date.now().toString(36)}`;
  let failed = false;
  try {
    await db.cms_sections.create({
      data: {
        page_key: pageKey,
        section_key: newKey,
        label: `${row.label || sectionKey} (salinan)`,
        section_type: row.section_type || sectionKey,
        // Draft only: a copy is never live until the admin publishes it.
        draft: (row.draft ?? {}) as Prisma.InputJsonValue,
        presentation: (row.presentation ?? {}) as Prisma.InputJsonValue,
        sort_order: row.sort_order + 5,
        is_visible: true,
        updated_by: session.userId,
      },
    });
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  await logActivity("SECTION_DUPLICATE", "cms_sections", `${pageKey}.${newKey}`, null, {
    from: sectionKey,
  });
  revalidatePath("/admin/cms");
  back(tab, "duplicated");
}

/** Adds a section from a template, as a draft. */
export async function addSectionAction(formData: FormData) {
  const session = await requireAdmin();
  const pageKey = String(formData.get("pageKey") ?? "home");
  const tab = String(formData.get("tab") ?? pageKey);
  const type = String(formData.get("sectionType") ?? "");

  const template = findTemplate(type);
  if (!template) back(tab, "error");

  const last = await db.cms_sections.findFirst({
    where: { page_key: pageKey },
    orderBy: { sort_order: "desc" },
    select: { sort_order: true },
  });
  const newKey = `${type}-${Date.now().toString(36)}`;

  let failed = false;
  try {
    await db.cms_sections.create({
      data: {
        page_key: pageKey,
        section_key: newKey,
        label: template.label,
        section_type: type,
        draft: template.defaults as Prisma.InputJsonValue,
        sort_order: (last?.sort_order ?? 0) + 10,
        is_visible: true,
        updated_by: session.userId,
      },
    });
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  await logActivity("SECTION_CREATE", "cms_sections", `${pageKey}.${newKey}`, null, { type });
  revalidatePath("/admin/cms");
  back(tab, "section-added");
}

/** Soft delete. Content is kept so an accidental removal is recoverable (§24). */
export async function archiveSectionAction(formData: FormData) {
  await requireAdmin();
  const pageKey = String(formData.get("pageKey") ?? "");
  const sectionKey = String(formData.get("sectionKey") ?? "");
  const tab = String(formData.get("tab") ?? pageKey);

  let failed = false;
  try {
    changed(
      await db.cms_sections.updateMany({
        where: { page_key: pageKey, section_key: sectionKey },
        data: { archived: true, is_visible: false },
      }),
    );
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  await logActivity("SECTION_DELETE", "cms_sections", `${pageKey}.${sectionKey}`, null, {
    archived: true,
  });
  revalidatePublic();
  revalidatePath("/admin/cms");
  back(tab, "archived");
}

/** Presentation presets. Only values from the known preset lists are stored. */
export async function saveSectionPresentationAction(formData: FormData) {
  const session = await requireAdmin();
  const pageKey = String(formData.get("pageKey") ?? "");
  const sectionKey = String(formData.get("sectionKey") ?? "");
  const tab = String(formData.get("tab") ?? pageKey);

  const pick = (key: string, allowed: string[], fallback: string) => {
    const value = String(formData.get(key) ?? "");
    return allowed.includes(value) ? value : fallback;
  };

  const presentation = {
    spacing: pick("spacing", ["compact", "normal", "relaxed"], "normal"),
    container: pick("container", ["standard", "wide", "full"], "standard"),
    backgroundType: pick("backgroundType", ["none", "color", "gradient", "image"], "none"),
    backgroundColor: String(formData.get("backgroundColor") ?? ""),
    gradientFrom: String(formData.get("gradientFrom") ?? ""),
    gradientTo: String(formData.get("gradientTo") ?? ""),
    gradientDirection: pick(
      "gradientDirection",
      ["to bottom", "to right", "to bottom right"],
      "to bottom",
    ),
    backgroundImage: String(formData.get("backgroundImage") ?? ""),
    backgroundPosition: pick(
      "backgroundPosition",
      ["center", "top", "bottom", "left", "right"],
      "center",
    ),
    overlay: pick("overlay", ["none", "light", "dark"], "none"),
  };

  let failed = false;
  try {
    changed(
      await db.cms_sections.updateMany({
        where: { page_key: pageKey, section_key: sectionKey },
        data: { presentation, updated_at: new Date(), updated_by: session.userId },
      }),
    );
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  await logActivity("SECTION_UPDATE", "cms_sections", `${pageKey}.${sectionKey}`, null, presentation);
  revalidatePath("/admin/cms");
  back(tab, "draft-saved");
}

/* ------------------------------------------------------------------ */
/* Design presets                                                      */
/* ------------------------------------------------------------------ */

/**
 * Applies a palette to the theme DRAFT. The live site does not change until
 * the admin publishes, so trying a preset is never a public event (§38).
 */
export async function applyThemePresetAction(formData: FormData) {
  const session = await requireAdmin();
  const tab = String(formData.get("tab") ?? "global");
  const presetId = String(formData.get("presetId") ?? "");

  const preset = findThemePreset(presetId);
  if (!preset) back(tab, "error");

  let failed = false;
  try {
    changed(
      await db.cms_sections.updateMany({
        where: { page_key: "global", section_key: "theme" },
        data: {
          draft: preset.values as Prisma.InputJsonValue,
          updated_at: new Date(),
          updated_by: session.userId,
        },
      }),
    );
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  await logActivity("THEME_UPDATE", "cms_sections", "global.theme", null, {
    preset: preset.id,
  });
  revalidatePath("/admin/cms");
  back(tab, "preset-applied");
}

/* ------------------------------------------------------------------ */
/* Save as Template                                                    */
/* ------------------------------------------------------------------ */

/**
 * Stores a section's current draft as a reusable template.
 *
 * Templates live in cms_sections under the reserved page key `_templates`,
 * which is never rendered by any public page — so this needs no new table and
 * no extra migration (§39).
 */
export async function saveAsTemplateAction(formData: FormData) {
  const session = await requireAdmin();
  const pageKey = String(formData.get("pageKey") ?? "home");
  const sectionKey = String(formData.get("sectionKey") ?? "");
  const tab = String(formData.get("tab") ?? pageKey);
  const name = String(formData.get("templateName") ?? "").trim();
  if (!sectionKey || !name) back(tab, "invalid");

  const row = await db.cms_sections.findUnique({
    where: { page_key_section_key: { page_key: pageKey, section_key: sectionKey } },
    select: { draft: true, section_type: true, presentation: true },
  });
  if (!row) back(tab, "error");

  let failed = false;
  try {
    await db.cms_sections.create({
      data: {
        page_key: TEMPLATE_PAGE_KEY,
        section_key: `tpl-${Date.now().toString(36)}`,
        label: name,
        section_type: row.section_type,
        draft: (row.draft ?? {}) as Prisma.InputJsonValue,
        presentation: (row.presentation ?? {}) as Prisma.InputJsonValue,
        is_visible: false,
        updated_by: session.userId,
      },
    });
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  await logActivity("SECTION_CREATE", "cms_sections", `${TEMPLATE_PAGE_KEY}.${name}`, null, {
    from: `${pageKey}.${sectionKey}`,
  });
  revalidatePath("/admin/cms");
  back(tab, "template-saved");
}

/** Adds a section from a saved template. */
export async function addSavedTemplateAction(formData: FormData) {
  const session = await requireAdmin();
  const pageKey = String(formData.get("pageKey") ?? "home");
  const tab = String(formData.get("tab") ?? pageKey);
  const templateKey = String(formData.get("templateKey") ?? "");
  if (!templateKey) back(tab, "error");

  const [row, last] = await Promise.all([
    db.cms_sections.findUnique({
      where: { page_key_section_key: { page_key: TEMPLATE_PAGE_KEY, section_key: templateKey } },
      select: { draft: true, label: true, section_type: true, presentation: true },
    }),
    db.cms_sections.findFirst({
      where: { page_key: pageKey },
      orderBy: { sort_order: "desc" },
      select: { sort_order: true },
    }),
  ]);
  if (!row) back(tab, "error");

  let failed = false;
  try {
    await db.cms_sections.create({
      data: {
        page_key: pageKey,
        section_key: `${row.section_type}-${Date.now().toString(36)}`,
        label: row.label,
        section_type: row.section_type,
        draft: (row.draft ?? {}) as Prisma.InputJsonValue,
        presentation: (row.presentation ?? {}) as Prisma.InputJsonValue,
        sort_order: (last?.sort_order ?? 0) + 10,
        is_visible: true,
        updated_by: session.userId,
      },
    });
  } catch {
    failed = true;
  }
  if (failed) back(tab, "error");

  await logActivity("SECTION_CREATE", "cms_sections", `${pageKey}.from-template`, null, {
    template: row.label,
  });
  revalidatePath("/admin/cms");
  back(tab, "section-added");
}

/**
 * Saves the gallery's Drive folder.
 *
 * Takes effect immediately rather than going through draft/publish: it is a
 * single link, and an admin changing it means the old folder is already
 * wrong. Waiting for a publish step would just leave a dead link live.
 */
export async function saveGalleryDriveAction(formData: FormData) {
  await requireAdmin();

  const url = String(formData.get("url") ?? "").trim();
  if (url && !/^https?:\/\//.test(url)) {
    redirect("/admin/cms?tab=global&status=invalid&message=" +
      encodeURIComponent("Tautan Google Drive harus diawali https://"));
  }

  const value = {
    url,
    buttonLabel: String(formData.get("buttonLabel") ?? "").trim() || "Buka Google Drive",
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    updatedAt: String(formData.get("updatedAt") ?? "").trim(),
  };

  let failed = false;
  try {
    await db.site_settings.upsert({
      where: { key: "gallery_drive" },
      create: { key: "gallery_drive", value },
      update: { value, updated_at: new Date() },
    });
  } catch {
    failed = true;
  }
  if (failed) back("global", "error");

  await logActivity("CMS_UPDATE", "site_settings", "gallery_drive", null, value);
  revalidatePath("/galeri");
  revalidatePath("/");
  revalidatePath("/admin/cms");
  back("global", "gallery-saved");
}
