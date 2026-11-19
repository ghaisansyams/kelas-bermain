"use client";

import { useState } from "react";
import { CalendarClock, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import type { HeroMode } from "@/lib/cms/hero";
import { cn } from "@/lib/utils/cn";
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
export function HeroSlidesEditor({
  initial,
  initialMode,
  autoPreview,
}: {
  initial: HeroSlideDraft[];
  initialMode: HeroMode;
  /** Slide yang akan tampil kalau mode otomatis dipilih, dihitung dari event yang tayang. */
  autoPreview: HeroSlideDraft[];
}) {
  const [mode, setMode] = useState<HeroMode>(initialMode);
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
      <input type="hidden" name="hero_slides.mode" value={mode} />

      <div role="radiogroup" aria-label="Cara mengisi banner" className="grid gap-3">
        {(
          [
            {
              value: "auto",
              title: "Otomatis dari event (disarankan)",
              text: "Banner mengambil event yang sedang tayang. Yang tanggalnya paling dekat tampil paling depan, event baru langsung masuk, dan event yang sudah lewat keluar sendiri. Foto banner = foto sampul event.",
              icon: CalendarClock,
            },
            {
              value: "manual",
              title: "Atur sendiri",
              text: "Pilih gambar, judul, tanggal, dan tujuan klik untuk setiap slide. Tidak berubah sampai kamu mengeditnya lagi.",
              icon: SlidersHorizontal,
            },
          ] as const
        ).map((choice) => {
          const Icon = choice.icon;
          const active = mode === choice.value;
          return (
            <label
              key={choice.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-card border-2 p-3.5 transition-colors",
                active ? "border-pine bg-pine-soft/60" : "border-line bg-surface hover:border-brand/40",
              )}
            >
              <input
                type="radio"
                name="hero-mode-choice"
                value={choice.value}
                checked={active}
                onChange={() => setMode(choice.value)}
                className="mt-1 size-4"
              />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
                  <Icon className="size-4" aria-hidden />
                  {choice.title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{choice.text}</span>
              </span>
            </label>
          );
        })}
      </div>

      {mode === "auto" ? (
        <div className="rounded-card border border-line bg-canvas-deep/30 p-4">
          <p className="text-sm font-extrabold text-ink">Yang tampil di banner sekarang</p>
          {autoPreview.length > 0 ? (
            <ol className="mt-3 space-y-2.5">
              {autoPreview.map((slide, index) => (
                <li key={slide.id} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
                  <img src={slide.image} alt="" className="h-12 w-16 shrink-0 rounded-lg border border-line object-cover" />
                  <span className="min-w-0 text-sm">
                    <span className="block truncate font-bold text-ink">
                      {index + 1}. {slide.title}
                    </span>
                    <span className="block text-xs text-muted">
                      {slide.date}
                      {slide.location ? ` · ${slide.location}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-xs text-muted">
              Belum ada event tayang yang punya foto sampul, jadi banner memakai gambar bawaan.
            </p>
          )}
          <p className="mt-3 text-xs text-muted">
            Maksimal 5 event. Foto dan judulnya diubah dari menu Event, bukan di sini.
          </p>
        </div>
      ) : null}

      {mode === "manual" ? slides.map((slide, index) => (
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
      )) : null}

      {mode === "manual" ? (
        <button
          type="button"
          onClick={() => setSlides((current) => [...current, emptySlide()])}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm font-semibold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
        >
          <Plus className="size-4" aria-hidden />
          Tambah slide
        </button>
      ) : null}
    </div>
  );
}
