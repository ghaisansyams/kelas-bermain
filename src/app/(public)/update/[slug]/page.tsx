import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { InstagramIcon } from "@/components/brand/social-icons";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/data/site";
import { getUpdateBySlug, getUpdateSlugs } from "@/lib/services/update";
import { formatDate } from "@/lib/utils/date";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getUpdateSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const update = await getUpdateBySlug(slug);
  if (!update) return { title: "Update tidak ditemukan" };
  return {
    title: `${update.title} | ${siteConfig.name}`,
    description: update.excerpt,
    alternates: { canonical: `/update/${update.slug}` },
    openGraph: {
      type: "article",
      title: update.title,
      description: update.excerpt,
      url: `${siteConfig.url}/update/${update.slug}`,
      images: [{ url: update.image.src, width: 1200, height: 800, alt: update.image.alt }],
    },
  };
}

export default async function UpdateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const update = await getUpdateBySlug(slug);
  if (!update) notFound();

  return (
    <Container className="max-w-3xl py-8 sm:py-12">
      <Link
        href="/update"
        className="-my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm font-semibold text-muted transition-colors hover:text-brand"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke semua update
      </Link>

      <article className="mt-5 overflow-hidden rounded-card border border-line bg-surface shadow-soft">
        <div className="relative aspect-[4/3] bg-canvas-deep sm:aspect-[16/10]">
          <Image
            src={update.image.src}
            alt={update.image.alt}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>

        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-ink-soft">
              <InstagramIcon className="size-3.5" aria-hidden />
              {update.username}
            </span>
            <time dateTime={update.publishedAt} className="font-semibold text-muted">
              {formatDate(update.publishedAt)}
            </time>
            <Badge tone="brand">{update.category}</Badge>
          </div>

          <h1 className="mt-4 text-[1.5rem] leading-tight font-extrabold text-ink sm:text-3xl">
            {update.title}
          </h1>

          <p className="mt-4 text-[0.9375rem] leading-[1.75] whitespace-pre-line text-ink-soft sm:text-base">
            {update.caption}
          </p>

          <div className="mt-8 border-t border-line pt-6">
            <a
              href={update.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({ className: "w-full sm:w-auto" })}
            >
              <InstagramIcon className="size-4" aria-hidden />
              Lihat postingan di Instagram
              <ExternalLink className="size-4" aria-hidden />
            </a>
          </div>
        </div>
      </article>
    </Container>
  );
}
