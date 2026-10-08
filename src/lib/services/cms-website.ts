/**
 * CMS read layer for the public site (website builder content).
 *
 * Reads published, visible content only, through the SECURITY DEFINER
 * functions in supabase/cms-website-schema.sql — drafts never leave the
 * admin. Every getter falls back to the copy the site shipped with, so an
 * empty table, a missing env var or a database hiccup degrades to today's
 * text instead of a blank page.
 */

import { getSupabase } from "@/lib/supabase/client";
import { pillars as fallbackPillars, siteConfig, mainNav } from "@/data/site";

export type SectionContent = Record<string, unknown>;

export interface CollectionItem {
  key: string;
  content: SectionContent;
  sortOrder: number;
}

export interface PageContent {
  /** Section key → its published content. */
  sections: Record<string, SectionContent>;
  /** Section keys in the order the admin arranged them, visible ones only. */
  order: string[];
  /** Section key → its presentation presets (spacing, background). */
  presentation: Record<string, SectionContent>;
}

const EMPTY_PAGE: PageContent = { sections: {}, order: [], presentation: {} };

/**
 * Says loudly, in the server log only, that the site is running on shipped
 * copy rather than CMS content. Visitors see a working page either way, but a
 * developer must never mistake the fallback for a connected CMS.
 */
function warnFallback(what: string, reason: string) {
  if (process.env.NODE_ENV === "production") {
    console.warn(`[cms] ${what} unavailable (${reason}) — using fallback content.`);
  }
}

export async function getPageContent(pageKey: string): Promise<PageContent> {
  try {
    const { data, error } = await getSupabase().rpc("get_cms_page", { p_page_key: pageKey });
    if (error || !Array.isArray(data)) {
      warnFallback(`page "${pageKey}"`, error?.message ?? "no rows");
      return EMPTY_PAGE;
    }

    const rows = data as {
      section_key: string;
      content: SectionContent;
      sort_order: number;
      presentation?: SectionContent;
    }[];
    const sections: Record<string, SectionContent> = {};
    const presentation: Record<string, SectionContent> = {};
    const order: string[] = [];
    for (const row of rows) {
      if (!row.content) continue;
      sections[row.section_key] = row.content;
      presentation[row.section_key] = row.presentation ?? {};
      order.push(row.section_key);
    }
    return { sections, order, presentation };
  } catch (error) {
    warnFallback(`page "${pageKey}"`, String(error));
    return EMPTY_PAGE;
  }
}

export async function getCollectionItems(collectionKey: string): Promise<CollectionItem[]> {
  try {
    const { data, error } = await getSupabase().rpc("get_cms_collection", {
      p_collection_key: collectionKey,
    });
    if (error || !Array.isArray(data)) {
      warnFallback(`collection "${collectionKey}"`, error?.message ?? "no rows");
      return [];
    }
    return (data as { item_key: string; content: SectionContent; sort_order: number }[])
      .filter((row) => row.content)
      .map((row) => ({ key: row.item_key, content: row.content, sortOrder: row.sort_order }));
  } catch (error) {
    warnFallback(`collection "${collectionKey}"`, String(error));
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Typed views over the raw content, each with a shipped fallback       */
/* ------------------------------------------------------------------ */

function str(content: SectionContent | undefined, key: string, fallback = ""): string {
  const value = content?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function num(content: SectionContent | undefined, key: string, fallback: number): number {
  const value = Number(content?.[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function bool(content: SectionContent | undefined, key: string, fallback: boolean): boolean {
  const value = content?.[key];
  return typeof value === "boolean" ? value : fallback;
}

export interface SiteIdentity {
  name: string;
  tagline: string;
  description: string;
  logoUrl: string;
  logoMobileUrl: string;
  faviconUrl: string;
  email: string;
  whatsapp: string;
  social: { label: string; href: string; icon: string }[];
}

export function toSiteIdentity(content?: SectionContent): SiteIdentity {
  const social = [
    { label: "Instagram", href: str(content, "instagramUrl"), icon: "instagram" },
    { label: "TikTok", href: str(content, "tiktokUrl"), icon: "tiktok" },
    { label: "Threads", href: str(content, "threadsUrl"), icon: "threads" },
    { label: "YouTube", href: str(content, "youtubeUrl"), icon: "youtube" },
    { label: "Facebook", href: str(content, "facebookUrl"), icon: "facebook" },
  ].filter((item) => item.href);

  return {
    name: str(content, "name", siteConfig.name),
    tagline: str(content, "tagline", siteConfig.tagline),
    description: str(content, "description", siteConfig.description),
    logoUrl: str(content, "logoUrl"),
    logoMobileUrl: str(content, "logoMobileUrl"),
    faviconUrl: str(content, "faviconUrl"),
    email: str(content, "email", siteConfig.email),
    whatsapp: str(content, "whatsapp", siteConfig.whatsapp),
    social,
  };
}

export interface FooterContent {
  description: string;
  contactTitle: string;
  copyright: string;
  showWhatsapp: boolean;
}

export function toFooterContent(content?: SectionContent): FooterContent {
  return {
    description: str(content, "description", siteConfig.tagline),
    contactTitle: str(content, "contactTitle", "Hubungi kami"),
    copyright: str(
      content,
      "copyright",
      `© ${new Date().getFullYear()} ${siteConfig.name}. Seluruh hak cipta dilindungi.`,
    ),
    showWhatsapp: bool(content, "showWhatsapp", false),
  };
}

export interface SeoContent {
  siteTitle: string;
  description: string;
  keywords: string;
  ogImageUrl: string;
}

export function toSeoContent(content?: SectionContent): SeoContent {
  return {
    siteTitle: str(content, "siteTitle", `${siteConfig.name} — ${siteConfig.tagline}`),
    description: str(content, "description", siteConfig.description),
    keywords: str(content, "keywords"),
    ogImageUrl: str(content, "ogImageUrl"),
  };
}

/** Maps theme fields onto the CSS custom properties the stylesheet uses. */
const THEME_VARS: Record<string, string> = {
  brand: "--color-brand",
  brandInk: "--color-brand-ink",
  accent: "--color-accent",
  canvas: "--color-canvas",
  surface: "--color-surface",
  ink: "--color-ink",
  muted: "--color-muted",
  line: "--color-line",
  radiusButton: "--radius-pill",
  radiusCard: "--radius-card",
};

/**
 * Builds the inline style the layout injects. Only colours and two radii are
 * exposed: font sizes and spacing stay in code so an admin cannot accidentally
 * break the mobile layout (section 46 of the brief).
 */
export function toThemeStyle(content?: SectionContent): Record<string, string> {
  const style: Record<string, string> = {};
  if (!content) return style;
  for (const [field, cssVar] of Object.entries(THEME_VARS)) {
    const value = str(content, field);
    if (value) style[cssVar] = value;
  }
  return style;
}

export interface PillarItem {
  title: string;
  description: string;
  icon: string;
  accent: string;
}

export function toPillars(items: CollectionItem[]): PillarItem[] {
  if (items.length === 0) {
    return fallbackPillars.map((pillar) => ({
      title: pillar.title,
      description: pillar.description,
      icon: pillar.icon,
      accent: pillar.accent,
    }));
  }
  return items.map((item) => ({
    title: str(item.content, "title"),
    description: str(item.content, "description"),
    icon: str(item.content, "icon", "sparkles"),
    accent: str(item.content, "accent", "brand"),
  }));
}

export interface HeadingContent {
  eyebrow: string;
  title: string;
  description: string;
}

export function toHeading(
  content: SectionContent | undefined,
  fallback: HeadingContent,
): HeadingContent {
  return {
    eyebrow: str(content, "eyebrow", fallback.eyebrow),
    title: str(content, "title", fallback.title),
    description: str(content, "description", fallback.description),
  };
}

export function sectionLimit(content: SectionContent | undefined, fallback: number): number {
  return num(content, "limit", fallback);
}

export { str as cmsText, bool as cmsBool, num as cmsNumber };

/** Navigation stays in its own table; re-exported here so callers have one import. */
export const DEFAULT_NAV = mainNav.map((link) => ({
  label: link.label,
  href: link.href,
  openInNewTab: false,
}));
