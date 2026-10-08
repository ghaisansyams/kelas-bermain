import { ExternalLink, FolderOpen } from "lucide-react";
import { saveGalleryDriveAction } from "@/app/admin/cms/website-actions";
import type { GalleryDriveSettings } from "@/lib/services/gallery-settings";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-[0.9375rem] font-medium text-ink";

/**
 * The gallery's Google Drive folder.
 *
 * Its own card rather than a section buried in the page builder — the link
 * changes often and is the only thing the gallery page shows, so it should
 * be findable at a glance.
 */
export function GalleryDriveEditor({ value }: { value: GalleryDriveSettings }) {
  return (
    <form action={saveGalleryDriveAction} className="space-y-4">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
          <FolderOpen className="size-4 text-brand" aria-hidden />
          Galeri — Folder Google Drive
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Satu folder dipakai halaman Galeri dan halaman depan. Ganti tautannya di sini, keduanya
          ikut berubah.
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Tautan folder Google Drive
        <input
          name="url"
          type="url"
          defaultValue={value.url}
          placeholder="https://drive.google.com/drive/folders/…"
          className={inputClass}
        />
        <span className="text-xs font-medium text-muted">
          Buka folder di Drive → Bagikan → ubah ke <strong>Siapa saja yang memiliki link</strong>,
          lalu salin tautannya ke sini. Kalau masih Terbatas, orang tua akan diminta login dan
          gagal membukanya.
        </span>
      </label>

      {value.url ? (
        <a
          href={value.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-line px-3 text-xs font-bold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
        >
          Coba buka folder yang sekarang
          <ExternalLink className="size-3" aria-hidden />
        </a>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          Tulisan tombol
          <input
            name="buttonLabel"
            defaultValue={value.buttonLabel}
            placeholder="Buka Google Drive"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          Terakhir diperbarui
          <input
            name="updatedAt"
            defaultValue={value.updatedAt}
            placeholder="2026-10-08"
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Judul kartu
        <input name="title" defaultValue={value.title} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Keterangan
        <textarea
          name="description"
          defaultValue={value.description}
          rows={3}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[0.9375rem] leading-relaxed font-medium text-ink"
        />
      </label>

      <button
        type="submit"
        className="inline-flex min-h-11 items-center rounded-pill bg-brand px-5 text-sm font-bold text-white"
      >
        Simpan Tautan Galeri
      </button>
    </form>
  );
}
