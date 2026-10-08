export const MEDIA_BUCKET = "website";

export const MEDIA_FOLDERS = [
  "general",
  "logo",
  "hero",
  "home",
  "events",
  "gallery",
  "updates",
  "certificate",
] as const;

export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

/** Plain-language names for the admin; the stored value stays the folder key. */
export const MEDIA_FOLDER_LABEL: Record<string, string> = {
  general: "Umum",
  logo: "Logo",
  hero: "Hero",
  home: "Halaman Depan",
  events: "Event",
  gallery: "Galeri",
  updates: "Update",
  certificate: "Sertifikat",
};

export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

/**
 * Video is allowed, but only the two formats every browser plays natively.
 * MOV and AVI are rejected on purpose — they upload fine and then refuse to
 * play for half the visitors, which is worse than refusing them here.
 */
export const ALLOWED_VIDEO_MIME = ["video/mp4", "video/webm"];

export const ALLOWED_MIME = [...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME];

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Video gets its own, larger cap. Supabase's free tier gives 1 GB of
 * storage in total, so a handful of 50 MB clips is already a meaningful
 * share of it — keep videos short, or host them on YouTube instead.
 */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export function isVideo(mimeType: string): boolean {
  return ALLOWED_VIDEO_MIME.includes(mimeType);
}

export function maxBytesFor(mimeType: string): number {
  return isVideo(mimeType) ? MAX_VIDEO_BYTES : MAX_FILE_BYTES;
}

export interface MediaItem {
  id: string;
  file_name: string;
  storage_path: string;
  public_url: string;
  alt_text: string;
  mime_type: string;
  file_size: number;
  folder: string;
  created_at: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Keeps uploaded names predictable and safe as a storage path segment. */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot === -1 ? name : name.slice(0, dot))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const ext = dot === -1 ? "" : name.slice(dot).toLowerCase();
  return `${base || "file"}-${Date.now()}${ext}`;
}
