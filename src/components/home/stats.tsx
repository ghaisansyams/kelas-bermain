import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { siteStats } from "@/data/site";

export function Stats() {
  return (
    <section className="py-4">
      <Container>
        <Reveal>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-4">
            {siteStats.map((stat) => (
              <div key={stat.label} className="bg-surface px-5 py-7 text-center sm:px-6">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block text-3xl leading-none font-extrabold text-ink sm:text-4xl">
                    {stat.value}
                  </span>
                  <span className="mt-2 block text-sm font-bold text-ink-soft">{stat.label}</span>
                  <span className="mt-1 block text-xs text-muted">{stat.detail}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Container>
    </section>
  );
}
