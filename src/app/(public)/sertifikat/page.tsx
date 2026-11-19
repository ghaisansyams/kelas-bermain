import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Award, Hash, ShieldCheck } from "lucide-react";
import { CertificateFinder } from "@/components/certificate/certificate-finder";
import { PageHeader } from "@/components/layout/page-header";
import { PAGE_HEADINGS } from "@/lib/cms/home-defaults";
import { getPageContent, toHeading } from "@/lib/services/cms-website";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/data/site";
import { certificatesEnabled } from "@/lib/features";

export const metadata: Metadata = {
  title: "Unduh Sertifikat",
  description:
    "Unduh sertifikat anak dari kelas Kelas Bermain dengan nomor WhatsApp dan nomor pendaftaran.",
  alternates: { canonical: "/sertifikat" },
  openGraph: {
    title: `Unduh Sertifikat · ${siteConfig.name}`,
    description:
      "Unduh sertifikat anak dari kelas Kelas Bermain dengan nomor WhatsApp dan nomor pendaftaran.",
    url: `${siteConfig.url}/sertifikat`,
  },
};

const facts = [
  {
    icon: Hash,
    title: "Nomor unik",
    body: "Setiap sertifikat memiliki nomor berformat KB-<tahun>-<urutan>, misalnya KB-2026-00125.",
  },
  {
    icon: ShieldCheck,
    title: "Bisa diverifikasi",
    body: "Nomor di sertifikat bisa dicek keasliannya kapan saja lewat halaman /certificate/<nomor>.",
  },
  {
    icon: Award,
    title: "Terbit setelah kelas",
    body: "Tim kami menerbitkan sertifikat setelah kelas selesai dan kehadiran anak tercatat.",
  },
];

export default async function CertificateLookupPage() {
  const heading = toHeading((await getPageContent("pages")).sections.sertifikat, PAGE_HEADINGS.sertifikat);
  // Kelas Bermain issues no e-certificates (R-06 / K-07). The page stays in
  // the tree behind the flag so it can be switched back on later.
  if (!certificatesEnabled) notFound();

  return (
    <>
      <PageHeader
        eyebrow={heading.eyebrow}
        title={heading.title}
        description={heading.description}
      />

      <Container className="py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <div className="rounded-card border border-line bg-surface p-5 shadow-soft sm:p-7">
              <CertificateFinder />
            </div>
          </div>

          <div className="lg:col-span-5">
            <ul className="space-y-4">
              {facts.map((fact) => (
                <li
                  key={fact.title}
                  className="flex gap-4 rounded-card border border-line bg-canvas-deep/40 p-5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-brand">
                    <fact.icon className="size-[1.125rem]" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink">{fact.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{fact.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </>
  );
}
