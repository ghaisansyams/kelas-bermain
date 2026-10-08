import "server-only";

import type { RawInstagramMedia } from "@/data/updates";
import type { UpdateSource } from "@/lib/services/update-source";
import type { UpdateCategory } from "@/lib/types";

/**
 * Real Instagram adapter.
 *
 * Reads the account's own posts through the Instagram API with Instagram
 * Login (`graph.instagram.com/me/media`) — the replacement for the Basic
 * Display API that Meta shut down. Nothing is scraped.
 *
 * The token is read from INSTAGRAM_ACCESS_TOKEN, a server-only variable. It
 * must never be NEXT_PUBLIC_*: anyone holding it can read and post as the
 * account, so it stays on the server and the browser only ever sees the
 * finished list.
 */

const GRAPH = "https://graph.instagram.com";

/** Only fields the public page actually renders are requested. */
const FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp",
  "username",
].join(",");

interface GraphMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  username?: string;
}

/** Keywords that let a post land in the right tab without manual tagging. */
const CATEGORY_RULES: { category: UpdateCategory; patterns: RegExp }[] = [
  { category: "Pengumuman", patterns: /\b(pengumuman|info penting|perhatian|mohon|dibuka|ditutup)\b/i },
  { category: "Event", patterns: /\b(event|kelas|workshop|open house|pendaftaran|daftar|kuota)\b/i },
  { category: "Dokumentasi", patterns: /\b(dokumentasi|keseruan|momen|recap|galeri|terima kasih)\b/i },
];

function detectCategory(caption: string): UpdateCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.test(caption)) return rule.category;
  }
  return "Kegiatan";
}

/** First meaningful line of the caption, trimmed to a headline length. */
function toTitle(caption: string): string {
  const firstLine =
    caption
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";
  // Hashtag-only lines make poor headlines.
  const cleaned = firstLine.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
  const source = cleaned || caption.replace(/\s+/g, " ").trim();
  if (!source) return "Update Kelas Bermain";
  return source.length > 90 ? `${source.slice(0, 90).trimEnd()}…` : source;
}

function toExcerpt(caption: string): string {
  const text = caption.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > 180 ? `${text.slice(0, 180).trimEnd()}…` : text;
}

/** Stable, readable URL segment. Falls back to the media id when a caption
 *  has no usable words, so two posts can never collide. */
function toSlug(caption: string, id: string): string {
  const base = toTitle(caption)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 8)
    .join("-");
  const suffix = id.slice(-6);
  return base ? `${base}-${suffix}` : `post-${suffix}`;
}

function toRaw(media: GraphMedia, fallbackUsername: string): RawInstagramMedia | null {
  // A video's media_url is the video file; thumbnail_url is the still frame
  // the card should show.
  const image = media.media_type === "VIDEO" ? media.thumbnail_url : media.media_url;
  if (!image) return null;

  const caption = media.caption ?? "";
  const username = media.username ? `@${media.username}` : fallbackUsername;

  return {
    id: media.id,
    slug: toSlug(caption, media.id),
    username,
    permalink: media.permalink,
    media_url: { src: image, alt: toTitle(caption) },
    caption,
    excerpt: toExcerpt(caption),
    title: toTitle(caption),
    timestamp: media.timestamp.slice(0, 10),
    category: detectCategory(caption),
    // Everything the account has posted is already public on Instagram.
    status: "PUBLISHED",
  };
}

export interface InstagramSourceOptions {
  token: string;
  username?: string;
  limit?: number;
}

export function createInstagramSource({
  token,
  username = "@kelasbermain.id",
  limit = 24,
}: InstagramSourceOptions): UpdateSource {
  return {
    async fetchMedia() {
      const url = `${GRAPH}/me/media?fields=${FIELDS}&limit=${limit}&access_token=${encodeURIComponent(token)}`;

      // Cached for an hour: Instagram rate-limits, and a post appearing up to
      // an hour late is a fair trade for not calling the API on every visit.
      const response = await fetch(url, { next: { revalidate: 3600 } });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        // The token is in the URL, so the URL itself must never be logged.
        throw new Error(
          `Instagram API ${response.status}: ${detail.slice(0, 200) || "no detail"}`,
        );
      }

      const payload = (await response.json()) as { data?: GraphMedia[] };
      const items = Array.isArray(payload.data) ? payload.data : [];

      return items
        .map((item) => toRaw(item, username))
        .filter((item): item is RawInstagramMedia => item !== null)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },
  };
}
