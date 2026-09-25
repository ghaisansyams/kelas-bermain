import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, MapPin, Users } from "lucide-react";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { EventAgenda, SectionBlock } from "@/components/event/event-detail-sections";
import {
  ActivityCard,
  activityCategoryLabel,
  activityCategoryTone,
} from "@/components/kegiatan/activity-card";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import { siteConfig } from "@/data/site";
import {
  getActivityBySlug,
  getActivitySlugs,
  getGalleryByIds,
  getRelatedActivities,
} from "@/lib/services/content";
import { formatDateRange } from "@/lib/utils/date";

export async function generateStaticParams() {
  const slugs = await getActivitySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);
  if (!activity) return { title: "Kegiatan tidak ditemukan" };

  return {
    title: activity.title,
    description: activity.summary,
    alternates: { canonical: `/kegiatan/${activity.slug}` },
    openGraph: {
      type: "article",
      title: `${activity.title} · ${siteConfig.name}`,
      description: activity.summary,
      url: `${siteConfig.url}/kegiatan/${activity.slug}`,
      images: [
        { url: activity.cover.src, width: 1600, height: 1000, alt: activity.cover.alt },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${activity.title} · ${siteConfig.name}`,
      description: activity.summary,
      images: [activity.cover.src],
    },
  };
}

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);
  if (!activity) notFound();

  const [photos, related] = await Promise.all([
    getGalleryByIds(activity.galleryIds),
    getRelatedActivities(slug, 3),
  ]);

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-canvas-deep">
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image
            src={activity.cover.src}
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
            href="/kegiatan"
            className="-my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm font-semibold text-white/85 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Kembali ke daftar kegiatan
          </Link>

          <div className="mt-4">
            <Badge
              tone={activityCategoryTone[activity.category]}
              className="bg-surface/95"
            >
              {activityCategoryLabel[activity.category]}
            </Badge>
          </div>

          <h1 className="mt-4 max-w-3xl text-[1.875rem] leading-[1.1] font-extrabold text-white sm:text-4xl lg:text-5xl">
            {activity.title}
          </h1>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden />
              {formatDateRange(activity.date, activity.endDate)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden />
              {activity.location.venue}, {activity.location.city}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-4" aria-hidden />
              {activity.participants.toLocaleString("id-ID")} peserta
            </span>
          </div>
        </Container>
      </section>

      <Container className="pt-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-8">
            <section>
              <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Tentang Kegiatan</h2>
              <div className="mt-4 space-y-4">
                {activity.description.map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-[0.9375rem] leading-[1.75] text-ink-soft sm:text-base"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            <div className="mt-10 space-y-8">
              <SectionBlock id="linimasa" title="Linimasa Kegiatan">
                <EventAgenda items={activity.timeline} />
              </SectionBlock>
            </div>
          </div>

          <aside className="lg:col-span-4">
            <div className="rounded-card border border-line bg-canvas-deep/40 p-5 lg:sticky lg:top-24">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">
                Sorotan
              </h2>
              <dl className="mt-4 space-y-4">
                {activity.highlights.map((highlight) => (
                  <div
                    key={highlight.label}
                    className="flex items-baseline justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-sm text-muted">{highlight.label}</dt>
                    <dd className="text-xl font-extrabold text-ink">{highlight.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>

        <section id="galeri" className="mt-14 border-t border-line pt-12">
          <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Galeri Kegiatan</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {photos.length > 0
              ? "Klik foto untuk melihat versi besar beserta keterangannya."
              : "Dokumentasi untuk kegiatan ini sedang kami siapkan."}
          </p>
          <div className="mt-6">
            {photos.length > 0 ? (
              <GalleryGrid items={photos} showFilter={false} />
            ) : (
              <EmptyState
                title="Belum ada foto"
                description="Dokumentasi kegiatan ini akan segera diunggah ke galeri."
              />
            )}
          </div>
        </section>

        {related.length > 0 ? (
          <section className="mt-16 border-t border-line pt-12">
            <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Kegiatan lainnya</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item, index) => (
                <Reveal key={item.id} delay={index * 70} className="h-full">
                  <ActivityCard activity={item} />
                </Reveal>
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </div>
  );
}
