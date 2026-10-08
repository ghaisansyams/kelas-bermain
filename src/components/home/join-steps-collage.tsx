"use client";

import Image from "next/image";

/**
 * The photo collage beside "Cara ikut".
 *
 * Two columns of real class photos drifting slowly in opposite directions,
 * looping forever. The pace is deliberately unhurried — this sits next to
 * instructions somebody is trying to read, so it should feel alive without
 * competing for attention.
 *
 * Why a loop rather than a tall stack: eight portrait photos stacked would
 * make this column twice the height of the text beside it. A fixed-height
 * window with the strip looping inside keeps the section balanced while
 * still showing every photo.
 *
 * The strip is rendered twice back to back and translated by exactly half its
 * height, so the seam lands on an identical frame and the loop is invisible.
 * Motion is pure CSS, so it costs no JavaScript and stops dead for anyone who
 * has asked for reduced motion.
 */

interface Photo {
  src: string;
  alt: string;
}

const LEFT: Photo[] = [
  { src: "/images/cara-ikut/kb-01.jpg", alt: "Anak berpose di depan pesawat latih saat Hangar Explore" },
  { src: "/images/cara-ikut/kb-03.jpg", alt: "Anak memanjat dinding panjat ditemani pendamping" },
  { src: "/images/cara-ikut/kb-05.jpg", alt: "Anak-anak mencelupkan cokelat di kelas Cocoa Maker" },
  { src: "/images/cara-ikut/kb-07.jpg", alt: "Anak menyeberangi jembatan tali di kelas alam" },
];

const RIGHT: Photo[] = [
  { src: "/images/cara-ikut/kb-02.jpg", alt: "Anak berseragam loreng di kendaraan taktis saat Tentara Cilik" },
  { src: "/images/cara-ikut/kb-04.jpg", alt: "Anak mengamati buah kakao sebelum diolah jadi cokelat" },
  { src: "/images/cara-ikut/kb-06.jpg", alt: "Anak menanam bibit jagung di kelas Little Farmer" },
  { src: "/images/cara-ikut/kb-10.jpg", alt: "Anak melambai dari dalam mobil pemadam kebakaran" },
];

function Column({
  photos,
  direction,
  duration,
}: {
  photos: Photo[];
  /** "up" drifts upward, "down" downward. */
  direction: "up" | "down";
  /** Seconds for one full pass. Longer is calmer. */
  duration: number;
}) {
  // Doubled so the strip can loop without a visible jump.
  const strip = [...photos, ...photos];

  return (
    <div className="kb-marquee" style={{ ["--kb-duration" as string]: `${duration}s` }}>
      <div className={`kb-marquee-track ${direction === "up" ? "kb-up" : "kb-down"}`}>
        {strip.map((photo, index) => (
          <div
            key={`${photo.src}-${index}`}
            className="relative overflow-hidden rounded-card bg-canvas-deep shadow-soft"
            style={{ aspectRatio: "4 / 5" }}
          >
            <Image
              src={photo.src}
              // The second copy is decorative; only the first set is announced.
              alt={index < photos.length ? photo.alt : ""}
              fill
              sizes="(max-width: 640px) 44vw, (max-width: 1024px) 28vw, 20vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function JoinStepsCollage({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div
        className="kb-marquee-mask grid grid-cols-2 gap-4"
        aria-label="Foto kegiatan Kelas Bermain"
      >
        <Column photos={LEFT} direction="up" duration={46} />
        <Column photos={RIGHT} direction="down" duration={54} />
      </div>
    </div>
  );
}
