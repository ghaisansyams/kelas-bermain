import { JoinStepsCollage } from "@/components/home/join-steps-collage";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { joinSteps } from "@/data/site";

export function JoinSteps() {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow="Cara ikut"
              title="Empat langkah, selesai dalam lima menit"
              description="Pendaftaran dibuat sesederhana mungkin untuk Ayah dan Bunda. Tidak perlu membuat akun, tidak perlu mengunduh aplikasi."
            />

            <ol className="mt-9 space-y-6">
              {joinSteps.map((step, index) => (
                <Reveal key={step.title} delay={index * 70} as="li" className="flex gap-4">
                  <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white">
                    {index + 1}
                    {index < joinSteps.length - 1 ? (
                      <span
                        aria-hidden
                        className="absolute left-1/2 top-full h-6 w-px -translate-x-1/2 bg-line"
                      />
                    ) : null}
                  </span>
                  <span className="pt-1">
                    <span className="block text-base font-bold text-ink">{step.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted">
                      {step.description}
                    </span>
                  </span>
                </Reveal>
              ))}
            </ol>
          </div>

          <JoinStepsCollage className="lg:col-span-7" />
        </div>
      </Container>
    </section>
  );
}
