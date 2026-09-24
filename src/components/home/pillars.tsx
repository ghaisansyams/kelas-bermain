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
import { pillars, type Pillar } from "@/data/site";

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

export function Pillars() {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Yang diasah"
          title="Empat keterampilan yang diasah di setiap kegiatan"
          description="Temanya berganti setiap pekan — memasak, bertani, mengenal profesi. Tapi empat hal ini selalu jadi tujuannya."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar, index) => {
            const Icon = icons[pillar.icon];
            return (
              <Reveal key={pillar.title} delay={index * 70}>
                <article className="group h-full rounded-card border border-line bg-surface p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-brand/20 hover:shadow-lift">
                  <span
                    className={`inline-flex size-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${accents[pillar.accent]}`}
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
