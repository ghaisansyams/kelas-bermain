"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CircleCheckBig,
  Copy,
  Landmark,
  Loader2,
} from "lucide-react";
import { Checkbox, Field, TextArea, TextInput } from "@/components/forms/field";
import { Button, buttonStyles } from "@/components/ui/button";
import type { Registration } from "@/lib/repositories/types";
import { registerForEvent } from "@/lib/services/registration";
import type { PaymentInstruction } from "@/lib/services/payment";
import type { EventView } from "@/lib/types";
import { formatDate } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";
import {
  hasErrors,
  validateRegistration,
  type FieldErrors,
  type RegistrationFormValues,
} from "@/lib/utils/validation";

const EMPTY: RegistrationFormValues = {
  fullName: "",
  email: "",
  whatsapp: "",
  institution: "",
  city: "",
  age: "",
  notes: "",
  consent: false,
};

type Status = "idle" | "submitting" | "success";

export function RegistrationForm({ event }: { event: EventView }) {
  const [values, setValues] = useState<RegistrationFormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<RegistrationFormValues>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    registration: Registration;
    payment?: PaymentInstruction;
  } | null>(null);

  const isPaid = event.registration.type === "PAID";

  function set<K extends keyof RegistrationFormValues>(
    key: K,
    value: RegistrationFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    // Clear a field's error as soon as the user edits it.
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setFormError(null);

    const nextErrors = validateRegistration(values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      const firstKey = Object.keys(nextErrors).find(
        (key) => nextErrors[key as keyof RegistrationFormValues],
      );
      if (firstKey) document.getElementById(firstKey)?.focus();
      return;
    }

    setStatus("submitting");
    const response = await registerForEvent(
      {
        slug: event.slug,
        title: event.title,
        date: event.startDate,
        registrationType: event.registration.type,
        price: event.registration.price,
      },
      {
        fullName: values.fullName,
        email: values.email,
        whatsapp: values.whatsapp,
        institution: values.institution,
        city: values.city,
        age: Number(values.age),
        notes: values.notes,
      },
    );

    if (!response.ok) {
      setStatus("idle");
      if (response.field) {
        setErrors({ [response.field]: response.error } as FieldErrors<RegistrationFormValues>);
        document.getElementById(response.field)?.focus();
      } else {
        setFormError(response.error);
      }
      return;
    }

    setResult({ registration: response.registration, payment: response.payment });
    setStatus("success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (status === "success" && result) {
    return <RegistrationSuccess event={event} registration={result.registration} payment={result.payment} />;
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

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nama Lengkap" htmlFor="fullName" error={errors.fullName} required className="sm:col-span-2">
          <TextInput
            id="fullName"
            name="fullName"
            autoComplete="name"
            placeholder="Contoh: Ahmad Fajar"
            value={values.fullName}
            error={errors.fullName}
            disabled={submitting}
            onChange={(e) => set("fullName", e.target.value)}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email} required>
          <TextInput
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={values.email}
            error={errors.email}
            disabled={submitting}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>

        <Field
          label="Nomor WhatsApp"
          htmlFor="whatsapp"
          error={errors.whatsapp}
          hint="Dipakai untuk mengirim konfirmasi kehadiran."
          required
        >
          <TextInput
            id="whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="08123456789"
            value={values.whatsapp}
            error={errors.whatsapp}
            hint="Dipakai untuk mengirim konfirmasi kehadiran."
            disabled={submitting}
            onChange={(e) => set("whatsapp", e.target.value)}
          />
        </Field>

        <Field label="Asal Sekolah / Institusi" htmlFor="institution" error={errors.institution} required>
          <TextInput
            id="institution"
            name="institution"
            autoComplete="organization"
            placeholder="SMA Negeri 1 Jakarta"
            value={values.institution}
            error={errors.institution}
            disabled={submitting}
            onChange={(e) => set("institution", e.target.value)}
          />
        </Field>

        <Field label="Kota" htmlFor="city" error={errors.city} required>
          <TextInput
            id="city"
            name="city"
            autoComplete="address-level2"
            placeholder="Jakarta"
            value={values.city}
            error={errors.city}
            disabled={submitting}
            onChange={(e) => set("city", e.target.value)}
          />
        </Field>

        <Field label="Usia" htmlFor="age" error={errors.age} required>
          <TextInput
            id="age"
            name="age"
            type="number"
            inputMode="numeric"
            min={10}
            max={80}
            placeholder="17"
            value={values.age}
            error={errors.age}
            disabled={submitting}
            onChange={(e) => set("age", e.target.value)}
          />
        </Field>

        <Field
          label="Informasi tambahan"
          htmlFor="notes"
          error={errors.notes}
          hint="Alergi makanan, kebutuhan aksesibilitas, atau pertanyaan untuk panitia."
          className="sm:col-span-2"
        >
          <TextArea
            id="notes"
            name="notes"
            rows={4}
            maxLength={500}
            placeholder="Opsional"
            value={values.notes}
            error={errors.notes}
            hint="Alergi makanan, kebutuhan aksesibilitas, atau pertanyaan untuk panitia."
            disabled={submitting}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>

      <Checkbox
        id="consent"
        name="consent"
        checked={values.consent}
        error={errors.consent}
        onChange={(checked) => set("consent", checked)}
        label={
          <>
            Saya menyatakan data di atas benar dan bersedia dihubungi panitia Kelas Bermain
            terkait {event.title}. Data hanya digunakan untuk keperluan kegiatan ini.
          </>
        }
      />

      <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {isPaid ? (
            <>
              Total biaya{" "}
              <strong className="font-bold text-ink">
                {formatRupiah(event.registration.price ?? 0)}
              </strong>
              . Instruksi pembayaran muncul setelah pendaftaran.
            </>
          ) : (
            <>
              Event ini <strong className="font-bold text-ink">gratis</strong>. Tidak ada
              pembayaran apa pun.
            </>
          )}
        </p>
        <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Memproses…
            </>
          ) : (
            "Daftar Sekarang"
          )}
        </Button>
      </div>
    </form>
  );
}

function RegistrationSuccess({
  event,
  registration,
  payment,
}: {
  event: EventView;
  registration: Registration;
  payment?: PaymentInstruction;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-card border border-pine/25 bg-pine-soft/60 p-6 text-center sm:p-8">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-pine text-white motion-safe:animate-fade-up">
          <CircleCheckBig className="size-8" aria-hidden />
        </span>
        <h2 className="mt-5 text-2xl font-extrabold text-ink sm:text-3xl">Registrasi Berhasil!</h2>
        <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
          Terima kasih sudah mendaftar. Detail kegiatan akan dikirimkan ke kontak yang kamu
          berikan.
        </p>

        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-pine/20 bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            ID Pendaftaran
          </p>
          <p className="mt-1 font-mono text-lg font-extrabold tracking-tight text-ink">
            {registration.id}
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
            <Copy className="mt-px size-3 shrink-0" aria-hidden />
            Simpan ID ini. Kamu memerlukannya untuk mengisi kehadiran dan mengambil sertifikat.
          </p>
        </div>
      </div>

      {payment ? (
        <div className="rounded-card border border-sun/30 bg-sun-soft/50 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-ink">
            <Landmark className="size-5 text-sun-dark" aria-hidden />
            Instruksi Pembayaran
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            Status pendaftaran:{" "}
            <strong className="font-bold text-sun-dark">Menunggu pembayaran</strong>
          </p>

          <ol className="mt-4 space-y-2.5">
            {payment.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sun-dark/15 text-xs font-bold text-sun-dark">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <dl className="mt-5 grid gap-3 rounded-2xl border border-sun/25 bg-surface p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-muted">Bank</dt>
              <dd className="mt-0.5 font-bold text-ink">{payment.account.bank}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-muted">
                Nomor Rekening
              </dt>
              <dd className="mt-0.5 font-mono font-bold text-ink">{payment.account.number}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-muted">Jumlah</dt>
              <dd className="mt-0.5 font-bold text-ink">{payment.amountLabel}</dd>
            </div>
          </dl>

          <p className="mt-4 text-xs leading-relaxed text-muted">{payment.note}</p>
        </div>
      ) : null}

      <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <h3 className="text-base font-extrabold text-ink">Langkah berikutnya</h3>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
          <li className="flex gap-3">
            <CalendarCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            Datang ke {event.location.venue}, {event.location.city} pada{" "}
            {formatDate(event.startDate)} pukul {event.timeStart} {event.timezone}.
          </li>
          <li className="flex gap-3">
            <CalendarCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            Isi kehadiran lewat halaman event menggunakan ID pendaftaranmu.
          </li>
          {event.certificate.available ? (
            <li className="flex gap-3">
              <CalendarCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              Setelah kehadiran tercatat, sertifikat bisa langsung dilihat dan diunduh.
            </li>
          ) : null}
        </ul>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href={`/event/${event.slug}/attendance`}
            className={buttonStyles({ className: "w-full sm:w-auto" })}
          >
            Submit Kehadiran
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href={`/event/${event.slug}`}
            className={buttonStyles({ variant: "secondary", className: "w-full sm:w-auto" })}
          >
            Kembali ke Detail Event
          </Link>
        </div>
      </div>

      <p className="rounded-xl bg-canvas-deep/60 p-4 text-xs leading-relaxed text-muted">
        Catatan versi demo: pendaftaran ini disimpan sementara di peramban kamu dan belum
        terhubung ke basis data produksi.
      </p>
    </div>
  );
}
