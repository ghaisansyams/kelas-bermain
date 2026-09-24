import Image from "next/image";
import { ExternalLink, Heart, MessageCircle } from "lucide-react";
import { InstagramIcon } from "@/components/brand/social-icons";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { SocialPost } from "@/lib/types";

/**
 * Social wall.
 *
 * Renders whatever `SocialPost[]` it is handed. Today that comes from a static
 * fixture — no scraping, no Instagram API. When an official integration is
 * approved, feed it the API response and this component stays as it is.
 */
export function SocialFeed({ posts }: { posts: SocialPost[] }) {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Media sosial"
          title="Ikuti keseruan Kelas Bermain"
          description="Dokumentasi harian, pengumuman event, dan cerita di balik layar kami bagikan lewat Instagram."
          action={
            <a
              href="https://instagram.com/kelasbermain"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({ variant: "secondary" })}
            >
              <InstagramIcon className="size-4" />
              @kelasbermain
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          }
        />

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {posts.map((post, index) => (
            <Reveal key={post.id} delay={index * 50}>
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-square overflow-hidden rounded-2xl bg-canvas-deep"
              >
                <Image
                  src={post.image.src}
                  alt={post.image.alt}
                  fill
                  sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 16vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-ink/65 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
                <span className="absolute inset-0 flex flex-col justify-end gap-1.5 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="line-clamp-3 text-[0.6875rem] leading-snug text-white/90">
                    {post.caption}
                  </span>
                  <span className="flex items-center gap-3 text-[0.6875rem] font-bold text-white">
                    <span className="flex items-center gap-1">
                      <Heart className="size-3.5" aria-hidden />
                      {post.likes.toLocaleString("id-ID")}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="size-3.5" aria-hidden />
                      {post.comments}
                    </span>
                  </span>
                </span>
                <span className="sr-only">Buka unggahan Instagram: {post.caption}</span>
              </a>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
