import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { HeroSlider } from "@/components/home/hero-slider";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import type { HeroSlide } from "@/data/hero-slides";
import type { HomeHeroContent } from "@/lib/services/cms";

/** Splits the title so the highlighted word keeps its brand-coloured accent. */
function renderTitle(title: string, highlight: string) {
  if (!highlight) return title;
  const index = title.toLowerCase().indexOf(highlight.toLowerCase());
  if (index === -1) return title;
  return (
    <>
      {title.slice(0, index)}
      <span className="text-accent text-brand">{title.slice(index, index + highlight.length)}</span>
      {title.slice(index + highlight.length)}
    </>
  );
}

export function Hero({
  content,
  slides,
}: {
  content: HomeHeroContent;
  slides: HeroSlide[];
}) {
  return (
    <section className="relative overflow-hidden pb-4 pt-8 sm:pt-12 lg:pb-12 lg:pt-16">
      {/* Soft ambient colour — kept low-contrast so text stays crisp. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 size-72 rounded-full bg-sun/18 blur-3xl sm:size-96" />
        <div className="absolute -right-20 top-40 size-72 rounded-full bg-brand/12 blur-3xl sm:size-96" />
        <div className="absolute bottom-0 left-1/3 size-64 rounded-full bg-pine/10 blur-3xl" />
      </div>

      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6 xl:col-span-5">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-pill border border-brand/20 bg-brand-soft px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-ink">
                <Sparkles className="size-3.5" aria-hidden />
                {content.eyebrow}
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-5 text-[2.1rem] leading-[1.08] font-extrabold text-ink sm:text-5xl lg:text-[3.4rem]">
                {renderTitle(content.title, content.highlight)}
              </h1>
            </Reveal>

            <Reveal delay={150}>
              <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-muted sm:text-lg">
                {content.description}
              </p>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={content.primaryCtaHref}
                  className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
                >
                  {content.primaryCtaLabel}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href={content.secondaryCtaHref}
                  className={buttonStyles({
                    variant: "secondary",
                    size: "lg",
                    className: "w-full sm:w-auto",
                  })}
                >
                  {content.secondaryCtaLabel}
                </Link>
              </div>
            </Reveal>

            <Reveal delay={300}>
              {/* Only the publishable fact here. Age range used to sit
                  alongside area — the team asked for it to be dropped from
                  Home specifically (it still shows on each event's detail
                  page, where it's actually decision-relevant). Participant
                  counts stay off entirely (PRD v2.0, R-05 / K-08). */}
              <dl className="mt-10 max-w-md border-t border-line pt-6">
                <div>
                  <dt className="sr-only">{content.statLabel}</dt>
                  <dd>
                    <span className="block text-2xl font-extrabold text-ink">
                      {content.statValue}
                    </span>
                    <span className="mt-0.5 block text-xs font-semibold uppercase tracking-wider text-muted">
                      {content.statLabel}
                    </span>
                  </dd>
                </div>
              </dl>
            </Reveal>
          </div>

          <div className="lg:col-span-6 xl:col-span-7">
            <Reveal delay={120} className="relative">
              <HeroSlider slides={slides} />
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
