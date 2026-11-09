"use client";

import { ImageDropArea } from "@/components/admin/image-drop-area";
import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { MediaPicker } from "@/components/admin/media-picker";
import { TextInput } from "@/components/forms/field";

let rowSeq = 0;
const rowKey = () => `row-${Date.now().toString(36)}-${rowSeq++}`;

const addButtonClass =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm font-semibold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand";

const removeButtonClass =
  "inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-line text-muted transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand";

/**
 * One input per item with its own Hapus button and a "Tambah" button below,
 * instead of a textarea where the admin has to know that every line becomes
 * a separate item. Every row submits under the same `name`; the server
 * action reads them back with `formData.getAll` and drops empty rows.
 */
export function ListInput({
  name,
  initial,
  placeholder,
  addLabel,
  itemLabel,
  compact = false,
}: {
  name: string;
  initial: string[];
  placeholder?: string;
  addLabel: string;
  /** For screen readers, e.g. "Ketentuan" → "Ketentuan 2". */
  itemLabel: string;
  /**
   * Short points (ketentuan, fasilitas): small boxes in two columns, the
   * same layout the public detail page uses for them.
   */
  compact?: boolean;
}) {
  const [rows, setRows] = useState(() =>
    (initial.length > 0 ? initial : [""]).map((value) => ({ key: rowKey(), value })),
  );
  const listRef = useRef<HTMLOListElement>(null);

  function add(afterIndex = rows.length - 1) {
    setRows((current) => [
      ...current.slice(0, afterIndex + 1),
      { key: rowKey(), value: "" },
      ...current.slice(afterIndex + 1),
    ]);
    // Focus the new row once it has rendered.
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelectorAll<HTMLInputElement>("input")
        [afterIndex + 1]?.focus();
    });
  }

  return (
    <div className="space-y-2">
      <ol ref={listRef} className={compact ? "grid gap-2 sm:grid-cols-2" : "space-y-2"}>
        {rows.map((row, index) => (
          <li
            key={row.key}
            className={
              compact
                ? "flex items-center gap-1.5 rounded-xl border border-line bg-canvas-deep/40 p-1.5 pl-2.5"
                : "flex items-center gap-2"
            }
          >
            <span
              aria-hidden
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[0.6875rem] font-bold text-brand"
            >
              {index + 1}
            </span>
            <TextInput
              id={`${name}-${index}`}
              name={name}
              aria-label={`${itemLabel} ${index + 1}`}
              value={row.value}
              placeholder={placeholder}
              className={compact ? "h-10 bg-surface px-3 text-sm" : undefined}
              onChange={(event) =>
                setRows((current) =>
                  current.map((r) => (r.key === row.key ? { ...r, value: event.target.value } : r)),
                )
              }
              onKeyDown={(event) => {
                // Enter adds the next item instead of submitting the whole form.
                if (event.key === "Enter") {
                  event.preventDefault();
                  add(index);
                }
              }}
            />
            <button
              type="button"
              aria-label={`Hapus ${itemLabel.toLowerCase()} ${index + 1}`}
              onClick={() =>
                setRows((current) =>
                  current.length > 1
                    ? current.filter((r) => r.key !== row.key)
                    : [{ key: rowKey(), value: "" }],
                )
              }
              className={
                compact
                  ? "inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand"
                  : removeButtonClass
              }
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => add()} className={addButtonClass}>
        <Plus className="size-4" aria-hidden />
        {addLabel}
      </button>
    </div>
  );
}

export interface AgendaDraft {
  time: string;
  title: string;
}

/** Agenda rows: a short time field next to the activity, no "|" syntax to remember. */
export function AgendaInput({ initial }: { initial: AgendaDraft[] }) {
  const [rows, setRows] = useState(() =>
    (initial.length > 0 ? initial : [{ time: "", title: "" }]).map((item) => ({
      key: rowKey(),
      ...item,
    })),
  );

  function update(key: string, patch: Partial<AgendaDraft>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-2">
      <ol className="space-y-2">
        {rows.map((row, index) => (
          <li key={row.key} className="flex items-center gap-2">
            <TextInput
              id={`agendaTime-${index}`}
              name="agendaTime"
              aria-label={`Jam rundown ${index + 1}`}
              value={row.time}
              placeholder="09.00"
              onChange={(event) => update(row.key, { time: event.target.value })}
              className="w-24 shrink-0 sm:w-28"
            />
            <TextInput
              id={`agendaTitle-${index}`}
              name="agendaTitle"
              aria-label={`Kegiatan rundown ${index + 1}`}
              value={row.title}
              placeholder="Registrasi ulang"
              onChange={(event) => update(row.key, { title: event.target.value })}
            />
            <button
              type="button"
              aria-label={`Hapus rundown ${index + 1}`}
              onClick={() =>
                setRows((current) =>
                  current.length > 1
                    ? current.filter((r) => r.key !== row.key)
                    : [{ key: rowKey(), time: "", title: "" }],
                )
              }
              className={removeButtonClass}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => setRows((current) => [...current, { key: rowKey(), time: "", title: "" }])}
        className={addButtonClass}
      >
        <Plus className="size-4" aria-hidden />
        Tambah rundown
      </button>
    </div>
  );
}

export interface AboutImageDraft {
  src: string;
  alt: string;
}

/** The public "Tentang Event" grid reads best with one to four photos. */
const MAX_ABOUT_IMAGES = 4;

/**
 * Photos for the "Tentang Event" block on the detail page. Left empty, the
 * page falls back to a default photo for the event's category.
 */
export function AboutImagesInput({ initial }: { initial: AboutImageDraft[] }) {
  const [images, setImages] = useState(() => initial.map((image) => ({ key: rowKey(), ...image })));

  function update(key: string, patch: Partial<AboutImageDraft>) {
    setImages((current) => current.map((img) => (img.key === key ? { ...img, ...patch } : img)));
  }

  return (
    <ImageDropArea
      className="space-y-3"
      maxFiles={MAX_ABOUT_IMAGES - images.length}
      onUploaded={(url, fileName) =>
        setImages((current) =>
          current.length >= MAX_ABOUT_IMAGES
            ? current
            : [...current, { key: rowKey(), src: url, alt: fileName }],
        )
      }
    >
      {images.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {images.map((image, index) => (
            <li
              key={image.key}
              className="space-y-3 rounded-card border border-line bg-canvas-deep/30 p-3"
            >
              <input type="hidden" name="aboutImageSrc" value={image.src} />
              <div className="aspect-[1350/1080] overflow-hidden rounded-xl border border-line bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview, dipotong 5:4 seperti di halaman publik */}
                <img src={image.src} alt="" className="size-full object-cover" />
              </div>
              <TextInput
                id={`aboutImageAlt-${index}`}
                name="aboutImageAlt"
                aria-label={`Teks alternatif foto ${index + 1}`}
                placeholder="Jelaskan isi foto"
                value={image.alt}
                onChange={(event) => update(image.key, { alt: event.target.value })}
              />
              <div className="flex flex-wrap items-center gap-2">
                <MediaPicker
                  folder="events"
                  value=""
                  onChange={(url, altText) =>
                    update(image.key, { src: url, alt: altText || image.alt })
                  }
                  label="Ganti foto"
                />
                <button
                  type="button"
                  onClick={() => setImages((current) => current.filter((img) => img.key !== image.key))}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3 text-xs font-semibold text-brand-ink hover:bg-brand-soft"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Hapus foto
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">
          Seret foto ke sini, atau pakai tombol di bawah. Sebelum ada foto, halaman event memakai
          foto bawaan kategori.
        </p>
      )}

      {images.length < MAX_ABOUT_IMAGES ? (
        <MediaPicker
          folder="events"
          value=""
          onChange={(url, altText) =>
            setImages((current) => [...current, { key: rowKey(), src: url, alt: altText }])
          }
          label={images.length > 0 ? "Tambah foto lain" : "Pilih foto"}
        />
      ) : (
        <p className="text-xs text-muted">Maksimal {MAX_ABOUT_IMAGES} foto.</p>
      )}
    </ImageDropArea>
  );
}
