import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, MapPin, Ticket } from "lucide-react";
import { RegistrationForm } from "@/components/forms/registration-form";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { getEventBySlug, getEventSlugs } from "@/lib/services/content";
import { formatDateRange } from "@/lib/utils/date";
import { formatRupiah, formatTimeRange } from "@/lib/utils/format";

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
  if (!event) return { title: "Pendaftaran tidak ditemukan" };
  return {
    title: `Daftar — ${event.title}`,
    description: `Formulir pendaftaran ${event.title}, ${formatDateRange(event.startDate, event.endDate)} di ${event.location.city}.`,
    alternates: { canonical: `/event/${event.slug}/daftar` },
    robots: { index: false, follow: true },
  };
}

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const isPaid = event.registration.type === "PAID";
  const canRegister = event.availability === "open";

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <Link
        href={`/event/${event.slug}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-brand"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke detail event
      </Link>

      <header className="mt-5">
        <span className="inline-flex items-center gap-2 rounded-pill bg-brand-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-ink">
          <Ticket className="size-3.5" aria-hidden />
          Formulir Pendaftaran
        </span>
        <h1 className="mt-4 text-[1.75rem] leading-tight font-extrabold text-ink sm:text-4xl">
          {event.title}
        </h1>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4 text-brand/70" aria-hidden />
            {formatDateRange(event.startDate, event.endDate)} ·{" "}
            {formatTimeRange(event.timeStart, event.timeEnd, event.timezone)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4 text-brand/70" aria-hidden />
            {event.location.venue}, {event.location.city}
          </span>
        </div>

        <p className="mt-4 inline-flex items-baseline gap-2 rounded-xl border border-line bg-surface px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            {isPaid ? "Biaya" : "Tipe"}
          </span>
          <span className="text-lg font-extrabold text-ink">
            {isPaid ? formatRupiah(event.registration.price ?? 0) : "Gratis"}
          </span>
        </p>
      </header>

      <div className="mt-8 rounded-card border border-line bg-surface p-5 shadow-soft sm:p-7">
        {canRegister ? (
          <RegistrationForm event={event} />
        ) : (
          <EmptyState
            title={
              event.availability === "full"
                ? "Kuota event ini sudah penuh"
                : "Pendaftaran sudah ditutup"
            }
            description={
              event.availability === "full"
                ? "Seluruh kursi sudah terisi. Pantau Instagram @kelasbermain untuk pengumuman kursi tambahan atau gelaran berikutnya."
                : "Formulir pendaftaran untuk event ini sudah tidak tersedia. Lihat event lain yang masih membuka pendaftaran."
            }
            className="border-none bg-transparent px-0 py-6"
            action={
              <Link href="/event?filter=upcoming" className={buttonStyles()}>
                Lihat Event Lain
              </Link>
            }
          />
        )}
      </div>
    </Container>
  );
}
