"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { MediaPicker } from "@/components/admin/media-picker";
import { Field, TextInput } from "@/components/forms/field";

export interface HeroSlideDraft {
  id: string;
  image: string;
  alt: string;
  title: string;
  date: string;
  location: string;
  eventSlug: string;
}

function emptySlide(): HeroSlideDraft {
  return {
    id: `slide-${Date.now()}`,
    image: "",
    alt: "",
    title: "",
    date: "",
    location: "",
    eventSlug: "",
  };
}

/**
 * Hero carousel editor. Keeps the slides in local state and submits them as
 * JSON in a hidden field, so adding or removing a slide never needs a round
 * trip to the server.
 */
export function HeroSlidesEditor({ initial }: { initial: HeroSlideDraft[] }) {
  const [slides, setSlides] = useState<HeroSlideDraft[]>(
    initial.length > 0 ? initial : [emptySlide()],
  );

  function update(index: number, patch: Partial<HeroSlideDraft>) {
    setSlides((current) =>
      current.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)),
    );
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="hero_slides.json" value={JSON.stringify(slides)} />

      {slides.map((slide, index) => (
        <div key={slide.id} className="rounded-card border border-line bg-canvas-deep/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-extrabold text-ink">Slide {index + 1}</span>
            {slides.length > 1 ? (
              <button
                type="button"
                onClick={() => setSlides((current) => current.filter((_, i) => i !== index))}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3 text-xs font-semibold text-brand-ink hover:bg-brand-soft"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Hapus
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[10rem_1fr]">
            <div className="space-y-2">
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-line bg-surface">
                {slide.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin preview, may be a remote URL
                  <img src={slide.image} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-xs text-muted">
                    Belum ada gambar
                  </span>
                )}
              </div>
              <MediaPicker
              folder="hero"
                value={slide.image}
                onChange={(url, altText) =>
                  update(index, { image: url, alt: altText || slide.alt })
                }
                label={slide.image ? "Ganti gambar" : "Pilih gambar"}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Judul slide" htmlFor={`slide-title-${index}`}>
                <TextInput
                  id={`slide-title-${index}`}
                  value={slide.title}
                  onChange={(event) => update(index, { title: event.target.value })}
                />
              </Field>
              <Field label="Tanggal" htmlFor={`slide-date-${index}`} hint="Contoh: 4 Oktober 2026">
                <TextInput
                  id={`slide-date-${index}`}
                  value={slide.date}
                  onChange={(event) => update(index, { date: event.target.value })}
                />
              </Field>
              <Field label="Lokasi" htmlFor={`slide-location-${index}`}>
                <TextInput
                  id={`slide-location-${index}`}
                  value={slide.location}
                  onChange={(event) => update(index, { location: event.target.value })}
                />
              </Field>
              <Field
                label="Slug event"
                htmlFor={`slide-slug-${index}`}
                hint="Tujuan saat kartu diklik, contoh: pemadam-cilik-oktober-2026"
              >
                <TextInput
                  id={`slide-slug-${index}`}
                  value={slide.eventSlug}
                  onChange={(event) => update(index, { eventSlug: event.target.value })}
                />
              </Field>
              <Field
                label="Teks alternatif gambar"
                htmlFor={`slide-alt-${index}`}
                hint="Dibaca pembaca layar. Jelaskan isi fotonya."
                className="sm:col-span-2"
              >
                <TextInput
                  id={`slide-alt-${index}`}
                  value={slide.alt}
                  onChange={(event) => update(index, { alt: event.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setSlides((current) => [...current, emptySlide()])}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm font-semibold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
      >
        <Plus className="size-4" aria-hidden />
        Tambah slide
      </button>
    </div>
  );
}
