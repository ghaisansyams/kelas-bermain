/**
 * The Google Drive folder behind the gallery.
 *
 * Stored in `site_settings` rather than as a CMS section, for one practical
 * reason: `site_settings` upserts itself on first save, so this works the
 * moment the code deploys — no migration to run, nothing to seed, nothing
 * that can be forgotten.
 */

import { getSupabase } from "@/lib/supabase/client";
import { galleryDrive } from "@/data/gallery";

export interface GalleryDriveSettings {
  url: string;
  buttonLabel: string;
  title: string;
  description: string;
  updatedAt: string;
}

export const DEFAULT_GALLERY_DRIVE: GalleryDriveSettings = {
  url: galleryDrive.url,
  buttonLabel: "Buka Google Drive",
  title: galleryDrive.title,
  description: galleryDrive.description,
  updatedAt: galleryDrive.updatedAt,
};

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function toGalleryDrive(value: unknown): GalleryDriveSettings {
  if (!value || typeof value !== "object") return DEFAULT_GALLERY_DRIVE;
  const raw = value as Record<string, unknown>;
  return {
    url: str(raw.url, DEFAULT_GALLERY_DRIVE.url),
    buttonLabel: str(raw.buttonLabel, DEFAULT_GALLERY_DRIVE.buttonLabel),
    title: str(raw.title, DEFAULT_GALLERY_DRIVE.title),
    description: str(raw.description, DEFAULT_GALLERY_DRIVE.description),
    updatedAt: str(raw.updatedAt, DEFAULT_GALLERY_DRIVE.updatedAt),
  };
}

export async function getGalleryDriveSettings(): Promise<GalleryDriveSettings> {
  try {
    const { data, error } = await getSupabase().rpc("get_site_setting", {
      p_key: "gallery_drive",
    });
    if (error || !data) return DEFAULT_GALLERY_DRIVE;
    return toGalleryDrive(data);
  } catch {
    return DEFAULT_GALLERY_DRIVE;
  }
}
