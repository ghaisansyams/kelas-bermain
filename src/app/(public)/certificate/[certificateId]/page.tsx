import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { CertificateViewer } from "@/components/certificate/certificate-viewer";
import { Container } from "@/components/ui/container";
import { certificates } from "@/data/certificates";
import { siteConfig } from "@/data/site";

export function generateStaticParams() {
  // Seeded certificates are prerendered; anything issued later renders on demand.
  return certificates.map((certificate) => ({ certificateId: certificate.number }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}): Promise<Metadata> {
  const { certificateId } = await params;
  return {
    title: `Verifikasi Sertifikat ${certificateId}`,
    description: `Halaman verifikasi publik sertifikat Kelas Bermain nomor ${certificateId}.`,
    alternates: { canonical: `/certificate/${certificateId}` },
    openGraph: {
      title: `Verifikasi Sertifikat ${certificateId} · ${siteConfig.name}`,
      description: `Cek keaslian sertifikat Kelas Bermain nomor ${certificateId}.`,
      url: `${siteConfig.url}/certificate/${certificateId}`,
    },
    robots: { index: false, follow: true },
  };
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;

  return (
    <Container className="max-w-4xl py-10 sm:py-14">
      <Link
        href="/sertifikat"
        className="no-print -my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm font-semibold text-muted transition-colors hover:text-brand"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke cek sertifikat
      </Link>

      <header className="no-print mt-5">
        <span className="inline-flex items-center gap-2 rounded-pill bg-pine-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-pine-dark">
          <ShieldCheck className="size-3.5" aria-hidden />
          Verifikasi Sertifikat
        </span>
        <h1 className="mt-4 text-[1.75rem] leading-tight font-extrabold text-ink sm:text-4xl">
          Sertifikat <span className="font-mono text-brand">{certificateId}</span>
        </h1>
      </header>

      <div className="mt-8">
        <CertificateViewer number={certificateId} />
      </div>
    </Container>
  );
}
