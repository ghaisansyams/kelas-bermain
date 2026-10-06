"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import type { HeroSlide } from "@/data/hero-slides";
import { cn } from "@/lib/utils/cn";

const AUTOPLAY_MS = 4500;
const RESUME_AFTER_MS = 6000;
const SWIPE_THRESHOLD_PX = 40;

/**
 * Autoplay hero carousel. Cross-fades with a subtle scale rather than a hard
 * horizontal slide, so it reads as a photo gallery rather than an ad banner.
 * Pauses on hover/focus and after any manual interaction, then resumes; fully
 * static under prefers-reduced-motion.
 */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotionRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused || reducedMotionRef.current || slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  const pauseThenResume = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), RESUME_AFTER_MS);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % slides.length) + slides.length) % slides.length);
      pauseThenResume();
    },
    [slides.length, pauseThenResume],
  );

  const active = slides[index];
  if (!active) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        if (Math.abs(delta) > SWIPE_THRESHOLD_PX) {
          goTo(index + (delta < 0 ? 1 : -1));
        }
        touchStartX.current = null;
      }}
    >
      <div className="relative aspect-[5/4] overflow-hidden rounded-[1.75rem] bg-canvas-deep shadow-lift sm:aspect-[4/3.2] sm:rounded-[2rem] lg:aspect-[6/5]">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            aria-hidden={i !== index}
            className={cn(
              "absolute inset-0 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
              i === index ? "scale-100 opacity-100" : "scale-[1.03] opacity-0",
            )}
          >
            <Image
              src={slide.image}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="h-full w-full object-cover"
            />
          </div>
        ))}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/30 via-transparent to-transparent"
        />

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Slide sebelumnya"
              onClick={() => goTo(index - 1)}
              className="absolute left-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-ink shadow-soft backdrop-blur-sm transition hover:bg-surface sm:flex"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Slide berikutnya"
              onClick={() => goTo(index + 1)}
              className="absolute right-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-ink shadow-soft backdrop-blur-sm transition hover:bg-surface sm:flex"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>

            <div
              role="tablist"
              aria-label="Pilih slide hero"
              className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5"
            >
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Slide ${i + 1}: ${slide.title}`}
                  onClick={() => goTo(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/70",
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <Link
        href={`/event/${active.eventSlug}`}
        className={cn(
          "group absolute -bottom-5 left-3 right-3 flex items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3.5 shadow-lift backdrop-blur-md",
          "transition-transform duration-300 hover:-translate-y-0.5",
          "sm:left-5 sm:right-auto sm:max-w-xs",
        )}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <CalendarDays className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.625rem] font-bold uppercase tracking-[0.14em] text-brand">
            Kelas terdekat
          </span>
          <span className="mt-0.5 block truncate text-sm font-bold text-ink">{active.title}</span>
          <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
            <MapPin className="size-3" aria-hidden />
            {active.date} · {active.location}
          </span>
        </span>
        <ArrowRight
          className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </div>
  );
}
