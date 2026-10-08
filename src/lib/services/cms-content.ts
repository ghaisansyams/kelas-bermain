/**
 * Maps CMS collections onto the shapes the public components already expect.
 *
 * CMS-first with a fallback to the shipped data: once an admin publishes
 * something in a collection it wins, and until then the site shows exactly
 * what it shows today. That keeps the migration from being a flag day.
 */

import { getCollectionItems, type CollectionItem } from "@/lib/services/cms-website";
import type { GalleryItem, Testimonial, UpdatePost } from "@/lib/types";
import { getYoutubeThumbnail } from "@/lib/utils/youtube";

function text(content: Record<string, unknown>, key: string, fallback = ""): string {
  const value = content[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function flag(content: Record<string, unknown>, key: string): boolean {
  return content[key] === true;
}

export async function getCmsTestimonials(): Promise<Testimonial[] | null> {
  const items = await getCollectionItems("testimonials");
  if (items.length === 0) return null;

  return items.map((item, index) => {
    const youtubeUrl = text(item.content, "youtubeUrl");
    const thumbnail =
      text(item.content, "thumbnailUrl") || (youtubeUrl ? (getYoutubeThumbnail(youtubeUrl) ?? "") : "");

    return {
      id: item.key,
      name: text(item.content, "name", `Orang tua ${index + 1}`),
      role: text(item.content, "role"),
      quote: text(item.content, "quote"),
      avatar: { src: thumbnail, alt: text(item.content, "name") },
      eventTitle: text(item.content, "eventTitle") || undefined,
      video: youtubeUrl
        ? { youtubeUrl, thumbnail: thumbnail || undefined }
        : undefined,
    } satisfies Testimonial;
  });
}

export async function getCmsGallery(): Promise<GalleryItem[] | null> {
  const items = await getCollectionItems("gallery");
  if (items.length === 0) return null;

  return items.map((item) => ({
    id: item.key,
    image: {
      src: text(item.content, "src"),
      alt: text(item.content, "alt", text(item.content, "caption")),
    },
    title: text(item.content, "caption"),
    category: (text(item.content, "category", "Kegiatan") as GalleryItem["category"]),
    date: text(item.content, "date"),
    caption: text(item.content, "caption"),
  }));
}

export async function getCmsUpdates(): Promise<UpdatePost[] | null> {
  const items = await getCollectionItems("updates");
  if (items.length === 0) return null;

  return items.map((item) => ({
    id: item.key,
    slug: text(item.content, "slug", item.key),
    platform: "instagram" as const,
    username: "@kelasbermain.id",
    postUrl: text(item.content, "postUrl", "https://instagram.com/kelasbermain.id"),
    image: {
      src: text(item.content, "imageUrl"),
      alt: text(item.content, "title"),
    },
    title: text(item.content, "title"),
    caption: text(item.content, "excerpt"),
    excerpt: text(item.content, "excerpt"),
    publishedAt: text(item.content, "publishedAt"),
    type: "POST" as const,
    category: (text(item.content, "category", "Kegiatan") as UpdatePost["category"]),
    status: "PUBLISHED" as const,
  }));
}

export function isFeatured(item: CollectionItem): boolean {
  return flag(item.content, "featured");
}
