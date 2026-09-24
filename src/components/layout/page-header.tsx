import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-canvas-deep/40 py-12 sm:py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute -left-20 bottom-0 size-64 rounded-full bg-sun/12 blur-3xl" />
      </div>
      <Container>
        <div className="max-w-3xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-4 text-[2rem] leading-[1.1] font-extrabold text-ink sm:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-muted sm:text-lg">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </Container>
    </section>
  );
}
