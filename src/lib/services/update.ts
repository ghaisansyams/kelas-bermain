import type { RawInstagramMedia } from "@/data/updates";
import type { UpdatePost } from "@/lib/types";
import { mockInstagramSource, type UpdateSource } from "./update-source";

/**
 * Update service — the one read path the home page and the /update pages
 * share, so both always show the same posts from the same source.
 *
 * Returns a result object instead of throwing, so a failing source shows the
 * "Update belum dapat dimuat" state instead of crashing the page.
 */

const source: UpdateSource = mockInstagramSource;

export type UpdatesResult =
  | { ok: true; updates: UpdatePost[] }
  | { ok: false; error: string };

function toUpdatePost(raw: RawInstagramMedia): UpdatePost {
  return {
    id: raw.id,
    slug: raw.slug,
    platform: "instagram",
    username: raw.username,
    postUrl: raw.permalink,
    image: raw.media_url,
    title: raw.title,
    caption: raw.caption,
    excerpt: raw.excerpt,
    publishedAt: raw.timestamp,
    type: "POST",
    category: raw.category,
    status: raw.status,
  };
}

async function loadPublished(): Promise<UpdatesResult> {
  try {
    const media = await source.fetchMedia();
    const updates = media
      .filter((item) => item.status === "PUBLISHED")
      .map(toUpdatePost)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return { ok: true, updates };
  } catch {
    return { ok: false, error: "Update belum dapat dimuat." };
  }
}

/** Newest first, PUBLISHED only. */
export async function getUpdates(): Promise<UpdatesResult> {
  return loadPublished();
}

export async function getLatestUpdates(limit: number): Promise<UpdatesResult> {
  const result = await loadPublished();
  if (!result.ok) return result;
  return { ok: true, updates: result.updates.slice(0, limit) };
}

export async function getUpdateBySlug(slug: string): Promise<UpdatePost | null> {
  const result = await loadPublished();
  if (!result.ok) return null;
  return result.updates.find((update) => update.slug === slug) ?? null;
}

export async function getUpdateSlugs(): Promise<string[]> {
  const result = await loadPublished();
  return result.ok ? result.updates.map((update) => update.slug) : [];
}
