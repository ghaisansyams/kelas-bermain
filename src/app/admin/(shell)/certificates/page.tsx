import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CertificatesView } from "@/components/admin/certificates-view";
import { certificatesEnabled } from "@/lib/features";

export const metadata: Metadata = { title: "Sertifikat" };

export default function AdminCertificatesPage() {
  // Hidden from the sidebar and unreachable by URL while the organisation
  // issues no e-certificates (R-06 / K-07).
  if (!certificatesEnabled) notFound();
  return <CertificatesView />;
}
