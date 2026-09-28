import type { Metadata } from "next";
import { CalendarCheck, Percent, Share2, UserPlus, Wallet } from "lucide-react";
import { AffiliateApplicationForm } from "@/components/affiliate/affiliate-application-form";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/data/site";
import { COMMISSION_PER_PARTICIPANT } from "@/lib/services/affiliate";
import { formatRupiah } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Jadi Affiliator",
  description:
    "Dapatkan penghasilan tambahan dengan membagikan kelas Kelas Bermain ke jaringanmu. Modal HP, komisi cair H-1 sebelum kegiatan.",
  alternates: { canonical: "/affiliate" },
  openGraph: {
    title: `Jadi Affiliator · ${siteConfig.name}`,
    description:
      "Bagikan kode pribadimu, dapatkan komisi setiap peserta yang mendaftar dan membayar.",
    url: `${siteConfig.url}/affiliate`,
  },
};

const steps = [
  {
    icon: UserPlus,
    title: "Daftar Affiliator",
    body: "Isi data pendaftaran di bawah. Kode affiliate pribadimu diterbitkan setelah tim kami verifikasi.",
  },
  {
    icon: Share2,
    title: "Gabung Grup & Share",
    body: "Tim menyiapkan flyer, caption, dan info kegiatan. Share ke keluarga, teman, atau media sosialmu.",
  },
  {
    icon: Wallet,
    title: `Komisi ${formatRupiah(COMMISSION_PER_PARTICIPANT)}/Peserta`,
    body: "Setiap peserta yang daftar dan membayar memakai kodemu, kamu mendapat komisi.",
  },
  {
    icon: CalendarCheck,
    title: "Cair H-1",
    body: "Komisi ditransfer ke rekening yang kamu daftarkan, sehari sebelum kegiatan berlangsung.",
  },
];

export default function AffiliatePage() {
  return (
    <>
      <PageHeader
        eyebrow="Affiliate"
        title="Dapat penghasilan tambahan, modal HP"
        description="Bagikan kelas Kelas Bermain ke jaringanmu dengan kode pribadi. Setiap peserta yang mendaftar dan membayar memakai kodemu, kamu dapat komisi."
      />

      <Container className="py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <ul className="space-y-4">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="flex gap-4 rounded-card border border-line bg-canvas-deep/40 p-5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-brand">
                    <step.icon className="size-[1.125rem]" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      Langkah {index + 1}
                    </p>
                    <p className="mt-0.5 text-sm font-extrabold text-ink">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex gap-4 rounded-card border border-sun/30 bg-sun-soft/50 p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-sun-dark">
                <Percent className="size-[1.125rem]" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-ink">Bonus Affiliator</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  Ikut kegiatan Kelas Bermain sendiri? Affiliator aktif mendapat potongan
                  harga khusus.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-card border border-line bg-surface p-5 shadow-soft sm:p-7">
              <h2 className="text-base font-extrabold text-ink sm:text-lg">
                Form Pendaftaran Affiliator
              </h2>
              <p className="mt-1 text-sm text-muted">
                Data rekening dipakai khusus untuk pencairan komisi dan hanya bisa dilihat
                tim internal.
              </p>
              <div className="mt-6">
                <AffiliateApplicationForm />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
