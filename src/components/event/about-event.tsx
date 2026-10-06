import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";
import type { EventRecord } from "@/lib/types";
import { resolveAboutEvent } from "@/lib/utils/about-event";

/**
 * Visual-first "Tentang Event": a photo (or a small gallery of them) before
 * any text, so a parent understands the class at a glance and reads the
 * description second. See `resolveAboutEvent` for how the image and
 * description fall back when an event hasn't set its own.
 */
export function AboutEvent({
  event,
}: {
  event: Pick<EventRecord, "description" | "category" | "aboutEvent">;
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
            <div className="aspect-[16/9] overflow-hidden sm:aspect-[3/2]">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width ?? 1200}
                height={image.height ?? 800}
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
