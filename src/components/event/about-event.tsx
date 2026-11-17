import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";
import type { EventView } from "@/lib/types";
import {
  ABOUT_IMAGE_HEIGHT,
  ABOUT_IMAGE_WIDTH,
  resolveAboutEvent,
} from "@/lib/utils/about-event";

/**
 * Visual-first "Tentang Event": a photo (or a small gallery of them) before
 * any text, so a parent understands the class at a glance and reads the
 * description second. See `resolveAboutEvent` for how the image and
 * description fall back when an event hasn't set its own.
 */
export function AboutEvent({
  event,
}: {
  event: Pick<EventView, "description" | "aboutEvent" | "categoryImage">;
}) {
  const { description, images } = resolveAboutEvent(event);

  return (
    <div className="space-y-5">
      <div
        className={
          images.length > 1
            ? "grid gap-3 sm:grid-cols-2"
            : "grid gap-3"
        }
      >
        {images.map((image, index) => (
          <Reveal key={image.src} delay={index * 90} className="group overflow-hidden rounded-card">
            {/* 1350 × 1080 (5:4) di semua layar. Foto dengan rasio lain dipotong
                dari tengah, jadi bentuknya seragam di semua event. */}
            <div className="aspect-[1350/1080] overflow-hidden">
              <Image
                src={image.src}
                alt={image.alt}
                width={ABOUT_IMAGE_WIDTH}
                height={ABOUT_IMAGE_HEIGHT}
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority={index === 0}
                loading={index === 0 ? undefined : "lazy"}
                className="h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.02]"
              />
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={images.length * 90 + 80} className="space-y-3">
        {description.map((paragraph, index) => (
          <p key={index} className="text-[0.9375rem] leading-[1.75] text-ink-soft sm:text-base">
            {paragraph}
          </p>
        ))}
      </Reveal>
    </div>
  );
}
