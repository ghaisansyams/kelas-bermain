import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Sticker } from "@/components/home/stickers";
import { Reveal } from "@/components/ui/reveal";
import { Eyebrow } from "@/components/ui/section-heading";
import type { CTA_DEFAULTS } from "@/lib/cms/home-defaults";

export function CtaBanner({ content }: { content: typeof CTA_DEFAULTS }) {
  return (
    <section className="pb-4 pt-6 sm:pb-8">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-ink px-6 py-12 text-center sm:rounded-[2rem] sm:px-12 sm:py-16">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -left-16 -top-16 size-64 rounded-full bg-brand/35 blur-3xl" />
              <div className="absolute -bottom-20 -right-10 size-72 rounded-full bg-sun/25 blur-3xl" />
            </div>

            <Sticker kind="star" color="yellow" rotate={14} className="right-4 top-4 size-6 sm:right-[8%] sm:top-8 sm:size-10" />
            <Sticker kind="ball" color="green" rotate={-12} className="bottom-8 left-[6%] hidden size-10 sm:block" delay={1.1} />
            <Sticker kind="confetti" className="bottom-6 right-[7%] hidden h-10 w-16 sm:block" delay={2} />

            <div className="relative mx-auto max-w-2xl">
              <Eyebrow plain className="text-[0.8125rem] text-sun sm:text-sm">
                {content.eyebrow}
              </Eyebrow>
              <h2 className="mt-5 text-[1.75rem] leading-tight font-extrabold text-white sm:text-4xl">
                {content.title}
              </h2>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-white/70 sm:text-base">
                {content.description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link href={content.buttonHref} className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}>
                  {content.buttonLabel}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href={content.secondaryHref}
                  className={buttonStyles({
                    variant: "light",
                    size: "lg",
                    className: "w-full sm:w-auto",
                  })}
                >
                  {content.secondaryLabel}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
