import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Images } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { GalleryItem } from "@/lib/types";

/** A short strip of documentation; the full archive lives on /galeri. */
export function GalleryPreview({ items }: { items: GalleryItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="bg-canvas-deep/50 py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Galeri"
          title="Sekilas keseruan di kelas"
          description="Dokumentasi lengkap setiap kelas tersimpan di satu folder Google Drive yang terbuka untuk umum."
          action={
            <Link
              href="/galeri"
              className={buttonStyles({ variant: "secondary", className: "hidden sm:inline-flex" })}
            >
              <Images className="size-4" aria-hidden />
              Buka Galeri
            </Link>
          }
        />

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((item, index) => (
            <Reveal key={item.id} delay={index * 50}>
              <figure className="group relative aspect-square overflow-hidden rounded-2xl bg-canvas-deep">
                <Image
                  src={item.image.src}
                  alt={item.image.alt}
                  fill
                  sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 16vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <figcaption className="sr-only">{item.caption}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 sm:hidden">
          <Link href="/galeri" className={buttonStyles({ variant: "secondary", className: "w-full" })}>
            Buka Galeri
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Container>
    </section>
  );
}
