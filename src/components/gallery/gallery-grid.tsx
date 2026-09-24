"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ImageOff, Maximize2 } from "lucide-react";
import { Lightbox } from "@/components/gallery/lightbox";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { GalleryCategory, GalleryItem } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDateShort } from "@/lib/utils/date";

const CATEGORIES: (GalleryCategory | "Semua")[] = [
  "Semua",
  "Event",
  "Kegiatan",
  "Kreatif",
  "Kuliner",
];

/**
 * Public gallery grid. No sign-in, no gating — every visitor sees everything.
 */
export function GalleryGrid({
  items,
  showFilter = true,
}: {
  items: GalleryItem[];
  showFilter?: boolean;
}) {
  const [category, setCategory] = useState<GalleryCategory | "Semua">("Semua");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () => (category === "Semua" ? items : items.filter((item) => item.category === category)),
    [items, category],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>([["Semua", items.length]]);
    for (const item of items) {
      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const available = CATEGORIES.filter((value) => (counts.get(value) ?? 0) > 0);

  return (
    <div>
      {showFilter ? (
        <div
          role="group"
          aria-label="Saring galeri berdasarkan kategori"
          className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {available.map((value) => {
            const active = category === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setCategory(value);
                  setOpenIndex(null);
                }}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-pill px-4 text-sm font-semibold transition-colors duration-200",
                  active ? "bg-ink text-canvas" : "bg-canvas-deep text-ink-soft hover:bg-line-soft",
                )}
              >
                {value}
                <span
                  className={cn(
                    "rounded-pill px-1.5 py-0.5 text-[0.6875rem] font-bold tabular-nums",
                    active ? "bg-white/15 text-canvas" : "bg-surface text-muted",
                  )}
                >
                  {counts.get(value) ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {showFilter ? (
        <p className="mt-6 text-sm text-muted" aria-live="polite">
          Menampilkan <span className="font-bold text-ink">{filtered.length}</span> dari{" "}
          {items.length} foto
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<ImageOff className="size-6" aria-hidden />}
          title="Belum ada foto di kategori ini"
          description="Dokumentasi untuk kategori ini sedang kami siapkan."
          action={
            <Button variant="secondary" size="sm" onClick={() => setCategory("Semua")}>
              Tampilkan semua foto
            </Button>
          }
        />
      ) : (
        <ul
          key={category}
          className="masonry mt-6 columns-2 sm:columns-3 lg:columns-4"
        >
          {filtered.map((item, index) => (
            <li key={item.id} className="motion-safe:animate-fade-up" style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}>
              <button
                type="button"
                onClick={() => setOpenIndex(index)}
                aria-label={`Buka foto: ${item.title}`}
                className="group relative block w-full overflow-hidden rounded-2xl bg-canvas-deep text-left"
              >
                <Image
                  src={item.image.src}
                  alt={item.image.alt}
                  width={item.image.width ?? 1200}
                  height={item.image.height ?? 800}
                  sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 23vw"
                  loading={index < 6 ? "eager" : "lazy"}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
                <span className="absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                  <span className="block text-[0.6875rem] font-bold uppercase tracking-wider text-sun">
                    {item.category} · {formatDateShort(item.date)}
                  </span>
                  <span className="mt-0.5 block text-sm font-bold leading-snug text-white">
                    {item.title}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="absolute right-2.5 top-2.5 inline-flex size-8 items-center justify-center rounded-full bg-surface/90 text-ink opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <Maximize2 className="size-4" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {openIndex !== null ? (
        <Lightbox
          items={filtered}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      ) : null}
    </div>
  );
}
