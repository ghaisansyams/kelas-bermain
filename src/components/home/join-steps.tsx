import Image from "next/image";
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

          <Reveal delay={120} className="lg:col-span-7">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[1.5rem] bg-canvas-deep shadow-soft">
                  <Image
                    src="/images/galeri-01.jpg"
                    alt="Tiga anak kecil berpelukan sambil tertawa"
                    width={1200}
                    height={800}
                    sizes="(max-width: 1024px) 45vw, 28vw"
                    className="aspect-[4/5] w-full object-cover"
                  />
                </div>
                <div className="overflow-hidden rounded-[1.5rem] bg-canvas-deep shadow-soft">
                  <Image
                    src="/images/galeri-04.jpg"
                    alt="Anak-anak mewarnai batu di meja prakarya"
                    width={1200}
                    height={675}
                    sizes="(max-width: 1024px) 45vw, 28vw"
                    className="aspect-square w-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="overflow-hidden rounded-[1.5rem] bg-canvas-deep shadow-soft">
                  <Image
                    src="/images/galeri-14.jpg"
                    alt="Kue kecil yang sudah dihias peserta"
                    width={1200}
                    height={857}
                    sizes="(max-width: 1024px) 45vw, 28vw"
                    className="aspect-square w-full object-cover"
                  />
                </div>
                <div className="overflow-hidden rounded-[1.5rem] bg-canvas-deep shadow-soft">
                  <Image
                    src="/images/galeri-13.jpg"
                    alt="Aneka sayuran segar hasil panen peserta"
                    width={1200}
                    height={802}
                    sizes="(max-width: 1024px) 45vw, 28vw"
                    className="aspect-[4/5] w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
