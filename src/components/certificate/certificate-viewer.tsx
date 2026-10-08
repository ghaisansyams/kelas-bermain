"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, SearchX, ShieldCheck } from "lucide-react";
import { CertificateCard } from "@/components/certificate/certificate-card";
import { Button, buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { CertificateRecord } from "@/lib/repositories/types";
import { getCertificate, getCertificateTemplate } from "@/lib/services/certificate";
import { TemplateCanvas } from "@/components/certificate/template-canvas";
import type { CertificateTemplate } from "@/lib/cms/certificate-template";
import { formatDate } from "@/lib/utils/date";

export function CertificateViewer({ number }: { number: string }) {
  const [state, setState] = useState<"loading" | "found" | "missing">("loading");
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null);
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);

  useEffect(() => {
    let active = true;
    getCertificate(number).then(async (record) => {
      if (!active) return;
      setCertificate(record);
      setState(record ? "found" : "missing");
      if (record) {
        // A template designed in the CMS wins; with none published the
        // built-in card is used, so every certificate still renders.
        const design = await getCertificateTemplate(record.template);
        if (active) setTemplate(design);
      }
    });
    return () => {
      active = false;
    };
  }, [number]);

  if (state === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="aspect-[1.414/1] w-full rounded-[1.2rem]" />
        <div className="flex gap-2">
          <Skeleton className="h-11 w-36 rounded-pill" />
          <Skeleton className="h-11 w-36 rounded-pill" />
        </div>
      </div>
    );
  }

  if (state === "missing" || !certificate) {
    return (
      <EmptyState
        icon={<SearchX className="size-6" aria-hidden />}
        title="Sertifikat tidak ditemukan"
        description={`Nomor ${number} tidak terdaftar. Periksa kembali nomor sertifikat, atau cari lewat ID pendaftaran.`}
        action={
          <Link href="/sertifikat" className={buttonStyles()}>
            Cek Nomor Lain
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* A landscape A4 shrunk to 390px is unreadable, so on phones the
          certificate keeps a legible width and scrolls sideways instead. */}
      <div className="cert-scroll no-scrollbar -mx-5 overflow-x-auto px-5 sm:mx-0 sm:overflow-x-visible sm:px-0">
        <div className="cert-inner print-area min-w-[34rem] sm:min-w-0">
          {template ? (
            <TemplateCanvas
              config={template.config}
              backgroundUrl={template.backgroundUrl}
              orientation={template.orientation}
              data={{
                participantName: certificate.participantName,
                certificateNumber: certificate.number,
              }}
            />
          ) : (
            <CertificateCard certificate={certificate} />
          )}
        </div>
      </div>
      <p className="no-print text-center text-xs text-muted sm:hidden">
        Geser ke samping untuk melihat seluruh sertifikat.
      </p>

      <div className="no-print flex flex-col gap-2.5 sm:flex-row">
        <Button onClick={() => window.print()} className="w-full sm:w-auto">
          <Printer className="size-4" aria-hidden />
          Unduh / Cetak
        </Button>
        <Link
          href="/sertifikat"
          className={buttonStyles({ variant: "secondary", className: "w-full sm:w-auto" })}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Cek Sertifikat Lain
        </Link>
      </div>

      <dl className="no-print grid gap-4 rounded-card border border-line bg-surface p-5 sm:grid-cols-2">
        <Row label="Nomor Sertifikat" value={certificate.number} mono />
        <Row label="ID Pendaftaran" value={certificate.registrationId} mono />
        <Row label="Nama Peserta" value={certificate.participantName} />
        <Row label="Kegiatan" value={certificate.eventTitle} />
        <Row label="Tanggal Kegiatan" value={formatDate(certificate.eventDate)} />
        <Row label="Penyelenggara" value={certificate.organizer} />
      </dl>

      <p className="no-print flex items-start gap-2 rounded-xl bg-pine-soft/60 p-4 text-xs leading-relaxed text-pine-dark">
        <ShieldCheck className="mt-px size-4 shrink-0" aria-hidden />
        Sertifikat ini berstatus <strong className="font-bold">terbit</strong> dan dapat
        diverifikasi kapan saja lewat halaman cek sertifikat menggunakan nomor di atas.
      </p>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd
        className={`mt-1 text-sm font-semibold text-ink ${mono ? "font-mono tracking-tight" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
