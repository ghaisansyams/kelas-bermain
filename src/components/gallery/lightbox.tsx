"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryItem } from "@/lib/types";
import { formatDate } from "@/lib/utils/date";

export function Lightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const item = items[index];

  const goPrev = useCallback(() => {
    onNavigate((index - 1 + items.length) % items.length);
  }, [index, items.length, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate((index + 1) % items.length);
  }, [index, items.length, onNavigate]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, goPrev, goNext]);

  if (!item) return null;

  const detailHref = item.eventSlug
    ? `/event/${item.eventSlug}`
    : item.activitySlug
      ? `/kegiatan/${item.activitySlug}`
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Pratinjau foto: ${item.title}`}
      className="fixed inset-0 z-[60] flex flex-col bg-ink/95 backdrop-blur-sm motion-safe:animate-fade-up"
    >
      {/* Click-away layer sits behind the content. */}
      <button
        type="button"
        aria-label="Tutup pratinjau"
        onClick={onClose}
        className="absolute inset-0 -z-10 size-full cursor-default"
        tabIndex={-1}
      />

      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <span className="rounded-pill bg-white/10 px-3 py-1 text-xs font-bold tabular-nums text-white/80">
          {index + 1} / {items.length}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Tutup pratinjau"
          className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Foto sebelumnya"
          className="absolute left-2 z-10 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-4 sm:size-12"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </button>

        <div className="relative flex max-h-full w-full items-center justify-center">
          <Image
            key={item.id}
            src={item.image.src}
            alt={item.image.alt}
            width={item.image.width ?? 1200}
            height={item.image.height ?? 800}
            sizes="(max-width: 640px) 100vw, 80vw"
            className="max-h-[62vh] w-auto max-w-full rounded-xl object-contain motion-safe:animate-fade-up sm:max-h-[68vh]"
            priority
          />
        </div>

        <button
          type="button"
          onClick={goNext}
          aria-label="Foto berikutnya"
          className="absolute right-2 z-10 inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-4 sm:size-12"
        >
          <ChevronRight className="size-6" aria-hidden />
        </button>
      </div>

      <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sun">
            {item.category} · {formatDate(item.date)}
          </p>
          <h2 className="mt-1.5 text-lg font-extrabold text-white sm:text-xl">{item.title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-white/70">{item.caption}</p>
          {detailHref ? (
            <Link
              href={detailHref}
              className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              Lihat {item.eventSlug ? "event" : "kegiatan"} terkait
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
