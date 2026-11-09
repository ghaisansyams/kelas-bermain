"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { Loader2, Upload } from "lucide-react";
import { uploadMediaFile } from "@/lib/admin/upload";
import { cn } from "@/lib/utils/cn";

/**
 * Membuat area form menerima gambar yang diseret dari laptop. Berkasnya
 * diunggah lewat jalur yang sama dengan tombol "Unggah dari Laptop" (sesi
 * admin diperiksa, jenis berkas dibaca dari isinya, dan masuk ke Media
 * Library), lalu URL-nya diserahkan ke `onUploaded`.
 */
export function ImageDropArea({
  onUploaded,
  folder = "events",
  maxFiles = 1,
  children,
  className,
}: {
  /** Dipanggil satu kali per gambar yang berhasil diunggah. */
  onUploaded: (url: string, fileName: string) => void;
  folder?: string;
  /** Berapa gambar yang boleh dijatuhkan sekaligus; sisanya diabaikan. */
  maxFiles?: number;
  children: ReactNode;
  className?: string;
}) {
  // Dihitung naik-turun: dragenter/dragleave juga menyala untuk tiap elemen
  // anak, jadi satu boolean akan berkedip saat kursor melewati isi area.
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (uploading) return;

    const dropped = Array.from(event.dataTransfer.files);
    const images = dropped.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      setError("Hanya berkas gambar (JPG, PNG, WEBP, AVIF, GIF) yang bisa diunggah di sini.");
      return;
    }
    if (maxFiles <= 0) {
      setError("Jumlah foto sudah mencapai batas. Hapus satu dulu untuk menambah yang baru.");
      return;
    }

    setError(null);
    setUploading(true);
    const skipped = Math.max(0, images.length - maxFiles);
    for (const file of images.slice(0, maxFiles)) {
      const form = new FormData();
      form.set("file", file);
      form.set("folder", folder);
      const result = await uploadMediaFile(form);
      if (!result.ok) {
        setError(result.error);
        continue;
      }
      onUploaded(result.url, result.fileName);
    }
    if (skipped > 0) {
      setError(`${skipped} gambar tidak diunggah karena melebihi batas foto.`);
    }
    setUploading(false);
  }

  return (
    <div
      className={cn("relative", className)}
      onDragEnter={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        // Tanpa ini browser menolak drop dan malah membuka gambarnya di tab.
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (!hasFiles(event)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={(event) => void handleDrop(event)}
    >
      {children}

      {dragging || uploading ? (
        <div
          aria-live="polite"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-brand bg-brand-soft/90 text-center text-sm font-bold text-brand-ink"
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin" aria-hidden />
              Mengunggah…
            </>
          ) : (
            <>
              <Upload className="size-6" aria-hidden />
              Lepaskan gambar di sini untuk mengunggah
            </>
          )}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-brand-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
