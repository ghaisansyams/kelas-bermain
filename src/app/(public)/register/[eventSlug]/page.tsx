import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Baby, CalendarDays, Clock, MapPin, QrCode, Ticket } from "lucide-react";
import { RegistrationWizard } from "@/components/registration/registration-wizard";
import { Badge, categoryTone } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { siteConfig } from "@/data/site";
import { REGISTRATION_SOURCES, type RegistrationSource } from "@/lib/repositories/types";
import { getEventBySlug, getEventSlugs } from "@/lib/services/content";
import { formatDateRange } from "@/lib/utils/date";
import { formatRupiah, formatTimeRange } from "@/lib/utils/format";

/**
 * QR landing page.
 *
 * A scanned code points straight here, so the visitor sees the class they
 * scanned and the form — never the home page. `?source=` is carried into the
 * registration record for attribution.
 */

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getEventSlugs();
  return slugs.map((eventSlug) => ({ eventSlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}): Promise<Metadata> {
  const { eventSlug } = await params;
  const event = await getEventBySlug(eventSlug);
  if (!event) return { title: "Pendaftaran tidak ditemukan" };

  return {
    title: `Daftar — ${event.title}`,
    description: `Formulir pendaftaran ${event.title}, ${formatDateRange(event.startDate, event.endDate)} di ${event.location.city}. Usia ${event.ageRange[0]}–${event.ageRange[1]} tahun.`,
    alternates: { canonical: `/register/${event.slug}` },
    openGraph: {
      title: `Daftar ${event.title} · ${siteConfig.name}`,
      description: event.summary,
      url: `${siteConfig.url}/register/${event.slug}`,
      images: [{ url: event.poster?.src ?? event.cover.src }],
    },
    robots: { index: false, follow: true },
  };
}

function resolveSource(value: string | undefined): {
  source: RegistrationSource;
  qrSource?: string;
} {
  if (!value) return { source: "website" };
  const normalized = value.toLowerCase().trim();
  const known = REGISTRATION_SOURCES.find((s) => s === normalized);
  // Anything unrecognised still counts as a QR scan, with the raw tag kept.
  return known ? { source: known, qrSource: value } : { source: "qr", qrSource: value };
}

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const [{ eventSlug }, { source: rawSource }] = await Promise.all([params, searchParams]);
  const event = await getEventBySlug(eventSlug);
  if (!event) notFound();

  const { source, qrSource } = resolveSource(rawSource);
  const isFree = event.registration.type === "FREE";
  const canRegister = event.availability === "open";
  const artwork = event.poster ?? event.cover;

  return (
    <Container className="max-w-3xl py-8 sm:py-12">
      {qrSource ? (
        <p className="mb-5 inline-flex items-center gap-2 rounded-pill bg-pine-soft px-3.5 py-1.5 text-xs font-semibold text-pine-dark">
          <QrCode className="size-3.5" aria-hidden />
          Kamu masuk lewat QR Code
        </p>
      ) : null}

      {/* Event summary — what the scanner needs to confirm they're in the right place */}
      <header className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
        <div className="relative aspect-[16/9] bg-canvas-deep sm:aspect-[21/9]">
          <Image
            src={artwork.src}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className={event.poster ? "scale-125 object-cover blur-xl" : "object-cover"}
          />
          {event.poster ? (
            <Image
              src={event.poster.src}
              alt={event.poster.alt}
              fill
              priority
              sizes="(max-width: 768px) 60vw, 300px"
              className="object-contain"
            />
          ) : null}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={categoryTone[event.category]}>{event.category}</Badge>
            <Badge tone={isFree ? "pine" : "sun"}>
              {isFree ? "Gratis" : formatRupiah(event.registration.price ?? 0)}
            </Badge>
          </div>

          <h1 className="mt-3 text-[1.625rem] leading-tight font-extrabold text-ink sm:text-3xl">
            {event.title}
          </h1>

          <dl className="mt-4 grid gap-2.5 text-sm sm:grid-cols-2">
            <Fact icon={CalendarDays}>
              {formatDateRange(event.startDate, event.endDate)}
            </Fact>
            <Fact icon={Clock}>
              {formatTimeRange(event.timeStart, event.timeEnd, event.timezone)}
            </Fact>
            <Fact icon={MapPin}>
              {event.location.venue}, {event.location.city}
            </Fact>
            <Fact icon={Baby}>
              Usia {event.ageRange[0]}–{event.ageRange[1]} tahun
            </Fact>
          </dl>
        </div>
      </header>

      <section className="mt-6 rounded-card border border-line bg-surface p-5 shadow-soft sm:p-7">
        {canRegister ? (
          <RegistrationWizard event={event} source={source} qrSource={qrSource} />
        ) : (
          <EmptyState
            icon={<Ticket className="size-6" aria-hidden />}
            title={
              event.availability === "full"
                ? "Kuota kelas ini sudah penuh"
                : "Pendaftaran sudah ditutup"
            }
            description={
              event.availability === "full"
                ? "Seluruh tempat sudah terisi. Pantau Instagram @kelasbermain.id untuk pengumuman kelas berikutnya."
                : "Formulir pendaftaran kelas ini sudah tidak tersedia. Lihat kelas lain yang masih membuka pendaftaran."
            }
            className="border-none bg-transparent px-0 py-6"
            action={
              <Link href="/event?filter=upcoming" className={buttonStyles()}>
                Lihat Kelas Lain
              </Link>
            }
          />
        )}
      </section>
    </Container>
  );
}

function Fact({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-muted">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand/70" />
      <span className="font-medium text-ink-soft">{children}</span>
    </div>
  );
}
