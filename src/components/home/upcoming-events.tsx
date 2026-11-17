import { Sticker } from "@/components/home/stickers";
import { WaveEdge } from "@/components/ui/playful";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EventCard } from "@/components/event/event-card";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { SectionHeadingContent } from "@/lib/services/cms";
import type { EventView } from "@/lib/types";

export function UpcomingEvents({
  events,
  heading,
}: {
  events: EventView[];
  heading: SectionHeadingContent;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-canvas-deep/50 py-20 sm:py-24" id="event-terdekat">
      <WaveEdge edge="top" shape="scallop" />
      <WaveEdge edge="bottom" shape="wave" />
      <Sticker kind="squiggle" color="red" rotate={-4} className="right-[4%] top-5 hidden h-7 w-20 lg:block" />
      <Sticker kind="book" color="blue" rotate={-8} className="bottom-4 left-[2%] hidden h-10 w-12 xl:block" delay={1.4} />
      <Sticker kind="star" color="yellow" rotate={10} className="bottom-5 right-[3%] hidden size-9 lg:block" delay={0.8} />
      <Container>
        <SectionHeading
          eyebrow={heading.eyebrow}
          title={heading.title}
          description={heading.description}
          action={
            <Link
              href="/event"
              className={buttonStyles({ variant: "secondary", className: "hidden sm:inline-flex" })}
            >
              Semua Event
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />

        {events.length === 0 ? (
          <EmptyState
            className="mt-10"
            title="Belum ada kelas terjadwal"
            description="Jadwal berikutnya sedang disusun. Ikuti Instagram kami agar tidak ketinggalan pengumuman."
          />
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event, index) => (
              <Reveal key={event.id} delay={index * 70} className="h-full">
                <EventCard event={event} priority={index === 0} />
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-8 sm:hidden">
          <Link href="/event" className={buttonStyles({ variant: "secondary", className: "w-full" })}>
            Lihat Semua Event
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Container>
    </section>
  );
}
