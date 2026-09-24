import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { CertificateViewer } from "@/components/certificate/certificate-viewer";
import { Container } from "@/components/ui/container";
import { demoCertificates } from "@/data/demo-records";

export function generateStaticParams() {
  // Demo certificates are prerendered; anything issued later renders on demand.
  return demoCertificates.map((certificate) => ({ id: certificate.number }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Sertifikat ${id}`,
    description: `Halaman verifikasi sertifikat Kelas Bermain nomor ${id}.`,
    alternates: { canonical: `/sertifikat/${id}` },
    robots: { index: false, follow: true },
  };
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Container className="max-w-4xl py-10 sm:py-14">
      <Link
        href="/sertifikat"
        className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-brand"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke cek sertifikat
      </Link>

      <h1 className="no-print mt-5 text-[1.75rem] leading-tight font-extrabold text-ink sm:text-4xl">
        Sertifikat <span className="font-mono text-brand">{id}</span>
      </h1>

      <div className="mt-8">
        <CertificateViewer number={id} />
      </div>
    </Container>
  );
}
