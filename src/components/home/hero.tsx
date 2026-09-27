import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Sparkles } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import type { EventView } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDateRange } from "@/lib/utils/date";
import { siteConfig } from "@/data/site";

export function Hero({ nextEvent }: { nextEvent?: EventView }) {
  return (
    <section className="relative overflow-hidden pb-4 pt-8 sm:pt-12 lg:pb-12 lg:pt-16">
      {/* Soft ambient colour — kept low-contrast so text stays crisp. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 size-72 rounded-full bg-sun/18 blur-3xl sm:size-96" />
        <div className="absolute -right-20 top-40 size-72 rounded-full bg-brand/12 blur-3xl sm:size-96" />
        <div className="absolute bottom-0 left-1/3 size-64 rounded-full bg-pine/10 blur-3xl" />
      </div>

      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6 xl:col-span-5">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-pill border border-brand/20 bg-brand-soft px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-ink">
                <Sparkles className="size-3.5" aria-hidden />
                Play • Learn • Grow
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-5 text-[2.1rem] leading-[1.08] font-extrabold text-ink sm:text-5xl lg:text-[3.4rem]">
                Tempat anak belajar, bertumbuh, dan{" "}
                <span className="text-accent text-brand">bermain</span> bersama.
              </h1>
            </Reveal>

            <Reveal delay={150}>
              <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-muted sm:text-lg">
                Aktivitas kreatif dan edukatif untuk anak usia 3–15 tahun di Jabodetabek.
                Satu hari penuh pengalaman baru — dari jadi pemadam cilik sampai membuat
                cokelat sendiri.
              </p>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/event" className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}>
                  Lihat Event
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href="/event?filter=upcoming"
                  className={buttonStyles({
                    variant: "secondary",
                    size: "lg",
                    className: "w-full sm:w-auto",
                  })}
                >
                  Daftar Kelas
                </Link>
              </div>
            </Reveal>

            <Reveal delay={300}>
              {/* Only publishable facts here. The activity and participant
                  counts that used to sit alongside these were demo numbers,
                  and the team asked for such figures not to be published at
                  all (PRD v2.0, R-05 / K-08). */}
              <dl className="mt-10 grid max-w-md grid-cols-2 gap-4 border-t border-line pt-6">
                {[
                  { value: siteConfig.ageRangeLabel, label: "Usia peserta" },
                  { value: siteConfig.serviceArea, label: "Area kegiatan" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="sr-only">{stat.label}</dt>
                    <dd>
                      <span className="block text-2xl font-extrabold text-ink">{stat.value}</span>
                      <span className="mt-0.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                        {stat.label}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <div className="lg:col-span-6 xl:col-span-7">
            <Reveal delay={120} className="relative">
              <div className="relative overflow-hidden rounded-[1.75rem] bg-canvas-deep shadow-lift sm:rounded-[2rem]">
                <Image
                  src="/images/hero-kelas-bermain.jpg"
                  alt="Anak-anak mengikuti kegiatan kreatif bersama di Kelas Bermain"
                  width={1800}
                  height={1200}
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="h-full w-full object-cover"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-ink/30 via-transparent to-transparent"
                />
              </div>

              {nextEvent ? (
                <Link
                  href={`/event/${nextEvent.slug}`}
                  className={cn(
                    "group absolute -bottom-5 left-3 right-3 flex items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3.5 shadow-lift backdrop-blur-md",
                    "transition-transform duration-300 hover:-translate-y-0.5",
                    "sm:left-5 sm:right-auto sm:max-w-xs",
                  )}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <CalendarDays className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.625rem] font-bold uppercase tracking-[0.14em] text-brand">
                      Kelas terdekat
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-bold text-ink">
                      {nextEvent.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                      <MapPin className="size-3" aria-hidden />
                      {formatDateRange(nextEvent.startDate, nextEvent.endDate)} ·{" "}
                      {nextEvent.location.city}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              ) : null}
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
