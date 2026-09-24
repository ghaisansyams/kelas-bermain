import Image from "next/image";
import type { Metadata } from "next";
import { Camera, Images } from "lucide-react";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";
import { siteConfig } from "@/data/site";
import { getGalleryFeatured, getGalleryItems } from "@/lib/services/content";

export const metadata: Metadata = {
  title: "Galeri",
  description:
    "Dokumentasi foto kegiatan dan event Kelas Bermain. Terbuka untuk umum — tanpa perlu masuk akun.",
  alternates: { canonical: "/galeri" },
  openGraph: {
    title: `Galeri · ${siteConfig.name}`,
    description: "Dokumentasi foto kegiatan dan event Kelas Bermain, terbuka untuk umum.",
    url: `${siteConfig.url}/galeri`,
    images: [{ url: "/images/galeri-banner.jpg", width: 2000, height: 1100 }],
  },
};

export default async function GaleriPage() {
  const [items, featured] = await Promise.all([getGalleryItems(), getGalleryFeatured()]);

  return (
    <>
      {/* Featured banner */}
      <section className="pt-6 sm:pt-10">
        <Container>
          <div className="relative overflow-hidden rounded-[1.5rem] bg-canvas-deep sm:rounded-[2rem]">
            <Image
              src={featured.src}
              alt={featured.alt}
              width={featured.width}
              height={featured.height}
              priority
              sizes="100vw"
              className="h-[18rem] w-full object-cover sm:h-[24rem] lg:h-[30rem]"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/45 to-ink/10"
            />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
              <span className="inline-flex items-center gap-2 rounded-pill bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                <Camera className="size-3.5" aria-hidden />
                Galeri
              </span>
              <h1 className="mt-4 max-w-2xl text-[1.75rem] leading-tight font-extrabold text-white sm:text-4xl lg:text-5xl">
                {featured.title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
                {featured.caption}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-10 sm:py-14">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow>Dokumentasi</Eyebrow>
            <h2 className="mt-3 text-[1.5rem] font-extrabold text-ink sm:text-3xl">
              Semua foto kegiatan
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Galeri ini terbuka untuk umum. Klik foto mana pun untuk melihat versi besar
              beserta keterangannya.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-pill border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-soft sm:self-auto">
            <Images className="size-4 text-brand" aria-hidden />
            {items.length} foto
          </span>
        </div>

        <GalleryGrid items={items} />
      </Container>
    </>
  );
}
