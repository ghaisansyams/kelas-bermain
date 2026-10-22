"use client";

import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";

/**
 * Bukti transfer: gambar kecil di tabel, klik untuk membuka pop-up di halaman
 * yang sama. Sebelumnya tautannya membuka berkas langsung di tab baru, tanpa
 * tombol tutup — admin terjebak di gambar. Pop-up ini bisa ditutup dengan
 * tombol X, tombol Esc, atau klik di luar gambar.
 */
export function ProofViewer({ url, isPdf }: { url: string; isPdf: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-fit text-left"
        aria-label="Lihat bukti transfer"
      >
        {isPdf ? (
          <span className="text-xs font-bold text-brand hover:underline">Lihat PDF</span>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Bukti transfer yang dikirim pendaftar"
              className="h-16 w-16 rounded-lg border border-line object-cover transition-transform hover:scale-105"
            />
            <span className="mt-1 block text-xs font-bold text-brand">Perbesar</span>
          </>
        )}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bukti transfer"
          className="fixed inset-0 z-[100] flex flex-col bg-black/80 p-3 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="mb-3 flex items-center justify-end gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-white/15 px-4 text-sm font-semibold text-white hover:bg-white/25"
            >
              <ExternalLink className="size-4" aria-hidden />
              Buka di tab baru
            </a>
            <button
              type="button"
              onClick={() => setOpen(false)}
              autoFocus
              className="inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-white px-4 text-sm font-bold text-ink hover:bg-white/90"
            >
              <X className="size-4" aria-hidden />
              Tutup
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            {isPdf ? (
              <iframe
                src={url}
                title="Bukti transfer"
                className="h-full w-full max-w-4xl rounded-lg bg-white"
                onClick={(event) => event.stopPropagation()}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt="Bukti transfer yang dikirim pendaftar"
                className="max-h-full max-w-full rounded-lg object-contain"
                onClick={(event) => event.stopPropagation()}
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
