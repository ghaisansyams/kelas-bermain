"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ALLOWED_MIME, type MediaItem } from "@/lib/admin/media";
import { uploadMediaFile } from "@/lib/admin/upload";

/**
 * Picks an image URL from the media library. Reads `media` with the admin's
 * own session (RLS decides), and hands back the public URL — the CMS stores
 * the URL, not the file.
 */
export function MediaPicker({
  value,
  onChange,
  label = "Pilih dari Media",
  folder = "general",
}: {
  value: string;
  onChange: (url: string, altText: string) => void;
  label?: string;
  /** Media Library category new uploads are filed under. */
  folder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Uploads straight from this field. The old flow made the admin leave the
   * form, go to Media Library, upload, come back, then pick — four steps for
   * one picture. The file still lands in the Media Library, so nothing is
   * lost by skipping the detour.
   */
  async function handleUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    const result = await uploadMediaFile(file, folder);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";

    if (!result.ok) {
      setError(result.error);
      return;
    }
    // Alt text defaults to the file name so an image is never left unlabelled.
    onChange(result.url, result.fileName);
    // The library listing is now stale; reload it next time it opens.
    setItems(null);
  }

  const load = useCallback(async () => {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: loadError } = await supabase
      .from("media")
      .select("id, file_name, storage_path, public_url, alt_text, mime_type, file_size, folder, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (loadError) {
      setError("Media gagal dimuat.");
      setItems([]);
      return;
    }
    setItems((data ?? []) as MediaItem[]);
  }, []);

  useEffect(() => {
    if (open && items === null) void load();
  }, [open, items, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED_MIME.join(",")}
          onChange={(event) => void handleUpload(event.target.files)}
          disabled={uploading}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-brand px-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          {uploading ? "Mengunggah…" : "Unggah dari Laptop"}
        </button>

        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={uploading}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-pill border border-line px-3.5 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-50"
        >
          <ImageIcon className="size-4" aria-hidden />
          {label}
        </button>

        {value ? (
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="text-xs font-semibold text-muted hover:text-brand"
          >
            Kosongkan
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-brand-ink">
          {error}
        </p>
      ) : null}

      {open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Pilih gambar"
              className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink/70 p-4 sm:p-8"
              onClick={() => setOpen(false)}
            >
              <div
                className="w-full max-w-3xl rounded-card bg-canvas p-5 shadow-lift sm:p-6"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-extrabold text-ink">Media Library</h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Tutup"
                    className="flex size-9 items-center justify-center rounded-full border border-line text-ink-soft hover:text-ink"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>

                {error ? (
                  <p className="mt-4 text-sm font-medium text-brand-ink">{error}</p>
                ) : items === null ? (
                  <p className="mt-6 flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Memuat media…
                  </p>
                ) : items.length === 0 ? (
                  <p className="mt-6 text-sm text-muted">
                    Belum ada gambar. Unggah lebih dulu di menu Media Library.
                  </p>
                ) : (
                  <div className="mt-4 grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onChange(item.public_url, item.alt_text);
                          setOpen(false);
                        }}
                        className="group overflow-hidden rounded-xl border border-line bg-surface text-left transition-colors hover:border-brand/40"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin-only picker thumbnail */}
                        <img
                          src={item.public_url}
                          alt={item.alt_text || item.file_name}
                          className="aspect-square w-full object-cover"
                        />
                        <span className="block truncate px-2 py-1.5 text-[0.6875rem] text-muted">
                          {item.file_name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
