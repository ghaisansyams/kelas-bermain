import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarCheck } from "lucide-react";
import {
  AttendanceDemoHint,
  AttendanceForm,
} from "@/components/forms/attendance-form";
import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";
import { demoRegistrations } from "@/data/demo-records";
import { getEventBySlug, getEventSlugs } from "@/lib/services/content";
import { formatDateRange } from "@/lib/utils/date";

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
  if (!event) return { title: "Kehadiran tidak ditemukan" };
  return {
    title: `Kehadiran — ${event.title}`,
    description: `Formulir konfirmasi kehadiran peserta ${event.title}.`,
    alternates: { canonical: `/event/${event.slug}/attendance` },
    robots: { index: false, follow: true },
  };
}

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const demo = demoRegistrations.find((item) => item.eventSlug === slug);

  return (
    <Container className="max-w-2xl py-10 sm:py-14">
      <Link
        href={`/event/${event.slug}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-brand"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke detail event
      </Link>

      <header className="mt-5">
        <span className="inline-flex items-center gap-2 rounded-pill bg-pine-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-pine-dark">
          <CalendarCheck className="size-3.5" aria-hidden />
          Konfirmasi Kehadiran
        </span>
        <h1 className="mt-4 text-[1.75rem] leading-tight font-extrabold text-ink sm:text-4xl">
          {event.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {formatDateRange(event.startDate, event.endDate)} · {event.location.venue},{" "}
          {event.location.city}. Isi formulir di bawah untuk mencatat kehadiranmu.
        </p>
      </header>

      <div className="mt-8 rounded-card border border-line bg-surface p-5 shadow-soft sm:p-7">
        <Suspense fallback={<AttendanceFormSkeleton />}>
          <AttendanceForm event={event} />
        </Suspense>
      </div>

      {demo ? (
        <AttendanceDemoHint
          registrationId={demo.id}
          name={demo.fullName}
          contact={demo.email}
        />
      ) : null}
    </Container>
  );
}

function AttendanceFormSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-13 w-44 rounded-pill" />
    </div>
  );
}
