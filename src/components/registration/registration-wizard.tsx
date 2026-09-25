"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Baby,
  Loader2,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { Checkbox, Field, Select, TextArea, TextInput } from "@/components/forms/field";
import { StepProgress, type WizardStep } from "@/components/registration/steps";
import { RegistrationReceipt } from "@/components/registration/receipt";
import { Button } from "@/components/ui/button";
import type { RegistrationSource } from "@/lib/repositories/types";
import { createRegistration, type RegistrationBatch } from "@/lib/services/registration";
import type { EventView } from "@/lib/types";
import { formatRupiah } from "@/lib/utils/format";
import { formatDateRange } from "@/lib/utils/date";
import {
  emptyChild,
  emptyParent,
  hasErrors,
  validateChild,
  validateParent,
  type ChildFormValues,
  type FieldErrors,
  type ParentFormValues,
} from "@/lib/utils/validation";

const STEPS: WizardStep[] = [
  { key: "parent", label: "Orang Tua" },
  { key: "children", label: "Anak" },
  { key: "confirm", label: "Konfirmasi" },
  { key: "done", label: "Selesai" },
];

/** Max children per submission — keeps the form usable on a phone. */
const MAX_CHILDREN = 4;

export function RegistrationWizard({
  event,
  source,
  qrSource,
}: {
  event: EventView;
  source: RegistrationSource;
  qrSource?: string;
}) {
  const [step, setStep] = useState(0);
  const [parent, setParent] = useState<ParentFormValues>(emptyParent);
  const [parentErrors, setParentErrors] = useState<FieldErrors<ParentFormValues>>({});
  const [children, setChildren] = useState<ChildFormValues[]>([{ ...emptyChild }]);
  const [childErrors, setChildErrors] = useState<FieldErrors<ChildFormValues>[]>([{}]);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [batch, setBatch] = useState<RegistrationBatch | null>(null);

  const isFree = event.registration.type === "FREE";
  const unitPrice = isFree ? 0 : (event.registration.price ?? 0);
  const total = unitPrice * children.length;

  const maxChildren = useMemo(
    () => Math.min(MAX_CHILDREN, Math.max(1, event.seatsLeft)),
    [event.seatsLeft],
  );

  function setParentField<K extends keyof ParentFormValues>(key: K, value: string) {
    setParent((current) => ({ ...current, [key]: value }));
    setParentErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  function setChildField(index: number, key: keyof ChildFormValues, value: string) {
    setChildren((current) =>
      current.map((child, i) => (i === index ? { ...child, [key]: value } : child)),
    );
    setChildErrors((current) =>
      current.map((errors, i) =>
        i === index && errors[key] ? { ...errors, [key]: undefined } : errors,
      ),
    );
  }

  function addChild() {
    if (children.length >= maxChildren) return;
    setChildren((current) => [...current, { ...emptyChild }]);
    setChildErrors((current) => [...current, {}]);
  }

  function removeChild(index: number) {
    setChildren((current) => current.filter((_, i) => i !== index));
    setChildErrors((current) => current.filter((_, i) => i !== index));
  }

  function goToChildren() {
    const errors = validateParent(parent);
    setParentErrors(errors);
    if (hasErrors(errors)) {
      const first = Object.keys(errors).find((k) => errors[k as keyof ParentFormValues]);
      if (first) document.getElementById(first)?.focus();
      return;
    }
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToConfirm() {
    const errors = children.map((child) => validateChild(child, event.ageRange));
    setChildErrors(errors);
    if (errors.some(hasErrors)) {
      const index = errors.findIndex(hasErrors);
      const key = Object.keys(errors[index]).find(
        (k) => errors[index][k as keyof ChildFormValues],
      );
      if (key) document.getElementById(`${key}-${index}`)?.focus();
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!consent) {
      setConsentError("Centang persetujuan untuk melanjutkan.");
      return;
    }
    setConsentError(null);
    setFormError(null);
    setSubmitting(true);

    const result = await createRegistration({
      event,
      source,
      qrSource,
      parent: {
        fullName: parent.fullName,
        email: parent.email,
        whatsapp: parent.whatsapp,
        address: parent.address,
        city: parent.city,
        occupation: parent.occupation,
        source,
      },
      children: children.map((child) => ({
        fullName: child.fullName,
        nickname: child.nickname,
        gender: child.gender === "P" ? "P" : "L",
        dateOfBirth: child.dateOfBirth,
        school: child.school,
        grade: child.grade,
        specialNotes: child.specialNotes,
      })),
    });

    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setBatch(result.batch);
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (step === 3 && batch) {
    return (
      <div className="space-y-6">
        <StepProgress steps={STEPS} current={3} />
        <RegistrationReceipt event={event} batch={batch} parentName={parent.fullName} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepProgress steps={STEPS} current={step} />

      {formError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand-soft p-4 text-sm font-medium text-brand-ink"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {formError}
        </p>
      ) : null}

      {/* ---------------- Step 1: parent ---------------- */}
      {step === 0 ? (
        <section aria-label="Data orang tua" className="space-y-5">
          <header className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <UserRound className="size-[1.125rem]" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-ink">Data Orang Tua / Wali</h2>
              <p className="text-xs text-muted">Kontak ini yang akan kami hubungi.</p>
            </div>
          </header>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nama Lengkap" htmlFor="fullName" error={parentErrors.fullName} required className="sm:col-span-2">
              <TextInput
                id="fullName"
                autoComplete="name"
                placeholder="Contoh: Ratna Fajar"
                value={parent.fullName}
                error={parentErrors.fullName}
                onChange={(e) => setParentField("fullName", e.target.value)}
              />
            </Field>

            <Field label="Email" htmlFor="email" error={parentErrors.email} required>
              <TextInput
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="nama@email.com"
                value={parent.email}
                error={parentErrors.email}
                onChange={(e) => setParentField("email", e.target.value)}
              />
            </Field>

            <Field
              label="Nomor WhatsApp"
              htmlFor="whatsapp"
              error={parentErrors.whatsapp}
              hint="Dipakai untuk konfirmasi dan info lokasi."
              required
            >
              <TextInput
                id="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="08123456789"
                value={parent.whatsapp}
                error={parentErrors.whatsapp}
                hint="Dipakai untuk konfirmasi dan info lokasi."
                onChange={(e) => setParentField("whatsapp", e.target.value)}
              />
            </Field>

            <Field label="Alamat" htmlFor="address" error={parentErrors.address} required className="sm:col-span-2">
              <TextInput
                id="address"
                autoComplete="street-address"
                placeholder="Jl. Margonda Raya No. 45"
                value={parent.address}
                error={parentErrors.address}
                onChange={(e) => setParentField("address", e.target.value)}
              />
            </Field>

            <Field label="Kota" htmlFor="city" error={parentErrors.city} required>
              <TextInput
                id="city"
                autoComplete="address-level2"
                placeholder="Depok"
                value={parent.city}
                error={parentErrors.city}
                onChange={(e) => setParentField("city", e.target.value)}
              />
            </Field>

            <Field label="Pekerjaan" htmlFor="occupation" error={parentErrors.occupation}>
              <TextInput
                id="occupation"
                autoComplete="organization-title"
                placeholder="Karyawan swasta"
                value={parent.occupation}
                error={parentErrors.occupation}
                onChange={(e) => setParentField("occupation", e.target.value)}
              />
            </Field>
          </div>

          <div className="flex justify-end border-t border-line pt-5">
            <Button size="lg" onClick={goToChildren} className="w-full sm:w-auto">
              Lanjut ke Data Anak
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </section>
      ) : null}

      {/* ---------------- Step 2: children ---------------- */}
      {step === 1 ? (
        <section aria-label="Data anak" className="space-y-5">
          <header className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-sun-soft text-sun-dark">
              <Baby className="size-[1.125rem]" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-ink">Data Anak</h2>
              <p className="text-xs text-muted">
                Usia {event.ageRange[0]}–{event.ageRange[1]} tahun. Bisa mendaftarkan lebih
                dari satu anak.
              </p>
            </div>
          </header>

          {children.map((child, index) => (
            <fieldset
              key={index}
              className="space-y-5 rounded-card border border-line bg-canvas-deep/30 p-4 sm:p-5"
            >
              <legend className="flex w-full items-center justify-between gap-3 px-1">
                <span className="text-sm font-extrabold text-ink">Anak {index + 1}</span>
                {children.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeChild(index)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand-soft"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    Hapus
                  </button>
                ) : null}
              </legend>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Nama Lengkap Anak"
                  htmlFor={`fullName-${index}`}
                  error={childErrors[index]?.fullName}
                  hint="Nama ini yang tercetak pada sertifikat."
                  required
                  className="sm:col-span-2"
                >
                  <TextInput
                    id={`fullName-${index}`}
                    placeholder="Contoh: Aisyah Fajar"
                    value={child.fullName}
                    error={childErrors[index]?.fullName}
                    hint="Nama ini yang tercetak pada sertifikat."
                    onChange={(e) => setChildField(index, "fullName", e.target.value)}
                  />
                </Field>

                <Field label="Nama Panggilan" htmlFor={`nickname-${index}`}>
                  <TextInput
                    id={`nickname-${index}`}
                    placeholder="Aisyah"
                    value={child.nickname}
                    onChange={(e) => setChildField(index, "nickname", e.target.value)}
                  />
                </Field>

                <Field
                  label="Jenis Kelamin"
                  htmlFor={`gender-${index}`}
                  error={childErrors[index]?.gender}
                  required
                >
                  <Select
                    id={`gender-${index}`}
                    value={child.gender}
                    error={childErrors[index]?.gender}
                    onChange={(e) => setChildField(index, "gender", e.target.value)}
                  >
                    <option value="">Pilih…</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </Select>
                </Field>

                <Field
                  label="Tanggal Lahir"
                  htmlFor={`dateOfBirth-${index}`}
                  error={childErrors[index]?.dateOfBirth}
                  required
                >
                  <TextInput
                    id={`dateOfBirth-${index}`}
                    type="date"
                    value={child.dateOfBirth}
                    error={childErrors[index]?.dateOfBirth}
                    onChange={(e) => setChildField(index, "dateOfBirth", e.target.value)}
                  />
                </Field>

                <Field
                  label="Asal Sekolah"
                  htmlFor={`school-${index}`}
                  error={childErrors[index]?.school}
                  required
                >
                  <TextInput
                    id={`school-${index}`}
                    placeholder="SDN Menteng 03"
                    value={child.school}
                    error={childErrors[index]?.school}
                    onChange={(e) => setChildField(index, "school", e.target.value)}
                  />
                </Field>

                <Field label="Kelas" htmlFor={`grade-${index}`}>
                  <TextInput
                    id={`grade-${index}`}
                    placeholder="Kelas 2"
                    value={child.grade}
                    onChange={(e) => setChildField(index, "grade", e.target.value)}
                  />
                </Field>

                <Field
                  label="Catatan Khusus"
                  htmlFor={`specialNotes-${index}`}
                  error={childErrors[index]?.specialNotes}
                  hint="Alergi, kebutuhan khusus, atau hal yang perlu panitia tahu."
                  className="sm:col-span-2"
                >
                  <TextArea
                    id={`specialNotes-${index}`}
                    rows={3}
                    maxLength={300}
                    placeholder="Opsional"
                    value={child.specialNotes}
                    error={childErrors[index]?.specialNotes}
                    hint="Alergi, kebutuhan khusus, atau hal yang perlu panitia tahu."
                    onChange={(e) => setChildField(index, "specialNotes", e.target.value)}
                  />
                </Field>
              </div>
            </fieldset>
          ))}

          {children.length < maxChildren ? (
            <button
              type="button"
              onClick={addChild}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm font-semibold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
            >
              <Plus className="size-4" aria-hidden />
              Daftarkan anak lain
            </button>
          ) : (
            <p className="text-center text-xs text-muted">
              Maksimal {maxChildren} anak per pendaftaran.
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setStep(0)}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Kembali
            </Button>
            <Button size="lg" onClick={goToConfirm} className="w-full sm:w-auto">
              Lanjut ke Konfirmasi
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </section>
      ) : null}

      {/* ---------------- Step 3: confirm ---------------- */}
      {step === 2 ? (
        <section aria-label="Konfirmasi pendaftaran" className="space-y-5">
          <h2 className="text-base font-extrabold text-ink">Konfirmasi Pendaftaran</h2>

          <dl className="divide-y divide-line rounded-card border border-line bg-surface text-sm">
            <Row label="Kelas" value={event.title} />
            <Row label="Tanggal" value={formatDateRange(event.startDate, event.endDate)} />
            <Row
              label="Lokasi"
              value={`${event.location.venue}, ${event.location.city}`}
            />
            <Row label="Orang tua" value={parent.fullName} />
            <Row label="Kontak" value={`${parent.email} · ${parent.whatsapp}`} />
            <Row
              label="Anak"
              value={children.map((c) => c.fullName).join(", ")}
            />
            <Row label="Jumlah peserta" value={`${children.length} anak`} />
            <Row
              label={isFree ? "Biaya" : "Harga per anak"}
              value={isFree ? "Gratis" : formatRupiah(unitPrice)}
            />
            {!isFree ? (
              <div className="flex items-baseline justify-between gap-4 bg-canvas-deep/40 px-4 py-3.5">
                <dt className="font-bold text-ink">Total</dt>
                <dd className="text-lg font-extrabold text-brand">{formatRupiah(total)}</dd>
              </div>
            ) : null}
          </dl>

          {!isFree && event.registration.method === "THIRD_PARTY" ? (
            <p className="rounded-xl border border-sky/25 bg-sky-soft/70 p-4 text-xs leading-relaxed text-ink-soft">
              Pembayaran kelas ini diselesaikan di platform mitra, bukan di situs Kelas
              Bermain. Setelah mendaftar kamu akan diarahkan ke sana.
            </p>
          ) : null}

          <Checkbox
            id="consent"
            checked={consent}
            error={consentError ?? undefined}
            onChange={(checked) => {
              setConsent(checked);
              if (checked) setConsentError(null);
            }}
            label={
              <>
                Saya orang tua/wali yang mendaftarkan anak di atas, menyatakan datanya benar,
                dan bersedia dihubungi panitia Kelas Bermain terkait {event.title}.
              </>
            }
          />

          <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setStep(1)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Kembali
            </Button>
            <Button size="lg" onClick={submit} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Memproses…
                </>
              ) : isFree ? (
                "Daftar Sekarang"
              ) : (
                "Daftar & Lanjut Bayar"
              )}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}
