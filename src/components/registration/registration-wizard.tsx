"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Baby,
  Info,
  Loader2,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { Checkbox, Field, Select, TextInput } from "@/components/forms/field";
import { StepProgress, type WizardStep } from "@/components/registration/steps";
import { RegistrationReceipt } from "@/components/registration/receipt";
import { Button } from "@/components/ui/button";
import {
  SELECTABLE_SOURCES,
  sourceLabel,
  type RegistrationSource,
} from "@/lib/repositories/types";
import { findAffiliateByCode } from "@/lib/services/affiliate";
import { createRegistration, type RegistrationBatch } from "@/lib/services/registration";
import type { EventView } from "@/lib/types";
import { formatRupiah } from "@/lib/utils/format";
import { formatDateRange } from "@/lib/utils/date";
import { formatAge } from "@/lib/utils/age";
import {
  ageOutsideRange,
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
  { key: "children", label: "Data Anak" },
  { key: "parent", label: "Pendamping" },
  { key: "confirm", label: "Konfirmasi" },
  { key: "done", label: "Selesai" },
];

/** Max children per submission — keeps the form usable on a phone. */
const MAX_CHILDREN = 4;

/**
 * Public sign-up form.
 *
 * The field list mirrors the intake sheet the team already uses in WhatsApp
 * (PRD v2.0, R-02), in the same order: child first, then the accompanying
 * adult, then how they heard about Kelas Bermain and an affiliate code.
 * Email, gender, school, grade and occupation were dropped — that sheet has
 * never asked for them, and every extra field costs sign-ups.
 */
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
  const [children, setChildren] = useState<ChildFormValues[]>([{ ...emptyChild }]);
  const [childErrors, setChildErrors] = useState<FieldErrors<ChildFormValues>[]>([{}]);
  const [parent, setParent] = useState<ParentFormValues>(emptyParent);
  const [parentErrors, setParentErrors] = useState<FieldErrors<ParentFormValues>>({});
  const [heardFrom, setHeardFrom] = useState<RegistrationSource | "">("");
  const [heardFromError, setHeardFromError] = useState<string | null>(null);
  const [affiliateCode, setAffiliateCode] = useState("");
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

  /** Soft advisories — these never block the form. See PRD KONF-02. */
  const ageWarnings = children.map((child) => ageOutsideRange(child, event.ageRange));

  const affiliateMatch = useMemo(() => {
    const code = affiliateCode.trim();
    return code ? findAffiliateByCode(code) : null;
  }, [affiliateCode]);

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

  function setParentField<K extends keyof ParentFormValues>(key: K, value: string) {
    setParent((current) => ({ ...current, [key]: value }));
    setParentErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
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

  function goToParent() {
    const errors = children.map(validateChild);
    setChildErrors(errors);
    if (errors.some(hasErrors)) {
      const index = errors.findIndex(hasErrors);
      const key = Object.keys(errors[index]).find(
        (k) => errors[index][k as keyof ChildFormValues],
      );
      if (key) document.getElementById(`${key}-${index}`)?.focus();
      return;
    }
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToConfirm() {
    const errors = validateParent(parent);
    setParentErrors(errors);
    const missingSource = !heardFrom;
    setHeardFromError(missingSource ? "Pilih salah satu." : null);

    if (hasErrors(errors) || missingSource) {
      const first = Object.keys(errors).find((k) => errors[k as keyof ParentFormValues]);
      document.getElementById(first ?? "heardFrom")?.focus();
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

    // What the parent picked outranks the channel we inferred from the URL,
    // except when they scanned a QR — that is a fact, not a recollection.
    const attributed: RegistrationSource =
      source === "qr" ? "qr" : (heardFrom || source);

    const result = await createRegistration({
      event,
      source: attributed,
      qrSource,
      heardFrom: heardFrom || undefined,
      affiliateCode: affiliateCode.trim().toUpperCase() || undefined,
      parent: {
        fullName: parent.fullName,
        whatsapp: parent.whatsapp,
        domicile: parent.domicile,
        source: attributed,
      },
      children: children.map((child) => ({
        fullName: child.fullName,
        nickname: child.nickname,
        ageYears: Number(child.ageYears),
        ageMonths: child.ageMonths.trim() === "" ? 0 : Number(child.ageMonths),
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
        <RegistrationReceipt
          event={event}
          batch={batch}
          parentName={parent.fullName}
          childName={children[0]?.fullName}
        />
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

      {/* ---------------- Step 1: children ---------------- */}
      {step === 0 ? (
        <section aria-label="Data anak" className="space-y-5">
          <header className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-sun-soft text-sun-dark">
              <Baby className="size-[1.125rem]" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-ink">Data Anak</h2>
              <p className="text-xs text-muted">
                Kelas ini untuk usia {event.ageRange[0]}–{event.ageRange[1]} tahun. Bisa
                mendaftarkan lebih dari satu anak.
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
                  label="Nama Anak"
                  htmlFor={`fullName-${index}`}
                  error={childErrors[index]?.fullName}
                  required
                  className="sm:col-span-2"
                >
                  <TextInput
                    id={`fullName-${index}`}
                    placeholder="Contoh: Adyatama Hamizan Nur Adam"
                    value={child.fullName}
                    error={childErrors[index]?.fullName}
                    onChange={(e) => setChildField(index, "fullName", e.target.value)}
                  />
                </Field>

                <Field
                  label="Nama Panggilan"
                  htmlFor={`nickname-${index}`}
                  error={childErrors[index]?.nickname}
                  required
                >
                  <TextInput
                    id={`nickname-${index}`}
                    placeholder="Contoh: Tama"
                    value={child.nickname}
                    error={childErrors[index]?.nickname}
                    onChange={(e) => setChildField(index, "nickname", e.target.value)}
                  />
                </Field>

                <Field
                  label="Usia Anak"
                  htmlFor={`ageYears-${index}`}
                  error={childErrors[index]?.ageYears ?? childErrors[index]?.ageMonths}
                  hint="Contoh: 3 tahun 8 bulan."
                  required
                >
                  <div className="flex items-center gap-2">
                    <TextInput
                      id={`ageYears-${index}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={17}
                      placeholder="3"
                      className="w-full"
                      value={child.ageYears}
                      error={childErrors[index]?.ageYears}
                      onChange={(e) => setChildField(index, "ageYears", e.target.value)}
                    />
                    <span className="shrink-0 text-sm text-muted">tahun</span>
                    <TextInput
                      id={`ageMonths-${index}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={11}
                      placeholder="8"
                      className="w-full"
                      aria-label={`Usia anak ${index + 1} dalam bulan`}
                      value={child.ageMonths}
                      error={childErrors[index]?.ageMonths}
                      onChange={(e) => setChildField(index, "ageMonths", e.target.value)}
                    />
                    <span className="shrink-0 text-sm text-muted">bulan</span>
                  </div>
                </Field>

                {ageWarnings[index] ? (
                  <p
                    role="status"
                    className="flex items-start gap-2 rounded-xl border border-sun/35 bg-sun-soft/70 p-3.5 text-xs leading-relaxed text-ink-soft sm:col-span-2"
                  >
                    <Info className="mt-0.5 size-4 shrink-0 text-sun-dark" aria-hidden />
                    {ageWarnings[index]}
                  </p>
                ) : null}
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

          <div className="flex justify-end border-t border-line pt-5">
            <Button size="lg" onClick={goToParent} className="w-full sm:w-auto">
              Lanjut ke Data Pendamping
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </section>
      ) : null}

      {/* ---------------- Step 2: guardian + attribution ---------------- */}
      {step === 1 ? (
        <section aria-label="Data pendamping" className="space-y-5">
          <header className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <UserRound className="size-[1.125rem]" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-ink">Data Pendamping</h2>
              <p className="text-xs text-muted">Kontak ini yang akan kami hubungi.</p>
            </div>
          </header>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Nama Pendamping / Orang Tua"
              htmlFor="fullName"
              error={parentErrors.fullName}
              hint="Boleh dua nama, contoh: Annisa / Adam."
              required
              className="sm:col-span-2"
            >
              <TextInput
                id="fullName"
                autoComplete="name"
                placeholder="Contoh: Annisa / Adam"
                value={parent.fullName}
                error={parentErrors.fullName}
                onChange={(e) => setParentField("fullName", e.target.value)}
              />
            </Field>

            <Field
              label="No. WhatsApp Aktif"
              htmlFor="whatsapp"
              error={parentErrors.whatsapp}
              hint="Dipakai untuk konfirmasi pembayaran dan info lokasi."
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
                onChange={(e) => setParentField("whatsapp", e.target.value)}
              />
            </Field>

            <Field
              label="Domisili"
              htmlFor="domicile"
              error={parentErrors.domicile}
              hint="Cukup kecamatan dan kota."
              required
            >
              <TextInput
                id="domicile"
                autoComplete="address-level2"
                placeholder="Contoh: Pekayon, Jakarta Timur"
                value={parent.domicile}
                error={parentErrors.domicile}
                onChange={(e) => setParentField("domicile", e.target.value)}
              />
            </Field>

            <Field label="Kelas yang Diikuti" htmlFor="eventTitle" fixed className="sm:col-span-2">
              <TextInput
                id="eventTitle"
                value={event.title}
                readOnly
                aria-readonly
                className="bg-canvas-deep/50 text-muted"
              />
            </Field>

            <Field
              label="Mengetahui Kelas Bermain dari"
              htmlFor="heardFrom"
              error={heardFromError ?? undefined}
              required
            >
              <Select
                id="heardFrom"
                value={heardFrom}
                error={heardFromError ?? undefined}
                onChange={(e) => {
                  setHeardFrom(e.target.value as RegistrationSource | "");
                  setHeardFromError(null);
                }}
              >
                <option value="">Pilih salah satu</option>
                {SELECTABLE_SOURCES.map((key) => (
                  <option key={key} value={key}>
                    {sourceLabel[key]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Kode Affiliate" htmlFor="affiliateCode">
              <TextInput
                id="affiliateCode"
                placeholder="Contoh: FIKA10"
                autoCapitalize="characters"
                value={affiliateCode}
                onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
              />
              {affiliateCode.trim() ? (
                affiliateMatch && affiliateMatch.status === "ACTIVE" ? (
                  <p className="mt-1 text-xs font-semibold text-pine-dark">
                    Kode {affiliateMatch.code} milik {affiliateMatch.fullName} ✓
                  </p>
                ) : (
                  // Never blocks — a mistyped or inactive code is not the
                  // parent's problem to solve. See PRD v2.0, validation table.
                  <p className="mt-1 text-xs text-sun-dark">
                    Kode tidak dikenal atau belum aktif. Pendaftaran tetap bisa dilanjutkan.
                  </p>
                )
              ) : (
                <p className="mt-1 text-xs text-muted">
                  Belum punya kode?{" "}
                  <Link href="/affiliate" className="font-semibold text-brand hover:underline">
                    Jadi affiliator
                  </Link>{" "}
                  dan dapatkan komisi dari share-anmu sendiri.
                </p>
              )}
            </Field>
          </div>

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
            <Row label="Kelas yang diikuti" value={event.title} />
            <Row label="Tanggal" value={formatDateRange(event.startDate, event.endDate)} />
            <Row label="Lokasi" value={`${event.location.venue}, ${event.location.city}`} />
            <Row
              label="Anak"
              value={children
                .map(
                  (c) =>
                    `${c.fullName} (${c.nickname}) · ${formatAge(
                      Number(c.ageYears),
                      Number(c.ageMonths || 0),
                    )}`,
                )
                .join(" — ")}
            />
            <Row label="Pendamping" value={parent.fullName} />
            <Row label="WhatsApp" value={parent.whatsapp} />
            <Row label="Domisili" value={parent.domicile} />
            <Row
              label="Mengetahui dari"
              value={heardFrom ? sourceLabel[heardFrom] : "—"}
            />
            {affiliateCode ? <Row label="Kode affiliate" value={affiliateCode} /> : null}
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
      <dd className="min-w-0 text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}
