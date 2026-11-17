"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { MediaPicker } from "@/components/admin/media-picker";
import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_NAME_MAX,
  CATEGORY_TONES,
  DEFAULT_CATEGORY_IMAGE,
  type CategoryTone,
} from "@/lib/utils/event-categories";

export interface CategoryRow {
  name: string;
  tone: CategoryTone;
  imageUrl: string;
  imageAlt: string;
  /** Berapa event yang memakai kategori ini. */
  used: number;
}

type Action = (formData: FormData) => void | Promise<void>;

const inputClass = "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink";

/** Isian satu kategori: dipakai untuk menambah dan mengubah. */
function CategoryForm({
  action,
  initial,
  submitLabel,
  onCancel,
}: {
  action: Action;
  initial?: CategoryRow;
  submitLabel: string;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [tone, setTone] = useState<CategoryTone>(initial?.tone ?? "neutral");
  const [image, setImage] = useState({ url: initial?.imageUrl ?? "", alt: initial?.imageAlt ?? "" });

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {initial ? <input type="hidden" name="original" value={initial.name} /> : null}
      <input type="hidden" name="imageUrl" value={image.url} />
      <input type="hidden" name="imageAlt" value={image.alt} />

      <label className="block text-xs font-bold text-ink">
        Nama kategori
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={CATEGORY_NAME_MAX}
          required
          placeholder="mis. Olahraga"
          className={`${inputClass} mt-1`}
        />
        {initial && name.trim() !== initial.name ? (
          <span className="mt-1 block font-normal text-muted">
            Event yang memakai &quot;{initial.name}&quot; ikut berganti nama.
          </span>
        ) : null}
      </label>

      <div className="block text-xs font-bold text-ink">
        Warna lencana
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {CATEGORY_TONES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTone(option.value)}
              aria-pressed={tone === option.value}
              title={option.label}
              className={`rounded-pill p-0.5 ${tone === option.value ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""}`}
            >
              <Badge tone={option.value}>{option.label}</Badge>
            </button>
          ))}
        </div>
        <input type="hidden" name="tone" value={tone} />
        <span className="mt-1.5 block font-normal text-muted">
          Pratinjau: <Badge tone={tone}>{name.trim() || "Nama kategori"}</Badge>
        </span>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <p className="text-xs font-bold text-ink">
          Foto cadangan <span className="font-normal text-muted">(opsional)</span>
        </p>
        <p className="text-xs text-muted">
          Tampil di bagian &quot;Tentang Event&quot; untuk event kategori ini yang belum punya foto sendiri.
          Kosongkan untuk memakai foto umum.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url || DEFAULT_CATEGORY_IMAGE}
            alt=""
            className="h-16 w-20 rounded-lg border border-line object-cover"
          />
          <MediaPicker
            value={image.url}
            onChange={(url, alt) => setImage({ url, alt: alt || name.trim() })}
            folder="events"
          />
          {image.url ? (
            <button
              type="button"
              onClick={() => setImage({ url: "", alt: "" })}
              className="text-xs font-semibold text-muted hover:text-brand"
            >
              Pakai foto umum
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button
          type="submit"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-brand px-4 text-sm font-bold text-white hover:bg-brand-ink"
        >
          {initial ? null : <Plus className="size-4" aria-hidden />}
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-10 items-center rounded-pill border border-line px-4 text-sm font-semibold text-ink-soft"
          >
            Batal
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function CategoryManager({
  rows,
  createAction,
  updateAction,
  moveAction,
  deleteAction,
}: {
  rows: CategoryRow[];
  createAction: Action;
  updateAction: Action;
  moveAction: Action;
  deleteAction: Action;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-line bg-surface p-5 shadow-soft sm:p-6">
        <h2 className="text-base font-extrabold text-ink">Tambah kategori</h2>
        <div className="mt-4">
          <CategoryForm action={createAction} submitLabel="Tambah kategori" />
        </div>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-soft">
        {rows.map((row, index) => (
          <li key={row.name} className="p-4 sm:p-5">
            {editing === row.name ? (
              <CategoryForm
                action={updateAction}
                initial={row}
                submitLabel="Simpan"
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.imageUrl || DEFAULT_CATEGORY_IMAGE}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded-lg border border-line object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Badge tone={row.tone}>{row.name}</Badge>
                  <p className="mt-1 text-xs text-muted">
                    {row.used > 0 ? `${row.used} event memakai kategori ini` : "Belum dipakai event mana pun"}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {(["up", "down"] as const).map((direction) => {
                    const disabled = direction === "up" ? index === 0 : index === rows.length - 1;
                    return (
                      <form key={direction} action={moveAction}>
                        <input type="hidden" name="name" value={row.name} />
                        <input type="hidden" name="direction" value={direction} />
                        <button
                          type="submit"
                          disabled={disabled}
                          aria-label={`${direction === "up" ? "Naikkan" : "Turunkan"} ${row.name}`}
                          className="inline-flex size-9 items-center justify-center rounded-full border border-line text-ink-soft hover:border-brand/40 hover:text-brand disabled:opacity-30"
                        >
                          {direction === "up" ? <ArrowUp className="size-4" aria-hidden /> : <ArrowDown className="size-4" aria-hidden />}
                        </button>
                      </form>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setEditing(row.name)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-line px-3 text-xs font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    Ubah
                  </button>
                  <form action={deleteAction}>
                    <input type="hidden" name="name" value={row.name} />
                    <button
                      type="submit"
                      disabled={row.used > 0}
                      title={row.used > 0 ? "Masih dipakai event. Pindahkan event itu ke kategori lain dulu." : "Hapus kategori"}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-line px-3 text-xs font-semibold text-ink-soft hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      Hapus
                    </button>
                  </form>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
