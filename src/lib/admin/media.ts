export const MEDIA_BUCKET = "website";

export const MEDIA_FOLDERS = [
  "home",
  "events",
  "updates",
  "news",
  "gallery",
  "general",
] as const;

export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

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
