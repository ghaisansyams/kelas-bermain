"use client";

import { useState } from "react";
import { AlertTriangle, Download, ImageDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CertificateTemplate } from "@/lib/cms/certificate-template";
import { downloadCertificate } from "@/lib/certificate/render";
import { getCertificateTemplate } from "@/lib/services/certificate";

/**
 * Tombol unduh PDF dan gambar untuk satu sertifikat. Berkasnya digambar di
 * browser (lihat lib/certificate/render), jadi tidak ada beban di server dan
 * hasilnya sama dengan yang tampil di layar.
 *
 * `template` boleh diberikan kalau pemanggil sudah memilikinya; kalau tidak,
 * desainnya diambil berdasarkan nama yang tersimpan pada sertifikat.
 */
export function CertificateDownloadButtons({
  number,
  participantName,
  templateName,
  template,
  className,
}: {
  number: string;
  participantName: string;
  templateName: string;
  template?: CertificateTemplate | null;
  className?: string;
}) {
  const [busy, setBusy] = useState<"pdf" | "png" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(format: "pdf" | "png") {
    setError(null);
    setBusy(format);
    try {
      const design = template ?? (await getCertificateTemplate(templateName));
      if (!design) {
        setError("Desain sertifikat belum tersedia. Hubungi tim Kelas Bermain.");
        return;
      }
      await downloadCertificate(design, { participantName, certificateNumber: number }, format);
    } catch {
      setError("Sertifikat gagal diunduh. Coba lagi, atau hubungi tim Kelas Bermain.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button onClick={() => void run("pdf")} disabled={busy !== null} className="w-full sm:w-auto">
          {busy === "pdf" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          {busy === "pdf" ? "Menyiapkan…" : "Unduh PDF"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => void run("png")}
          disabled={busy !== null}
          className="w-full sm:w-auto"
        >
          {busy === "png" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ImageDown className="size-4" aria-hidden />
          )}
          {busy === "png" ? "Menyiapkan…" : "Unduh Gambar"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs font-medium text-brand-ink">
          <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
