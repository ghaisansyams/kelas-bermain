import Link from "next/link";
import { ArrowRight, FolderOpen } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { GalleryDriveView } from "@/lib/services/content";

/**
 * Gallery teaser on the home page.
 *
 * Points at the same Google Drive folder the /galeri page uses rather than
 * keeping a second copy of the photos — one folder to update after a class,
 * not two places to keep in sync.
 */
export function GalleryPreview({
  drive,
  heading,
}: {
  drive: GalleryDriveView;
  heading: { eyebrow: string; title: string; description: string };
}) {
  if (!drive.url.trim()) return null;

  return (
    <section className="bg-canvas-deep/50 py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow={heading.eyebrow}
          title={heading.title}
          description={heading.description}
        />

        <Reveal>
          <div className="mt-8 flex flex-col items-start gap-5 rounded-card border border-line bg-surface p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <FolderOpen className="size-6" aria-hidden />
              </span>
              <div>
                <p className="text-base font-extrabold text-ink">{drive.title}</p>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                  {drive.description}
                </p>
              </div>
            </div>

            <Link
              href="/galeri"
              className={buttonStyles({ className: "w-full shrink-0 sm:w-auto" })}
            >
              Lihat Galeri
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
