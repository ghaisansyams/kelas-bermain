import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Award,
  Baby,
  Building2,
  CalendarDays,
  Clock,
  MapPin,
} from "lucide-react";
import { AboutEvent } from "@/components/event/about-event";
import { CheckList, EventAgenda, SectionBlock } from "@/components/event/event-detail-sections";
import { EventTimeline } from "@/components/event/event-timeline";
import { EventVideoCard } from "@/components/event/event-video-card";
import {
  MobileRegistrationBar,
  RegistrationPanel,
} from "@/components/event/registration-panel";
import { Badge, categoryTone, LifecycleBadge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/data/site";
import { certificatesEnabled } from "@/lib/features";
import { getEventBySlug, getEventSlugs, getEventTimeline } from "@/lib/services/content";
import { formatDateRange, formatWeekday } from "@/lib/utils/date";
import { formatTimeRange } from "@/lib/utils/format";

/** Event status is derived from the current date; regenerate hourly. */
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getEventSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event tidak ditemukan" };

  const url = `${siteConfig.url}/event/${event.slug}`;
  return {
    title: event.title,
    description: event.summary,
    alternates: { canonical: `/event/${event.slug}` },
    openGraph: {
      type: "article",
      title: `${event.title} · ${siteConfig.name}`,
      description: event.summary,
      url,
      images: [{ url: event.cover.src, width: 1600, height: 1000, alt: event.cover.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.title} · ${siteConfig.name}`,
      description: event.summary,
      images: [event.cover.src],
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const timeline = await getEventTimeline(slug, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary,
    startDate: event.startDate,
    endDate: event.endDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: [`${siteConfig.url}${event.cover.src}`],
    location: {
      "@type": "Place",
      name: event.location.venue,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.location.address ?? event.location.venue,
        addressLocality: event.location.city,
        addressCountry: "ID",
      },
    },
    organizer: { "@type": "Organization", name: event.organizer, url: siteConfig.url },
    offers: {
      "@type": "Offer",
      price: event.registration.type === "PAID" ? (event.registration.price ?? 0) : 0,
      priceCurrency: "IDR",
      availability:
        event.availability === "open"
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      url: `${siteConfig.url}/event/${event.slug}`,
    },
  };

  return (
    <div className="pb-24 lg:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero — the photo is the backdrop, so the copy always sits on top of it
          no matter how tall the title wraps on a narrow screen. */}
      <section className="relative isolate overflow-hidden bg-canvas-deep">
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image
            src={event.cover.src}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/92 via-ink/65 to-ink/40" />
        </div>

        <Container className="flex flex-col justify-end pb-8 pt-10 sm:min-h-[24rem] sm:pb-12 sm:pt-14 lg:min-h-[28rem]">
          <Link
            href="/event"
            className="-my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm font-semibold text-white/85 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Kembali ke daftar event
          </Link>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone={categoryTone[event.category]} className="bg-surface/95">
              {event.category}
            </Badge>
            <LifecycleBadge lifecycle={event.lifecycle} className="bg-surface/95" />
            {certificatesEnabled && event.certificate.available ? (
              <Badge tone="solid" className="bg-surface/95 text-ink ring-line">
                <Award className="size-3.5" aria-hidden />
                Bersertifikat
              </Badge>
            ) : null}
          </div>

          <h1 className="mt-4 max-w-3xl text-[1.875rem] leading-[1.1] font-extrabold text-white sm:text-4xl lg:text-5xl">
            {event.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-white/80 sm:text-lg">
            {event.tagline}
          </p>
        </Container>
      </section>

      <Container className="pt-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7 xl:col-span-8">
            {/* Key facts */}
            <dl className="grid gap-4 rounded-card border border-line bg-surface p-5 shadow-soft sm:grid-cols-2">
              <Fact icon={CalendarDays} label="Tanggal">
                {formatDateRange(event.startDate, event.endDate)}
                <span className="block text-xs text-muted">{formatWeekday(event.startDate)}</span>
              </Fact>
              <Fact icon={Clock} label="Waktu">
                {formatTimeRange(event.timeStart, event.timeEnd, event.timezone)}
              </Fact>
              <Fact icon={MapPin} label="Lokasi">
                {event.location.venue}
                <span className="block text-xs text-muted">
                  {event.location.address ?? event.location.city}
                </span>
                {event.location.note ? (
                  <span className="mt-0.5 block text-xs text-muted">{event.location.note}</span>
                ) : null}
              </Fact>
              <Fact icon={Baby} label="Usia Peserta">
                {event.ageRange[0]}–{event.ageRange[1]} tahun
                <span className="block text-xs text-muted">
                  Kelompok dibagi per rentang umur
                </span>
              </Fact>
              <Fact icon={Building2} label="Penyelenggara">
                {event.organizer}
              </Fact>
            </dl>

            {/* Registration panel sits inline on mobile, sticky in the sidebar on desktop */}
            <div className="mt-8 lg:hidden">
              <RegistrationPanel event={event} />
              {event.video ? <EventVideoCard video={event.video} className="mt-4" /> : null}
            </div>

            <div className="mt-10 space-y-8">
              <section>
                <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Tentang Event</h2>
                <div className="mt-4">
                  <AboutEvent event={event} />
                </div>
              </section>

              {event.poster ? (
                <SectionBlock id="poster" title="Poster Kegiatan">
                  <p className="-mt-1 mb-5 text-sm leading-relaxed text-muted">
                    Poster resmi dari tim desain, ditampilkan utuh tanpa dipotong.
                  </p>
                  <figure className="overflow-hidden rounded-card border border-line bg-canvas-deep/40 p-3 sm:p-5">
                    <Image
                      src={event.poster.src}
                      alt={event.poster.alt}
                      width={event.poster.width ?? 1080}
                      height={event.poster.height ?? 1350}
                      sizes="(max-width: 640px) 90vw, 460px"
                      className="mx-auto w-full max-w-[460px] rounded-xl shadow-soft"
                    />
                  </figure>
                </SectionBlock>
              ) : null}

              <SectionBlock id="agenda" title="Agenda Kegiatan">
                <EventAgenda items={event.agenda} />
              </SectionBlock>

              <SectionBlock id="ketentuan" title="Ketentuan Peserta">
                <CheckList items={event.requirements} variant="box" />
              </SectionBlock>

              {certificatesEnabled && event.certificate.available ? (
                <SectionBlock id="sertifikat" title="Sertifikat">
                  <div className="rounded-card border border-line bg-canvas-deep/50 p-5">
                    <p className="text-sm leading-relaxed text-ink-soft">
                      Peserta yang kehadirannya tercatat berhak atas e-sertifikat dengan nomor
                      unik berformat{" "}
                      <code className="rounded bg-surface px-1.5 py-0.5 text-xs font-bold text-brand">
                        KB-2026-00001
                      </code>
                      . Sertifikat dapat diunduh setelah kamu mengisi kehadiran melalui halaman
                      event ini.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/attendance/${event.slug}`}
                        className="inline-flex min-h-10 items-center rounded-pill border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
                      >
                        Submit Kehadiran
                      </Link>
                      <Link
                        href="/sertifikat"
                        className="inline-flex min-h-10 items-center rounded-pill border border-line bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
                      >
                        Cek Sertifikat
                      </Link>
                    </div>
                  </div>
                </SectionBlock>
              ) : null}
            </div>
          </div>

          <aside className="hidden lg:col-span-5 lg:block xl:col-span-4">
            <div className="sticky top-24">
              <RegistrationPanel event={event} />
              {event.video ? <EventVideoCard video={event.video} className="mt-4" /> : null}
            </div>
          </aside>
        </div>

        {timeline.length > 0 ? (
          <section className="mt-16 border-t border-line pt-12">
            <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Event lainnya</h2>
            <div className="mt-6 max-w-2xl">
              <EventTimeline events={timeline} />
            </div>
          </section>
        ) : null}
      </Container>

      <MobileRegistrationBar event={event} />
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon className="size-[1.125rem]" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-wider text-muted">{label}</dt>
        <dd className="mt-0.5 text-sm font-semibold leading-snug text-ink">{children}</dd>
      </div>
    </div>
  );
}
