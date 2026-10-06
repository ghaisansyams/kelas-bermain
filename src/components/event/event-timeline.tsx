import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Badge, categoryTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { EventPrice } from "@/components/event/event-price";
import { Reveal } from "@/components/ui/reveal";
import { resolvePriceDisplay, type EventView } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { dateChip } from "@/lib/utils/date";
import { formatTimeRange } from "@/lib/utils/format";

/**
 * "Event lainnya" as a chronological timeline rather than a card grid — the
 * events prop is expected pre-sorted (soonest upcoming first, past last;
 * see `getEventTimeline`). Ordering isn't recomputed here so this component
 * never silently disagrees with whatever produced the list.
 */
export function EventTimeline({ events }: { events: EventView[] }) {
  const nearestIndex = events.findIndex((event) => event.lifecycle !== "past");

  return (
    <ol className="relative">
      {events.map((event, index) => {
        const isNearest = index === nearestIndex;
        const isPast = event.lifecycle === "past";
        const isLast = index === events.length - 1;
        const chip = dateChip(event.startDate);
        const priceHidden = resolvePriceDisplay(event.registration) === "HIDDEN";

        return (
          <Reveal key={event.id} as="li" delay={Math.min(index, 6) * 70} className="relative flex gap-4 pb-8 sm:gap-6">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 size-3 shrink-0 rounded-full ring-4",
                  isNearest
                    ? "bg-brand ring-brand-soft"
                    : isPast
                      ? "bg-line ring-canvas-deep"
                      : "bg-ink/70 ring-canvas-deep",
                )}
              />
              {!isLast ? <span aria-hidden className="w-px flex-1 bg-line" /> : null}
            </div>

            <div
              className={cn(
                "min-w-0 flex-1 rounded-card border bg-surface p-4 shadow-soft sm:p-5",
                isNearest ? "border-brand/30" : "border-line",
                isPast && "opacity-70",
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex shrink-0 gap-3 sm:flex-col sm:items-center sm:gap-1">
                  <div className="flex flex-col items-center rounded-2xl bg-canvas-deep px-3 py-2 sm:w-16">
                    <span className="text-lg leading-none font-extrabold text-ink">{chip.day}</span>
                    <span className="mt-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-brand">
                      {chip.month}
                    </span>
                  </div>
                  <div className="relative hidden size-20 shrink-0 overflow-hidden rounded-xl sm:block">
                    <Image
                      src={event.cover.src}
                      alt=""
                      aria-hidden
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {isNearest ? (
                      <span className="inline-flex items-center rounded-pill bg-brand px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider text-white">
                        Event Terdekat
                      </span>
                    ) : null}
                    <Badge tone={categoryTone[event.category]}>{event.category}</Badge>
                  </div>

                  <h3 className="mt-2 text-base font-extrabold text-ink sm:text-lg">
                    <Link href={`/event/${event.slug}`} className="after:absolute after:inset-0 after:content-['']">
                      {event.title}
                    </Link>
                  </h3>

                  <p className="mt-1 text-sm text-muted">
                    {formatTimeRange(event.timeStart, event.timeEnd, event.timezone)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    {event.location.venue}, {event.location.city}
                  </p>

                  <div
                    className={cn(
                      "mt-3 flex flex-wrap items-center gap-3",
                      priceHidden ? "justify-end" : "justify-between",
                    )}
                  >
                    {priceHidden ? null : (
                      <span className="text-sm font-bold text-ink">
                        <EventPrice event={event} />
                      </span>
                    )}
                    <Link
                      href={`/event/${event.slug}`}
                      className={cn(
                        buttonStyles({ variant: "secondary", size: "sm" }),
                        "relative z-10 shrink-0",
                      )}
                      aria-label={`Lihat detail ${event.title}`}
                    >
                      Lihat Detail
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        );
      })}
    </ol>
  );
}
