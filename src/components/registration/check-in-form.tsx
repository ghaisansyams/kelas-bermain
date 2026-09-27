"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Award,
  CircleCheckBig,
  Loader2,
  QrCode,
} from "lucide-react";
import { Checkbox, Field, TextInput } from "@/components/forms/field";
import { Button, buttonStyles } from "@/components/ui/button";
import { checkIn } from "@/lib/services/attendance";
import { issueCertificate } from "@/lib/services/certificate";
import {
  hasErrors,
  validateCheckIn,
  type CheckInFormValues,
  type FieldErrors,
} from "@/lib/utils/validation";
import { certificatesEnabled } from "@/lib/features";

const EMPTY: CheckInFormValues = {
  registrationNumber: "",
  contact: "",
  confirmed: false,
};

/**
 * Attendance check-in.
 *
 * A QR at the venue lands here with `?reg=` already filled, which is why the
 * service records `method: "qr"` for those — the same path a scanner will use.
 */
export function CheckInForm({
  eventId,
  eventSlug,
  eventTitle,
}: {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<CheckInFormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<CheckInFormValues>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState<{
    childName: string;
    registrationNumber: string;
    alreadyRecorded: boolean;
    certificateAvailable: boolean;
  } | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);

  useEffect(() => {
    const reg = new URLSearchParams(window.location.search).get("reg");
    if (!reg) return;
    setScanned(true);
    setValues((current) => ({ ...current, registrationNumber: reg }));
  }, []);

  function set<K extends keyof CheckInFormValues>(key: K, value: CheckInFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const next = validateCheckIn(values);
    setErrors(next);
    if (hasErrors(next)) return;

    setSubmitting(true);
    const response = await checkIn({
      registrationNumber: values.registrationNumber,
      contact: values.contact,
      eventId,
      method: scanned ? "qr" : "form",
    });
    setSubmitting(false);

    if (!response.ok) {
      if (response.field) {
        setErrors({ [response.field]: response.error } as FieldErrors<CheckInFormValues>);
        document.getElementById(response.field)?.focus();
      } else {
        setFormError(response.error);
      }
      return;
    }
    setResult(response);
  }

  async function handleCertificate() {
    if (!result) return;
    setIssuing(true);
    setCertError(null);
    const response = await issueCertificate(result.registrationNumber);
    setIssuing(false);
    if (!response.ok) {
      setCertError(response.error);
      return;
    }
    router.push(`/certificate/${response.certificate.number}`);
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="rounded-card border border-pine/25 bg-pine-soft/60 p-6 text-center sm:p-8">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-pine text-white motion-safe:animate-fade-up">
            <CircleCheckBig className="size-8" aria-hidden />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold text-ink sm:text-3xl">
            Check-in berhasil!
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
            {result.alreadyRecorded
              ? `Kehadiran ${result.childName} sudah tercatat sebelumnya untuk ${eventTitle}.`
              : `Kehadiran ${result.childName} di ${eventTitle} sudah kami catat.`}
          </p>
          <p className="mx-auto mt-4 inline-block rounded-xl border border-pine/20 bg-surface px-4 py-2 font-mono text-sm font-bold text-ink">
            {result.registrationNumber}
          </p>
        </div>

        {certificatesEnabled && result.certificateAvailable ? (
          <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-ink">
              <Award className="size-5 text-brand" aria-hidden />
              Sertifikat sudah bisa diterbitkan
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Sertifikat dibuat dengan nomor unik dan bisa diverifikasi publik kapan saja.
            </p>
            {certError ? (
              <p role="alert" className="mt-3 text-sm font-medium text-brand-dark">
                {certError}
              </p>
            ) : null}
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <Button onClick={handleCertificate} disabled={issuing} className="w-full sm:w-auto">
                {issuing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Menerbitkan…
                  </>
                ) : (
                  "Lihat Sertifikat"
                )}
              </Button>
              <Link
                href={`/event/${eventSlug}`}
                className={buttonStyles({ variant: "secondary", className: "w-full sm:w-auto" })}
              >
                Kembali ke Kelas
              </Link>
            </div>
          </div>
        ) : (
          <Link
            href={`/event/${eventSlug}`}
            className={buttonStyles({ variant: "secondary", className: "w-full sm:w-auto" })}
          >
            Kembali ke Kelas
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {scanned ? (
        <p className="inline-flex items-center gap-2 rounded-pill bg-pine-soft px-3.5 py-1.5 text-xs font-semibold text-pine-dark">
          <QrCode className="size-3.5" aria-hidden />
          Nomor pendaftaran terisi otomatis dari QR
        </p>
      ) : null}

      {formError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand-soft p-4 text-sm font-medium text-brand-ink"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {formError}
        </p>
      ) : null}

      <Field
        label="Nomor Pendaftaran"
        htmlFor="registrationNumber"
        error={errors.registrationNumber}
        hint="Contoh: KB-REG-2026-00001"
        required
      >
        <TextInput
          id="registrationNumber"
          autoComplete="off"
          spellCheck={false}
          placeholder="KB-REG-2026-00001"
          className="font-mono uppercase"
          value={values.registrationNumber}
          error={errors.registrationNumber}
          hint="Contoh: KB-REG-2026-00001"
          disabled={submitting}
          onChange={(e) => set("registrationNumber", e.target.value)}
        />
      </Field>

      <Field
        label="Email atau Nomor WhatsApp Orang Tua"
        htmlFor="contact"
        error={errors.contact}
        hint="Gunakan kontak yang sama seperti saat mendaftar."
        required
      >
        <TextInput
          id="contact"
          autoComplete="email"
          placeholder="nama@email.com atau 08123456789"
          value={values.contact}
          error={errors.contact}
          hint="Gunakan kontak yang sama seperti saat mendaftar."
          disabled={submitting}
          onChange={(e) => set("contact", e.target.value)}
        />
      </Field>

      <Checkbox
        id="confirmed"
        checked={values.confirmed}
        error={errors.confirmed}
        onChange={(checked) => set("confirmed", checked)}
        label={`Saya menyatakan anak saya hadir dan mengikuti ${eventTitle}.`}
      />

      <div className="border-t border-line pt-5">
        <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Memproses…
            </>
          ) : (
            "Check In"
          )}
        </Button>
      </div>
    </form>
  );
}
