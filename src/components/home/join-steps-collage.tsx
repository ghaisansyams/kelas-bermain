"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * The image collage in the "Cara ikut" section.
 *
 * Same four photos, same 2×2 grid, same spacing — motion only. Each tile is
 * built from three nested layers so no two transforms ever fight:
 *
 *   .collage-tile   reveal (fade + slide, once per entry)
 *     .parallax-layer  pointer parallax, written imperatively
 *       .float-tile      the endless drift (pure CSS)
 *         <Image>          hover scale
 *
 * Left tiles drift up, right tiles drift down, each on its own duration so the
 * grid never reads as one object moving. Everything animates `transform` and
 * `opacity` only, so there is no layout work per frame.
 */

interface Tile {
  key: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  aspect: string;
  /** Which way it drifts, and therefore which way it reveals from. */
  direction: "up" | "down";
  duration: string;
  /** Negative, so tiles start already out of phase instead of in lockstep. */
  delay: string;
  /** Pointer-parallax travel in px — kept inside the 5–8px the brief allows. */
  depth: number;
  revealDelay: number;
}

const LEFT_COLUMN: Tile[] = [
  {
    key: "left-top",
    src: "/images/galeri-01.jpg",
    alt: "Tiga anak kecil berpelukan sambil tertawa",
    width: 1200,
    height: 800,
    aspect: "aspect-[4/5]",
    direction: "up",
    duration: "6s",
    delay: "0s",
    depth: 6,
    revealDelay: 0,
  },
  {
    key: "left-bottom",
    src: "/images/galeri-04.jpg",
    alt: "Anak-anak mewarnai batu di meja prakarya",
    width: 1200,
    height: 675,
    aspect: "aspect-square",
    direction: "up",
    duration: "7.5s",
    delay: "-2s",
    depth: 4,
    revealDelay: 120,
  },
];

const RIGHT_COLUMN: Tile[] = [
  {
    key: "right-top",
    src: "/images/galeri-14.jpg",
    alt: "Kue kecil yang sudah dihias peserta",
    width: 1200,
    height: 857,
    aspect: "aspect-square",
    direction: "down",
    duration: "7s",
    delay: "-1s",
    depth: 5,
    revealDelay: 60,
  },
  {
    key: "right-bottom",
    src: "/images/galeri-13.jpg",
    alt: "Aneka sayuran segar hasil panen peserta",
    width: 1200,
    height: 802,
    aspect: "aspect-[4/5]",
    direction: "down",
    duration: "8s",
    delay: "-3s",
    depth: 7,
    revealDelay: 180,
  },
];

const ALL_TILES = [...LEFT_COLUMN, ...RIGHT_COLUMN];

export function JoinStepsCollage({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const parallaxRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  /* --- Reveal, once per viewport entry ------------------------------- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tiles = [...tileRefs.current.values()];

    // Tiles render visible, so a failed observer or no JS still shows the
    // photos. Only arm the hidden state once we know we can animate.
    if (reduced || typeof IntersectionObserver === "undefined") return;

    const show = () => {
      for (const tile of tiles) tile.dataset.shown = "true";
    };

    for (const tile of tiles) {
      tile.classList.add("collage-tile");
      tile.dataset.shown = "false";
    }

    // Already on screen at mount — reveal on the next frame rather than
    // waiting for a scroll that may never come.
    if (root.getBoundingClientRect().top < window.innerHeight * 0.9) {
      requestAnimationFrame(show);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show();
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  /* --- Pointer parallax, desktop only -------------------------------- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(pointer: fine)");
    // Touch devices get the float only. Device orientation is deliberately not
    // used: on iOS it needs an explicit permission prompt, which is far too
    // much friction for a decorative effect.
    if (reduced.matches || !finePointer.matches) return;

    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    const apply = () => {
      frame = 0;
      if (!pending) return;
      const { x, y } = pending;
      for (const tile of ALL_TILES) {
        const layer = parallaxRefs.current.get(tile.key);
        if (!layer) continue;
        layer.style.transform = `translate3d(${(x * tile.depth).toFixed(2)}px, ${(y * tile.depth).toFixed(2)}px, 0)`;
      }
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    const onMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      // Normalised to -1..1 from the centre of the collage.
      pending = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: ((event.clientY - rect.top) / rect.height) * 2 - 1,
      };
      schedule();
    };

    const onLeave = () => {
      pending = { x: 0, y: 0 };
      schedule();
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
      onLeave();
    };
  }, []);

  const renderTile = (tile: Tile) => (
    <div
      key={tile.key}
      ref={(node) => {
        if (node) tileRefs.current.set(tile.key, node);
        else tileRefs.current.delete(tile.key);
      }}
      data-tilekey={tile.key}
      data-from={tile.direction === "up" ? "below" : "above"}
      style={{ "--reveal-delay": `${tile.revealDelay}ms` } as React.CSSProperties}
    >
      <div
        ref={(node) => {
          if (node) parallaxRefs.current.set(tile.key, node);
          else parallaxRefs.current.delete(tile.key);
        }}
        className="parallax-layer"
      >
        <div
          className={cn(
            "float-tile",
            tile.direction === "up" ? "float-up" : "float-down",
          )}
          style={{ animationDuration: tile.duration, animationDelay: tile.delay }}
        >
          <div className="group overflow-hidden rounded-[1.5rem] bg-canvas-deep shadow-soft transition-shadow duration-300 hover:shadow-lift">
            <Image
              src={tile.src}
              alt={tile.alt}
              width={tile.width}
              height={tile.height}
              sizes="(max-width: 1024px) 45vw, 28vw"
              className={cn(
                tile.aspect,
                "w-full object-cover transition-transform duration-[350ms] ease-out group-hover:scale-[1.02]",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} data-collage className={className}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">{LEFT_COLUMN.map(renderTile)}</div>
        <div className="space-y-4 pt-8">{RIGHT_COLUMN.map(renderTile)}</div>
      </div>
    </div>
  );
}
