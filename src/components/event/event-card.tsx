import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Baby, CalendarDays, Clock, MapPin } from "lucide-react";
import {
  Badge,
  categoryTone,
  LifecycleBadge,
} from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { MetaRow } from "@/components/event/event-meta";
import type { EventView } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { dateChip, formatDateRange } from "@/lib/utils/date";
import { formatRupiah, formatTimeRange } from "@/lib/utils/format";

/**
 * The one event card used on the home page, the listing, and related sections.
 * Everything it renders comes from the `event` prop — no content lives here.
 */
export function EventCard({
  event,
  priority = false,
  className,
}: {
  event: EventView;
  priority?: boolean;
  className?: string;
}) {
  const chip = dateChip(event.startDate);
  const isPaid = event.registration.type === "PAID";
  const href = `/event/${event.slug}`;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface",
        "shadow-soft transition-[transform,box-shadow,border-color] duration-300",
        "hover:-translate-y-1 hover:border-brand/25 hover:shadow-lift",
        "focus-within:-translate-y-1 focus-within:shadow-lift",
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-canvas-deep to-line-soft">
        {event.poster ? (
          /* An Instagram-portrait poster is letterboxed over a blurred copy of
             itself, so the designer's artwork is never cropped and cards in the
             grid still line up. */
          <>
            <Image
              src={event.poster.src}
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw"
              className="scale-125 object-cover blur-xl saturate-150"
            />
            <div aria-hidden className="absolute inset-0 bg-ink/20" />
            <Image
              src={event.poster.src}
              alt={event.poster.alt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
              priority={priority}
              className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
          </>
        ) : (
          <Image
            src={event.cover.src}
            alt={event.cover.alt}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw"
            priority={priority}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-ink/45 via-ink/5 to-transparent"
        />

        <div className="absolute left-3 top-3 flex flex-col items-center rounded-2xl bg-surface/95 px-3 py-2 shadow-soft backdrop-blur-sm">
          <span className="text-lg leading-none font-extrabold text-ink">{chip.day}</span>
          <span className="mt-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-brand">
            {chip.month}
          </span>
        </div>

        <div className="absolute right-3 top-3">
          <LifecycleBadge lifecycle={event.lifecycle} className="bg-surface/95 backdrop-blur-sm" />
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <Badge tone={categoryTone[event.category]} className="bg-surface/95 backdrop-blur-sm">
            {event.category}
          </Badge>
          <span className="rounded-pill bg-surface/95 px-2.5 py-1 text-xs font-bold text-ink backdrop-blur-sm">
            {isPaid ? formatRupiah(event.registration.price ?? 0) : "Gratis"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          <h3 className="text-lg leading-snug font-extrabold text-ink">
            <Link href={href} className="after:absolute after:inset-0 after:content-['']">
              {event.title}
            </Link>
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted">{event.summary}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <MetaRow icon={CalendarDays}>{formatDateRange(event.startDate, event.endDate)}</MetaRow>
          <MetaRow icon={Clock}>
            {formatTimeRange(event.timeStart, event.timeEnd, event.timezone)}
          </MetaRow>
          <MetaRow icon={MapPin}>
            {event.location.venue}, {event.location.city}
          </MetaRow>
          <MetaRow icon={Baby}>
            Usia {event.ageRange[0]}–{event.ageRange[1]} tahun
          </MetaRow>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <EventCardCta event={event} href={href} />
        </div>
      </div>
    </article>
  );
}

function EventCardCta({ event, href }: { event: EventView; href: string }) {
  if (event.availability === "open") {
    return (
      <>
        <Link
          href={`/register/${event.slug}`}
          className={cn(buttonStyles({ size: "sm" }), "relative z-10 flex-1")}
        >
          Daftar Sekarang
        </Link>
        <Link
          href={href}
          className={cn(
            buttonStyles({ variant: "secondary", size: "sm" }),
            "relative z-10 shrink-0",
          )}
          aria-label={`Lihat detail ${event.title}`}
        >
          Detail
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </>
    );
  }

  const label = event.availability === "full" ? "Kuota Penuh" : "Pendaftaran Ditutup";

  return (
    <>
      <span
        aria-hidden
        className={cn(
          "inline-flex min-h-10 flex-1 items-center justify-center rounded-pill px-4 text-sm font-semibold",
          event.availability === "full"
            ? "bg-sun-soft text-sun-dark"
            : "bg-canvas-deep text-muted",
        )}
      >
        {label}
      </span>
      <Link
        href={href}
        className={cn(
          buttonStyles({ variant: "secondary", size: "sm" }),
          "relative z-10 shrink-0",
        )}
      >
        Lihat Detail
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </>
  );
}
