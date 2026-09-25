"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/**
 * The image collage in the "Cara ikut" section.
 *
 * Same four photos, same 2×2 grid, same spacing — motion only.
 *
 * The motion character is borrowed from the Sari Roti careers section, which
 * gets its life from two photo columns moving continuously in *opposite*
 * directions at a calm, even pace — not from parallax. Here the left column
 * drifts up and the right drifts down as the section passes, each tile on its
 * own depth so the grid never reads as one object.
 *
 * Three inputs are composed into a single transform per tile, in one rAF loop:
 *
 *   scroll   how far the section has travelled through the viewport
 *   idle     a slow sway so the section stays alive once scrolling stops
 *   pointer  a few px of follow on fine-pointer devices
 *
 * The scroll and pointer parts are eased toward their target each frame rather
 * than snapped, which is what gives the movement weight instead of feeling
 * wired directly to the scrollbar. Reveal stays a separate CSS transition on an
 * outer element so the two never overwrite each other.
 */

type Direction = -1 | 1;

interface Tile {
  key: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  aspect: string;
  /** -1 drifts up as the page scrolls down, 1 drifts down. */
  direction: Direction;
  /**
   * Travel at the extremes of the progress range. A tile is only ever on
   * screen for roughly the middle ±0.55 of that range, so perceived travel is
   * about `scrollDepth` in total, not `2 × scrollDepth`.
   */
  scrollDepth: number;
  /** Pointer follow, in px. */
  pointerDepth: number;
  /** Idle sway amplitude in px, and its period in ms. */
  idleAmplitude: number;
  idlePeriod: number;
  idlePhase: number;
  /** Degrees of tilt across the full scroll range. Deliberately tiny. */
  tilt: number;
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
    direction: -1,
    scrollDepth: 20,
    pointerDepth: 4,
    idleAmplitude: 2.6,
    idlePeriod: 9200,
    idlePhase: 0,
    tilt: 0.3,
    revealDelay: 0,
  },
  {
    key: "left-bottom",
    src: "/images/galeri-04.jpg",
    alt: "Anak-anak mewarnai batu di meja prakarya",
    width: 1200,
    height: 675,
    aspect: "aspect-square",
    direction: -1,
    scrollDepth: 15,
    pointerDepth: 6,
    idleAmplitude: 1.8,
    idlePeriod: 11400,
    idlePhase: 1.9,
    tilt: -0.24,
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
    direction: 1,
    scrollDepth: 18,
    pointerDepth: 3,
    idleAmplitude: 2.2,
    idlePeriod: 10300,
    idlePhase: 3.1,
    tilt: -0.3,
    revealDelay: 60,
  },
  {
    key: "right-bottom",
    src: "/images/galeri-13.jpg",
    alt: "Aneka sayuran segar hasil panen peserta",
    width: 1200,
    height: 802,
    aspect: "aspect-[4/5]",
    direction: 1,
    scrollDepth: 13,
    pointerDepth: 5,
    idleAmplitude: 1.6,
    idlePeriod: 12600,
    idlePhase: 4.6,
    tilt: 0.22,
    revealDelay: 180,
  },
];

const TILES = [...LEFT_COLUMN, ...RIGHT_COLUMN];

/** Phones get roughly half the travel, per the brief. */
const MOBILE_SCALE = 0.45;
const MOBILE_BREAKPOINT = 640;
/** Per-frame approach rate. Lower trails more. */
const EASING = 0.12;

export function JoinStepsCollage({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const motionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  /* --- Reveal: once, on entry ---------------------------------------- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const tiles = [...tileRefs.current.values()];
    const show = () => {
      for (const tile of tiles) tile.dataset.shown = "true";
    };

    // Tiles render visible, so no JS or a failed observer still shows the
    // photos. Only hide them once we know the reveal can actually run.
    for (const tile of tiles) {
      tile.classList.add("collage-tile");
      tile.dataset.shown = "false";
    }

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

  /* --- Motion: scroll + idle + pointer, one loop ---------------------- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const layers = TILES.map((tile) => ({
      tile,
      el: motionRefs.current.get(tile.key),
    })).filter((entry): entry is { tile: Tile; el: HTMLDivElement } =>
      Boolean(entry.el),
    );
    if (layers.length === 0) return;

    const eased = new Map(TILES.map((t) => [t.key, { x: 0, y: 0 }]));
    let pointerX = 0;
    let pointerY = 0;
    let frame = 0;
    let running = false;

    const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT;

    const render = (now: number) => {
      // Read layout once, then only write transforms on children — so the
      // read never has to be re-done inside the same frame.
      const rect = root.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const centre = rect.top + rect.height / 2;
      // -1 while entering from below, 0 centred, +1 once past the top.
      const progress = Math.max(
        -1,
        Math.min(1, (viewport / 2 - centre) / ((viewport + rect.height) / 2)),
      );
      const amount = isMobile() ? MOBILE_SCALE : 1;

      for (const { tile, el } of layers) {
        const current = eased.get(tile.key);
        if (!current) continue;

        const targetY =
          tile.direction * progress * tile.scrollDepth * amount +
          pointerY * tile.pointerDepth;
        const targetX = pointerX * tile.pointerDepth;

        current.y += (targetY - current.y) * EASING;
        current.x += (targetX - current.x) * EASING;

        // The sway is already smooth, so it is added after the easing rather
        // than chased by it.
        const sway =
          Math.sin((now / tile.idlePeriod) * Math.PI * 2 + tile.idlePhase) *
          tile.idleAmplitude *
          amount;
        const tilt = tile.direction * progress * tile.tilt;

        el.style.transform = `translate3d(${current.x.toFixed(2)}px, ${(current.y + sway).toFixed(2)}px, 0) rotate(${tilt.toFixed(3)}deg)`;
      }

      if (running) frame = requestAnimationFrame(render);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(render);
    };
    const stop = () => {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    // Only animate while the section is on screen — no work, and no battery
    // drain, for a section nobody is looking at.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) start();
          else stop();
        }
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(root);

    const finePointer = window.matchMedia("(pointer: fine)");
    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };
    const onPointerLeave = () => {
      pointerX = 0;
      pointerY = 0;
    };

    // Touch devices get scroll and sway only. Device orientation is left out
    // deliberately: on iOS it needs a permission prompt, which is far too much
    // friction for decoration.
    if (finePointer.matches) {
      root.addEventListener("pointermove", onPointerMove);
      root.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      observer.disconnect();
      stop();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
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
      data-from={tile.direction === -1 ? "below" : "above"}
      style={{ "--reveal-delay": `${tile.revealDelay}ms` } as React.CSSProperties}
    >
      <div
        ref={(node) => {
          if (node) motionRefs.current.set(tile.key, node);
          else motionRefs.current.delete(tile.key);
        }}
        className="collage-motion"
      >
        <div className="group overflow-hidden rounded-[1.5rem] bg-canvas-deep shadow-soft transition-shadow duration-300 hover:shadow-lift">
          <Image
            src={tile.src}
            alt={tile.alt}
            width={tile.width}
            height={tile.height}
            sizes="(max-width: 1024px) 45vw, 28vw"
            className={`${tile.aspect} w-full object-cover transition-transform duration-[350ms] ease-out group-hover:scale-[1.02]`}
          />
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
