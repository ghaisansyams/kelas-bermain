import {
  Compass,
  Footprints,
  MessagesSquare,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Pillar } from "@/data/site";
import type { PillarItem } from "@/lib/services/cms-website";

const icons: Record<Pillar["icon"], LucideIcon> = {
  compass: Compass,
  sparkles: Sparkles,
  footprints: Footprints,
  message: MessagesSquare,
};

const accents: Record<Pillar["accent"], string> = {
  brand: "bg-brand-soft text-brand",
  pine: "bg-pine-soft text-pine",
  sun: "bg-sun-soft text-sun-dark",
  grape: "bg-grape-soft text-grape",
  leaf: "bg-leaf-soft text-leaf",
  sky: "bg-sky-soft text-sky",
};

/** Items and heading both come from the CMS; the layout stays in code. */
export function Pillars({
  items,
  heading,
}: {
  items: PillarItem[];
  heading: { eyebrow: string; title: string; description: string };
}) {
  if (items.length === 0) return null;

  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow={heading.eyebrow}
          title={heading.title}
          description={heading.description}
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((pillar, index) => {
            // The CMS stores a free-text icon name, so an unknown value
            // falls back rather than rendering nothing.
            const Icon = icons[pillar.icon as Pillar["icon"]] ?? Sparkles;
            const accent = accents[pillar.accent as Pillar["accent"]] ?? accents.brand;
            return (
              <Reveal key={pillar.title} delay={index * 70}>
                <article className="group h-full rounded-card border border-line bg-surface p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-brand/20 hover:shadow-lift">
                  <span
                    className={`inline-flex size-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${accent}`}
                  >
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-extrabold text-ink">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {pillar.description}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
