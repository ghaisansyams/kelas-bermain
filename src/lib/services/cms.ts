import { getSupabase } from "@/lib/supabase/client";
import { heroSlides, type HeroSlide } from "@/data/hero-slides";
import { mainNav } from "@/data/site";

/**
 * CMS read layer for the public site.
 *
 * Reads only PUBLISHED content, through the SECURITY DEFINER functions in
 * supabase/admin-schema.sql — drafts never leave the admin. Every getter
 * falls back to the copy the site shipped with, so an empty table, a missing
 * env var or a database hiccup degrades to today's text instead of a blank
 * page.
 */

export interface HomeHeroContent {
  eyebrow: string;
  title: string;
  /** Word inside `title` rendered in the brand colour. */
  highlight: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  statValue: string;
  statLabel: string;
}

export interface SectionHeadingContent {
  eyebrow: string;
  title: string;
  description: string;
}

export interface HomeContent {
  hero: HomeHeroContent;
  heroSlides: HeroSlide[];
  eventsTeaser: SectionHeadingContent;
}

export interface NavItem {
  label: string;
  href: string;
  openInNewTab: boolean;
}

export const DEFAULT_HOME_CONTENT: HomeContent = {
  hero: {
    eyebrow: "Play • Learn • Grow",
    title: "Tempat anak belajar, bertumbuh, dan bermain bersama.",
    highlight: "bermain",
    description:
      "Aktivitas kreatif dan edukatif untuk anak usia 3–15 tahun di Jabodetabek. Satu hari penuh pengalaman baru — dari jadi pemadam cilik sampai membuat cokelat sendiri.",
    primaryCtaLabel: "Lihat Event",
    primaryCtaHref: "/event",
    secondaryCtaLabel: "Daftar Kelas",
    secondaryCtaHref: "/event",
    statValue: "Jabodetabek",
    statLabel: "Area kegiatan",
  },
  heroSlides,
  eventsTeaser: {
    eyebrow: "Jadwal kegiatan",
    title: "Kelas yang bisa diikuti si kecil",
    description:
      "Pilih yang paling sesuai usia dan minat anak. Detail agenda, biaya, dan fasilitas ada di setiap halaman kelas.",
  },
};

const DEFAULT_NAV: NavItem[] = mainNav.map((link) => ({
  label: link.label,
  href: link.href,
  openInNewTab: false,
}));

type SectionRow = { section_key: string; content: Record<string, unknown> | null };

function merge<T extends object>(fallback: T, content: Record<string, unknown> | null): T {
  if (!content) return fallback;
  const result = { ...fallback } as Record<string, unknown>;
  for (const [key, value] of Object.entries(content)) {
    if (typeof value === "string" && value.trim() === "") continue;
    if (value === null || value === undefined) continue;
    result[key] = value;
  }
  return result as T;
}

/** A slide only reaches the public site once it has an image to show. */
function readSlides(content: Record<string, unknown> | null): HeroSlide[] {
  const raw = content?.slides;
  if (!Array.isArray(raw)) return heroSlides;
  const slides = raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => ({
      id: String(item.id ?? `slide-${index}`),
      image: String(item.image ?? ""),
      alt: String(item.alt ?? ""),
      title: String(item.title ?? ""),
      date: String(item.date ?? ""),
      location: String(item.location ?? ""),
      eventSlug: String(item.eventSlug ?? ""),
    }))
    .filter((slide) => slide.image !== "");
  return slides.length > 0 ? slides : heroSlides;
}

export async function getHomeContent(): Promise<HomeContent> {
  try {
    const { data, error } = await getSupabase().rpc("get_cms_sections", {
      p_page_key: "home",
    });
    if (error || !data) return DEFAULT_HOME_CONTENT;

    const rows = data as SectionRow[];
    const find = (key: string) => rows.find((row) => row.section_key === key)?.content ?? null;

    return {
      hero: merge(DEFAULT_HOME_CONTENT.hero, find("hero")),
      heroSlides: readSlides(find("hero_slides")),
      eventsTeaser: merge(DEFAULT_HOME_CONTENT.eventsTeaser, find("events_teaser")),
    };
  } catch {
    return DEFAULT_HOME_CONTENT;
  }
}

export async function getNavigationItems(): Promise<NavItem[]> {
  try {
    const { data, error } = await getSupabase().rpc("get_navigation");
    if (error || !data) return DEFAULT_NAV;
    const rows = data as { label: string; href: string; open_in_new_tab: boolean }[];
    if (rows.length === 0) return DEFAULT_NAV;
    return rows.map((row) => ({
      label: row.label,
      href: row.href,
      openInNewTab: Boolean(row.open_in_new_tab),
    }));
  } catch {
    return DEFAULT_NAV;
  }
}
