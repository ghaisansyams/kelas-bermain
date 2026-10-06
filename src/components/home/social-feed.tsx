import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { InstagramIcon } from "@/components/brand/social-icons";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { UpdatesResult } from "@/lib/services/update";
import { formatDateShort } from "@/lib/utils/date";

/**
 * Home teaser for the Update feed. Reads the same shared update service as
 * /update, so the two never disagree. Each tile opens the internal detail
 * page; the Instagram profile stays a secondary link.
 */
export function SocialFeed({ updates }: { updates: UpdatesResult }) {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Update terbaru"
          title="Ikuti keseruan Kelas Bermain"
          description="Kabar kegiatan, pengumuman, dan dokumentasi kelas terbaru kami."
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link href="/update" className={buttonStyles({ variant: "secondary" })}>
                Lihat Semua Update
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <a
                href="https://instagram.com/kelasbermain.id"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-brand"
              >
                <InstagramIcon className="size-4" />
                Lihat di Instagram
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </div>
          }
        />

        {!updates.ok ? (
          <p className="mt-10 text-sm text-muted">Update belum dapat dimuat.</p>
        ) : updates.updates.length === 0 ? (
          <p className="mt-10 text-sm text-muted">Update terbaru Kelas Bermain akan muncul di sini.</p>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {updates.updates.slice(0, 6).map((update, index) => (
              <Reveal key={update.id} delay={index * 50}>
                <Link
                  href={`/update/${update.slug}`}
                  className="group relative block aspect-square overflow-hidden rounded-2xl bg-canvas-deep"
                >
                  <Image
                    src={update.image.src}
                    alt={update.image.alt}
                    fill
                    sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 16vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent"
                  />
                  <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3">
                    <span className="text-[0.625rem] font-bold uppercase tracking-wider text-white/80">
                      {formatDateShort(update.publishedAt)}
                    </span>
                    <span className="line-clamp-2 text-xs leading-snug font-bold text-white">
                      {update.title}
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
