import type { Metadata } from "next";
import { CertificatesView } from "@/components/admin/certificates-view";

export const metadata: Metadata = { title: "Sertifikat" };

export default function AdminCertificatesPage() {
  return <CertificatesView />;
}
