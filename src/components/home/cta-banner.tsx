import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

export function CtaBanner() {
  return (
    <section className="pb-4 pt-6 sm:pb-8">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-ink px-6 py-12 text-center sm:rounded-[2rem] sm:px-12 sm:py-16">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -left-16 -top-16 size-64 rounded-full bg-brand/35 blur-3xl" />
              <div className="absolute -bottom-20 -right-10 size-72 rounded-full bg-sun/25 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-sun">
                <Sparkles className="size-3.5" aria-hidden />
                Kuota terbatas
              </span>
              <h2 className="mt-5 text-[1.75rem] leading-tight font-extrabold text-white sm:text-4xl">
                Siap ikut kelas berikutnya?
              </h2>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-white/70 sm:text-base">
                Pilih kelas yang sesuai usia anak, isi formulir singkat, selesaikan
                pembayaran, dan sampai jumpa di lokasi.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link href="/event" className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}>
                  Daftar Kelas
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href="/galeri"
                  className={buttonStyles({
                    variant: "light",
                    size: "lg",
                    className: "w-full sm:w-auto",
                  })}
                >
                  Lihat Galeri
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
