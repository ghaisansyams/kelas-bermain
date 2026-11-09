"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, ExternalLink, Loader2, Search } from "lucide-react";
import { CertificateDownloadButtons } from "@/components/certificate/download-buttons";
import { Field, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { findCertificatesForFamily, type OwnedCertificate } from "@/lib/services/certificate";
import { formatDate } from "@/lib/utils/date";
import { isPhone } from "@/lib/utils/validation";

/**
 * Orang tua mencari sertifikat anaknya sendiri — pola yang sama dengan Cek
 * Tiket: nomor WhatsApp dan satu hal lain yang hanya diketahui pendaftarnya
 * (nomor pendaftaran, atau nama kalau nomornya lupa).
 */
export function CertificateFinder() {
  const [whatsapp, setWhatsapp] = useState("");
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState<{ whatsapp?: string; reference?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OwnedCertificate[] | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setResults(null);

    const next: typeof errors = {};
    if (!isPhone(whatsapp)) next.whatsapp = "Gunakan nomor WhatsApp saat mendaftar, contoh 08123456789.";
    if (reference.trim().length < 2) {
      next.reference = "Isi nomor pendaftaran, atau nama anak kalau lupa nomornya.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    const result = await findCertificatesForFamily({ whatsapp, reference });
    setLoading(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setResults(result.certificates);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field
          label="Nomor WhatsApp"
          htmlFor="whatsapp"
          error={errors.whatsapp}
          hint="Nomor yang kamu pakai saat mendaftar."
          required
        >
          <TextInput
            id="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="08123456789"
            value={whatsapp}
            error={errors.whatsapp}
            disabled={loading}
            onChange={(e) => {
              setWhatsapp(e.target.value);
              setErrors((current) => ({ ...current, whatsapp: undefined }));
            }}
          />
        </Field>

        <Field
          label="Nomor Pendaftaran atau Nama Anak"
          htmlFor="reference"
          error={errors.reference}
          hint="Contoh: KB-REG-2026-00001. Lupa nomornya? Tulis nama anak persis seperti saat mendaftar."
          required
        >
          <TextInput
            id="reference"
            autoComplete="off"
            placeholder="KB-REG-2026-00001 atau nama anak"
            value={reference}
            error={errors.reference}
            disabled={loading}
            onChange={(e) => {
              setReference(e.target.value);
              setErrors((current) => ({ ...current, reference: undefined }));
            }}
          />
        </Field>

        {formError ? (
          <p
            role="alert"
            className="rounded-xl border border-brand/25 bg-brand-soft p-3.5 text-xs leading-relaxed text-brand-ink"
          >
            {formError}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Mencari…
            </>
          ) : (
            <>
              <Search className="size-4" aria-hidden />
              Cari Sertifikat
            </>
          )}
        </Button>
      </form>

      {results !== null ? (
        results.length === 0 ? (
          <p className="rounded-xl border border-line bg-canvas-deep/40 p-4 text-sm leading-relaxed text-ink-soft">
            Datamu ditemukan, tetapi belum ada sertifikat yang diterbitkan. Sertifikat dibuat
            tim kami setelah kelas selesai dan kehadiran anak tercatat. Coba cek lagi nanti.
          </p>
        ) : (
          <ul className="space-y-4" aria-label="Sertifikat yang ditemukan">
            {results.map((item) => (
              <li
                key={item.number}
                className="rounded-card border border-line bg-surface p-5 shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sun-soft text-sun-dark">
                    <Award className="size-[1.125rem]" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-extrabold text-ink">{item.participantName}</p>
                    <p className="text-sm text-ink-soft">{item.eventTitle}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(item.eventDate)} ·{" "}
                      <span className="font-mono font-bold">{item.number}</span>
                    </p>
                  </div>
                </div>

                <CertificateDownloadButtons
                  className="mt-4"
                  number={item.number}
                  participantName={item.participantName}
                  templateName={item.template}
                />
                <Link
                  href={`/certificate/${item.number}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  Lihat sertifikat
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
