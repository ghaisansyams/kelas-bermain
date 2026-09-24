"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Award,
  CircleCheckBig,
  Info,
  Loader2,
  QrCode,
} from "lucide-react";
import { Checkbox, Field, TextInput } from "@/components/forms/field";
import { Button, buttonStyles } from "@/components/ui/button";
import type { Registration } from "@/lib/repositories/types";
import { submitAttendance } from "@/lib/services/attendance";
import { issueCertificate } from "@/lib/services/certificate";
import type { EventView } from "@/lib/types";
import {
  hasErrors,
  validateAttendance,
  type AttendanceFormValues,
  type FieldErrors,
} from "@/lib/utils/validation";

const EMPTY: AttendanceFormValues = {
  registrationId: "",
  fullName: "",
  contact: "",
  confirmed: false,
};

type Status = "idle" | "submitting" | "success";

export function AttendanceForm({ event }: { event: EventView }) {
  const router = useRouter();
  // A QR check-in lands here with the id already in the URL. Read it after
  // mount rather than with `useSearchParams`, which would make this form
  // prerender as a skeleton and flash on every visit.
  const [prefilled, setPrefilled] = useState(false);

  const [values, setValues] = useState<AttendanceFormValues>(EMPTY);

  useEffect(() => {
    const rid = new URLSearchParams(window.location.search).get("rid");
    if (!rid) return;
    setPrefilled(true);
    setValues((current) => ({ ...current, registrationId: rid }));
  }, []);
  const [errors, setErrors] = useState<FieldErrors<AttendanceFormValues>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    registration: Registration;
    alreadyRecorded: boolean;
  } | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);

  function set<K extends keyof AttendanceFormValues>(key: K, value: AttendanceFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setFormError(null);

    const nextErrors = validateAttendance(values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setStatus("submitting");
    const response = await submitAttendance({
      registrationId: values.registrationId,
      fullName: values.fullName,
      contact: values.contact,
      eventSlug: event.slug,
      source: prefilled ? "qr" : "form",
    });

    if (!response.ok) {
      setStatus("idle");
      if (response.field) {
        setErrors({ [response.field]: response.error } as FieldErrors<AttendanceFormValues>);
        document.getElementById(response.field)?.focus();
      } else {
        setFormError(response.error);
      }
      return;
    }

    setResult({ registration: response.registration, alreadyRecorded: response.alreadyRecorded });
    setStatus("success");
  }

  async function handleCertificate() {
    if (!result) return;
    setIssuing(true);
    setCertError(null);
    const response = await issueCertificate({
      registrationId: result.registration.id,
      template: event.certificate.template,
      organizer: event.organizer,
    });
    setIssuing(false);
    if (!response.ok) {
      setCertError(response.error);
      return;
    }
    router.push(`/sertifikat/${response.certificate.number}`);
  }

  if (status === "success" && result) {
    return (
      <div className="space-y-6">
        <div className="rounded-card border border-pine/25 bg-pine-soft/60 p-6 text-center sm:p-8">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-pine text-white motion-safe:animate-fade-up">
            <CircleCheckBig className="size-8" aria-hidden />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold text-ink sm:text-3xl">
            Kehadiran berhasil dicatat.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
            {result.alreadyRecorded
              ? `Kehadiran ${result.registration.fullName} sudah tercatat sebelumnya untuk ${event.title}.`
              : `Terima kasih. Kehadiran ${result.registration.fullName} di ${event.title} sudah kami catat.`}
          </p>
          <p className="mx-auto mt-4 inline-block rounded-xl border border-pine/20 bg-surface px-4 py-2 font-mono text-sm font-bold text-ink">
            {result.registration.id}
          </p>
        </div>

        {event.certificate.available ? (
          <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-ink">
              <Award className="size-5 text-brand" aria-hidden />
              Sertifikat anak sudah bisa diterbitkan
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Sertifikat akan dibuat dengan nomor unik dan dapat dicek kapan saja melalui
              halaman verifikasi.
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
                href={`/event/${event.slug}`}
                className={buttonStyles({ variant: "secondary", className: "w-full sm:w-auto" })}
              >
                Kembali ke Event
              </Link>
            </div>
          </div>
        ) : (
          <Link
            href={`/event/${event.slug}`}
            className={buttonStyles({ variant: "secondary", className: "w-full sm:w-auto" })}
          >
            Kembali ke Event
          </Link>
        )}
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
        label="ID Pendaftaran"
        htmlFor="registrationId"
        error={errors.registrationId}
        hint="Kode yang diterima setelah mendaftar, contoh KB-REG-2026-H4K2PX."
        required
      >
        <TextInput
          id="registrationId"
          name="registrationId"
          autoComplete="off"
          spellCheck={false}
          placeholder="KB-REG-2026-XXXXXX"
          className="font-mono uppercase"
          value={values.registrationId}
          error={errors.registrationId}
          hint="Kode yang diterima setelah mendaftar, contoh KB-REG-2026-H4K2PX."
          disabled={submitting}
          onChange={(e) => set("registrationId", e.target.value)}
        />
      </Field>

      <Field label="Nama Lengkap Anak" htmlFor="fullName" error={errors.fullName} required>
        <TextInput
          id="fullName"
          name="fullName"
          autoComplete="name"
          placeholder="Sesuai data pendaftaran anak"
          value={values.fullName}
          error={errors.fullName}
          disabled={submitting}
          onChange={(e) => set("fullName", e.target.value)}
        />
      </Field>

      <Field
        label="Email atau Nomor WhatsApp"
        htmlFor="contact"
        error={errors.contact}
        hint="Gunakan kontak orang tua yang sama seperti saat mendaftar."
        required
      >
        <TextInput
          id="contact"
          name="contact"
          autoComplete="email"
          placeholder="nama@email.com atau 08123456789"
          value={values.contact}
          error={errors.contact}
          hint="Gunakan kontak orang tua yang sama seperti saat mendaftar."
          disabled={submitting}
          onChange={(e) => set("contact", e.target.value)}
        />
      </Field>

      <Checkbox
        id="confirmed"
        name="confirmed"
        checked={values.confirmed}
        error={errors.confirmed}
        onChange={(checked) => set("confirmed", checked)}
        label={`Saya menyatakan anak saya hadir dan mengikuti ${event.title}.`}
      />

      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Mengirim…
            </>
          ) : (
            "Submit Kehadiran"
          )}
        </Button>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
          <QrCode className="mt-px size-3.5 shrink-0 text-muted" aria-hidden />
          Absensi lewat pemindaian QR sedang disiapkan. Nantinya kode QR di lokasi akan
          mengisi ID pendaftaran secara otomatis.
        </p>
      </div>
    </form>
  );
}

export function AttendanceDemoHint({ registrationId, name, contact }: {
  registrationId: string;
  name: string;
  contact: string;
}) {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-xl border border-sky/25 bg-sky-soft/70 p-4">
      <Info className="mt-0.5 size-4 shrink-0 text-sky" aria-hidden />
      <div className="min-w-0 text-xs leading-relaxed text-ink-soft">
        <p className="font-bold text-ink">Data contoh untuk mencoba alur ini</p>
        <p className="mt-1">
          ID <span className="font-mono font-bold">{registrationId}</span> · Nama{" "}
          <span className="font-semibold">{name}</span> · Kontak{" "}
          <span className="font-semibold">{contact}</span>
        </p>
      </div>
    </div>
  );
}
