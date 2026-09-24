import Image from "next/image";
import { Quote } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Testimonial } from "@/lib/types";

export function Testimonials({ items }: { items: Testimonial[] }) {
  return (
    <section className="bg-canvas-deep/50 py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Kata orang tua"
          title="Cerita dari Ayah & Bunda"
          description="Kami mengumpulkan umpan balik setelah setiap kelas. Berikut beberapa di antaranya."
          align="center"
          className="mx-auto"
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => (
            <Reveal key={item.id} delay={index * 70} className="h-full">
              <figure className="flex h-full flex-col rounded-card border border-line bg-surface p-6 shadow-soft transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lift">
                <Quote className="size-7 shrink-0 text-brand/25" aria-hidden />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                  {item.quote}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-4">
                  <Image
                    src={item.avatar.src}
                    alt={item.avatar.alt}
                    width={44}
                    height={44}
                    sizes="44px"
                    className="size-11 shrink-0 rounded-full object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{item.name}</span>
                    <span className="block truncate text-xs text-muted">{item.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
