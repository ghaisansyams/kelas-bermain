import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Camera } from "lucide-react";
import { DriveLinkCard } from "@/components/gallery/drive-link-card";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";
import { siteConfig } from "@/data/site";
import { getGalleryDrive, getGalleryFeatured } from "@/lib/services/content";

export const metadata: Metadata = {
  title: "Galeri",
  description:
    "Dokumentasi foto kegiatan dan event Kelas Bermain, tersimpan dalam satu folder Google Drive yang terbuka untuk umum — tanpa perlu masuk akun.",
  alternates: { canonical: "/galeri" },
  openGraph: {
    title: `Galeri · ${siteConfig.name}`,
    description:
      "Dokumentasi foto kegiatan dan event Kelas Bermain, terbuka untuk umum lewat Google Drive.",
    url: `${siteConfig.url}/galeri`,
    images: [{ url: "/images/galeri-banner.jpg", width: 2000, height: 1100 }],
  },
};

export default async function GaleriPage() {
  const [featured, drive] = await Promise.all([getGalleryFeatured(), getGalleryDrive()]);

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

      {/* Below the banner: the Drive link, not a photo grid. */}
      <Container className="py-10 sm:py-14">
        <div className="max-w-3xl">
          <Eyebrow>Dokumentasi</Eyebrow>
          <h2 className="mt-3 text-[1.5rem] font-extrabold text-ink sm:text-3xl">
            Semua foto ada di Google Drive
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
            Agar mudah diunduh dan selalu terbarui, dokumentasi lengkap Kelas Bermain kami
            simpan di satu folder Google Drive yang terbuka untuk umum.
          </p>
        </div>

        <div className="mt-8 max-w-4xl">
          <DriveLinkCard drive={drive} />
        </div>

        <div className="mt-10 flex flex-col gap-3 rounded-card border border-line bg-canvas-deep/40 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="min-w-0">
            <p className="text-base font-extrabold text-ink">
              Mencari dokumentasi satu kegiatan tertentu?
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Setiap halaman kegiatan memuat cerita, linimasa, dan foto dari kegiatan
              tersebut.
            </p>
          </div>
          <Link
            href="/kegiatan"
            className={buttonStyles({
              variant: "secondary",
              className: "w-full shrink-0 sm:w-auto",
            })}
          >
            Lihat Kegiatan
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Container>
    </>
  );
}
