import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarCheck } from "lucide-react";
import { CheckInForm } from "@/components/registration/check-in-form";
import { Container } from "@/components/ui/container";
import { getEventBySlug, getEventSlugs } from "@/lib/services/content";
import { formatDateRange } from "@/lib/utils/date";

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
  if (!event) return { title: "Check-in tidak ditemukan" };
  return {
    title: `Check-in — ${event.title}`,
    description: `Konfirmasi kehadiran peserta ${event.title}.`,
    alternates: { canonical: `/attendance/${event.slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const event = await getEventBySlug(eventSlug);
  if (!event) notFound();

  return (
    <Container className="max-w-2xl py-10 sm:py-14">
      <Link
        href={`/event/${event.slug}`}
        className="-my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm font-semibold text-muted transition-colors hover:text-brand"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke detail kelas
      </Link>

      <header className="mt-5">
        <span className="inline-flex items-center gap-2 rounded-pill bg-pine-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-pine-dark">
          <CalendarCheck className="size-3.5" aria-hidden />
          Check-in Kehadiran
        </span>
        <h1 className="mt-4 text-[1.75rem] leading-tight font-extrabold text-ink sm:text-4xl">
          {event.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {formatDateRange(event.startDate, event.endDate)} · {event.location.venue},{" "}
          {event.location.city}
        </p>
      </header>

      <div className="mt-8 rounded-card border border-line bg-surface p-5 shadow-soft sm:p-7">
        <CheckInForm eventId={event.id} eventSlug={event.slug} eventTitle={event.title} />
      </div>
    </Container>
  );
}
