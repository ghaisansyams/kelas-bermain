import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EventCard } from "@/components/event/event-card";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { EventView } from "@/lib/types";

export function UpcomingEvents({ events }: { events: EventView[] }) {
  return (
    <section className="bg-canvas-deep/50 py-16 sm:py-20" id="event-terdekat">
      <Container>
        <SectionHeading
          eyebrow="Jadwal terdekat"
          title="Kelas yang bisa diikuti si kecil"
          description="Pilih yang paling sesuai usia dan minat anak. Detail agenda, biaya, dan fasilitas ada di setiap halaman kelas."
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
