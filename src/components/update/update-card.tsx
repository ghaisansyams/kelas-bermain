import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { InstagramIcon } from "@/components/brand/social-icons";
import { Badge } from "@/components/ui/badge";
import type { UpdateCategory, UpdatePost } from "@/lib/types";
import { formatDate } from "@/lib/utils/date";

const categoryTone: Record<UpdateCategory, "brand" | "sun" | "pine" | "grape"> = {
  Kegiatan: "brand",
  Event: "sun",
  Pengumuman: "pine",
  Dokumentasi: "grape",
};

/**
 * One update as a card. Clicking the card opens the internal detail page;
 * "Lihat di Instagram" is a separate, secondary link to the original post.
 * The image uses a fixed 4:3 box so every card in the grid lines up.
 */
export function UpdateCard({ update }: { update: UpdatePost }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link
        href={`/update/${update.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-canvas-deep"
        aria-label={`Baca update: ${update.title}`}
      >
        <Image
          src={update.image.src}
          alt={update.image.alt}
          fill
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-bold text-ink-soft">
            <InstagramIcon className="size-3.5" aria-hidden />
            {update.username}
          </span>
          <time dateTime={update.publishedAt} className="shrink-0 font-semibold text-muted">
            {formatDate(update.publishedAt)}
          </time>
        </div>

        <Badge tone={categoryTone[update.category]} className="self-start">
          {update.category}
        </Badge>

        <h3 className="text-base leading-snug font-extrabold text-ink">
          <Link href={`/update/${update.slug}`} className="hover:text-brand">
            {update.title}
          </Link>
        </h3>

        <p className="line-clamp-3 text-sm leading-relaxed text-muted">{update.excerpt}</p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link
            href={`/update/${update.slug}`}
            className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-brand transition-colors hover:text-brand-ink"
          >
            Baca selengkapnya
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <a
            href={update.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Lihat di Instagram: ${update.title}`}
            className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
          >
            Lihat di Instagram
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
}
