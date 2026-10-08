"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ALLOWED_MIME,
  MAX_FILE_BYTES,
  MAX_VIDEO_BYTES,
  MEDIA_FOLDERS,
  MEDIA_FOLDER_LABEL,
  formatFileSize,
} from "@/lib/admin/media";
import { uploadMediaFile } from "@/lib/admin/upload";

/**
 * Uploads straight to Supabase Storage with the admin's own session — the
 * storage policies decide whether it's allowed, so no service-role key is
 * involved. Metadata lands in the `media` table afterwards.
 */
export function MediaUploader({ onUploaded }: { onUploaded?: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState<string>("general");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setDone(null);
    setBusy(true);

    let uploaded = 0;
    for (const file of Array.from(files)) {
      const result = await uploadMediaFile(file, folder);
      if (!result.ok) {
        setError(result.error);
        continue;
      }
      uploaded += 1;
    }

    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (uploaded > 0) {
      setDone(`${uploaded} berkas berhasil diunggah.`);
      onUploaded?.();
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          Kategori
          <select
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            disabled={busy}
            className="h-11 rounded-xl border border-line bg-surface px-3 text-[0.9375rem] text-ink"
          >
            {MEDIA_FOLDERS.map((item) => (
              <option key={item} value={item}>
                {MEDIA_FOLDER_LABEL[item] ?? item}
              </option>
            ))}
          </select>
        </label>

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME.join(",")}
          multiple
          disabled={busy}
          onChange={(event) => handleFiles(event.target.files)}
          className="hidden"
          id="media-file-input"
        />
        <Button
          type="button"
          size="lg"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Mengunggah…
            </>
          ) : (
            <>
              <Upload className="size-4" aria-hidden />
              Pilih & Unggah Gambar
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted">
        Gambar JPG, PNG, WEBP, AVIF, GIF — maksimal {formatFileSize(MAX_FILE_BYTES)}. Video MP4
        atau WEBM — maksimal {formatFileSize(MAX_VIDEO_BYTES)}. Video panjang sebaiknya diunggah
        ke YouTube saja, karena penyimpanan Supabase terbatas 1 GB.
      </p>

      {error ? (
        <p role="alert" className="rounded-xl border border-brand/30 bg-brand-soft p-3 text-sm font-medium text-brand-ink">
          {error}
        </p>
      ) : null}
      {done ? (
        <p role="status" className="rounded-xl border border-pine/30 bg-pine-soft/60 p-3 text-sm font-medium text-pine-dark">
          {done}
        </p>
      ) : null}
    </div>
  );
}
