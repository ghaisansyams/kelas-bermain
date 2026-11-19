import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { joinSteps, pillars, siteConfig } from "@/data/site";
import {
  ACTIVITIES_HEADING,
  CTA_DEFAULTS,
  EVENTS_TEASER_HEADING,
  GALLERY_HEADING,
  JOIN_STEPS_HEADING,
  PAGE_HEADINGS,
  PILLARS_HEADING,
  SOCIAL_FEED_DEFAULTS,
  TESTIMONIALS_HEADING,
} from "@/lib/cms/home-defaults";
import { GLOBAL_PAGE, HOME_PAGE, PAGES_PAGE, type PageDef } from "@/lib/cms/schema";
import { DEFAULT_HOME_CONTENT } from "@/lib/services/cms";

/**
 * Isi awal CMS: persis teks yang sudah tampil di website, sehingga editornya
 * langsung terisi dan hasil publiknya tidak berubah.
 */
type Json = Prisma.InputJsonValue;

/** Tulisan "Lihat di Instagram" tetap di kode; yang disimpan hanya kolom yang ada di editor. */
const SOCIAL_FIELDS = Object.fromEntries(
  Object.entries(SOCIAL_FEED_DEFAULTS).filter(([key]) => key !== "instagramLabel"),
);

const HOME_DEFAULTS: Record<string, Json> = {
  hero: { ...DEFAULT_HOME_CONTENT.hero },
  hero_slides: { mode: "auto", slides: [] },
  pillars: { ...PILLARS_HEADING },
  events_teaser: { ...EVENTS_TEASER_HEADING },
  join_steps: { ...JOIN_STEPS_HEADING },
  activities: { ...ACTIVITIES_HEADING, limit: 3 },
  gallery: { ...GALLERY_HEADING },
  testimonials: { ...TESTIMONIALS_HEADING },
  social_feed: { ...SOCIAL_FIELDS, limit: 6 },
  cta: { ...CTA_DEFAULTS },
};

const GLOBAL_DEFAULTS: Record<string, Json> = {
  identity: { name: siteConfig.name, tagline: siteConfig.tagline, description: siteConfig.description },
};

const PAGES_DEFAULTS: Record<string, Json> = Object.fromEntries(
  Object.entries(PAGE_HEADINGS).map(([key, heading]) => [key, { ...heading }]),
);

async function seedPage(page: PageDef, defaults: Record<string, Json>, userId: string) {
  if ((await db.cms_sections.count({ where: { page_key: page.key } })) > 0) return;
  const now = new Date();
  await db.cms_sections.createMany({
    data: page.sections.map((section, index) => ({
      page_key: page.key,
      section_key: section.key,
      section_type: section.key,
      label: section.label,
      draft: defaults[section.key] ?? {},
      published: defaults[section.key] ?? {},
      published_at: now,
      sort_order: (index + 1) * 10,
      is_visible: true,
      updated_by: userId,
    })),
    skipDuplicates: true,
  });
}

async function seedCollection(
  key: string,
  items: Record<string, string>[],
  userId: string,
) {
  if ((await db.cms_collections.count({ where: { collection_key: key } })) > 0) return;
  const now = new Date();
  await db.cms_collections.createMany({
    data: items.map((content, index) => ({
      collection_key: key,
      item_key: `${key}-${index + 1}`,
      draft: content,
      published: content,
      published_at: now,
      sort_order: (index + 1) * 10,
      is_visible: true,
      updated_by: userId,
    })),
    skipDuplicates: true,
  });
}

/**
 * Database baru (misalnya di server hosting) hanya berisi tabel kosong, jadi
 * tab-tab CMS tidak punya bagian untuk dipilih dan tidak ada yang bisa
 * diedit. Setiap halaman dan koleksi diisi sekali kalau masih kosong sama
 * sekali; yang sudah ada tidak disentuh. Beranda tidak perlu disegarkan:
 * tanpa baris pun, website sudah memakai isi bawaan yang sama.
 */
export async function ensureCmsDefaults(userId: string): Promise<void> {
  try {
    await seedPage(HOME_PAGE, HOME_DEFAULTS, userId);
    await seedPage(GLOBAL_PAGE, GLOBAL_DEFAULTS, userId);
    await seedPage(PAGES_PAGE, PAGES_DEFAULTS, userId);
    await seedCollection(
      "pillars",
      pillars.map((item) => ({ title: item.title, description: item.description, icon: item.icon, accent: item.accent })),
      userId,
    );
    await seedCollection(
      "join_steps",
      joinSteps.map((item) => ({ title: item.title, description: item.description })),
      userId,
    );
  } catch {
    // Gagal di sini tidak boleh merusak halaman CMS; daftarnya kosong seperti sebelumnya.
  }
}
