import { Play } from "lucide-react";
import { YoutubeModal } from "@/components/media/youtube-modal";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Testimonial } from "@/lib/types";
import { getYoutubeThumbnail } from "@/lib/utils/youtube";

export function Testimonials({ items }: { items: Testimonial[] }) {
  const withVideo = items.filter((item) => item.video);

  return (
    <section className="bg-canvas-deep/50 py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Kata orang tua"
          title="Cerita dari Ayah & Bunda"
          description="Video singkat dari orang tua peserta, direkam setelah kelas selesai."
          align="center"
          className="mx-auto"
        />

        <div className="no-scrollbar mt-10 flex gap-5 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
          {withVideo.map((item, index) => (
            <Reveal
              key={item.id}
              delay={index * 70}
              className="w-[15.5rem] shrink-0 sm:w-auto"
            >
              <TestimonialVideoCard testimonial={item} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

function TestimonialVideoCard({ testimonial }: { testimonial: Testimonial }) {
  if (!testimonial.video) return null;
  const thumbnail = testimonial.video.thumbnail ?? getYoutubeThumbnail(testimonial.video.youtubeUrl);

  return (
    <figure className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-soft transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift">
      <YoutubeModal
        youtubeUrl={testimonial.video.youtubeUrl}
        title={`Cerita ${testimonial.name}${testimonial.eventTitle ? ` — ${testimonial.eventTitle}` : ""}`}
        triggerLabel={`Putar video cerita ${testimonial.name}`}
        triggerClassName="group/video relative block aspect-video w-full overflow-hidden bg-ink"
      >
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail, not an optimizable local asset
          <img
            src={thumbnail}
            alt=""
            aria-hidden
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/video:scale-[1.03]"
          />
        ) : null}
        <div aria-hidden className="absolute inset-0 bg-ink/25 transition-colors group-hover/video:bg-ink/35" />
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-brand shadow-lift transition-transform duration-200 group-hover/video:scale-110"
        >
          <Play className="ml-0.5 size-5 fill-current" aria-hidden />
        </span>
        {testimonial.video.duration ? (
          <span
            aria-hidden
            className="absolute bottom-2 right-2 rounded-pill bg-ink/75 px-2 py-0.5 text-[0.6875rem] font-bold text-white"
          >
            {testimonial.video.duration}
          </span>
        ) : null}
      </YoutubeModal>

      <figcaption className="flex flex-1 flex-col gap-1.5 p-5">
        <span className="text-sm font-bold text-ink">{testimonial.name}</span>
        {testimonial.eventTitle ? (
          <span className="text-xs font-semibold text-brand">{testimonial.eventTitle}</span>
        ) : null}
        <blockquote className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-soft">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>
      </figcaption>
    </figure>
  );
}
