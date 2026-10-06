"use client";

import { useState } from "react";
import { AlertTriangle, CircleCheckBig, Loader2 } from "lucide-react";
import { Checkbox, Field, TextArea, TextInput } from "@/components/forms/field";
import { buttonStyles } from "@/components/ui/button";
import { applyAsAffiliate } from "@/lib/services/affiliate";
import {
  emptyAffiliate,
  hasErrors,
  validateAffiliate,
  type AffiliateFormValues,
  type FieldErrors,
} from "@/lib/utils/validation";

/**
 * Testing number for the affiliate team's WhatsApp — swap for the real
 * affiliate-program admin number (or siteConfig.whatsappE164) before this
 * goes live for real applicants.
 */
const AFFILIATE_WHATSAPP_E164 = "6282211278857";

/**
 * Public affiliate sign-up.
 *
 * Deliberately does not hand out a code on submit — a code only exists once
 * an admin has verified the applicant (PRD v2.0, §7.3). What this form does
 * is create the application and tell the person what happens next.
 */
export function AffiliateApplicationForm() {
  const [values, setValues] = useState<AffiliateFormValues>(emptyAffiliate);
  const [errors, setErrors] = useState<FieldErrors<AffiliateFormValues>>({});
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [affiliateNumber, setAffiliateNumber] = useState<string | null>(null);

  function setField<K extends keyof AffiliateFormValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  async function submit() {
    const nextErrors = validateAffiliate(values);
    setErrors(nextErrors);
    const missingConsent = !consent;
    setConsentError(missingConsent ? "Centang persetujuan untuk melanjutkan." : null);

    if (hasErrors(nextErrors) || missingConsent) {
      const first = Object.keys(nextErrors).find(
        (k) => nextErrors[k as keyof AffiliateFormValues],
      );
      document.getElementById(first ?? "consent")?.focus();
      return;
    }

    setFormError(null);
    setSubmitting(true);
    const result = await applyAsAffiliate(values);
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setAffiliateNumber(result.affiliateNumber);
  }

  if (affiliateNumber) {
    const waText = encodeURIComponent(
      `Halo Kelas Bermain, saya sudah mendaftar sebagai affiliator dengan nomor ${affiliateNumber}. Mohon info langkah selanjutnya ya.`,
    );
    return (
      <div className="rounded-card border border-pine/25 bg-pine-soft/60 p-6 text-center sm:p-8">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-pine text-white">
          <CircleCheckBig className="size-8" aria-hidden />
        </span>
        <h3 className="mt-5 text-xl font-extrabold text-ink sm:text-2xl">
          Pendaftaran Terkirim!
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
          Nomor pendaftaran affiliator kamu{" "}
          <span className="font-mono font-bold text-ink">{affiliateNumber}</span>. Status
          saat ini <strong>menunggu verifikasi</strong>. Kode affiliate pribadimu
          diterbitkan setelah tim kami verifikasi.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
          Supaya lebih cepat diproses, kabari tim kami langsung lewat WhatsApp:
        </p>
        <a
          href={`https://wa.me/${AFFILIATE_WHATSAPP_E164}?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles({ className: "mt-5" })}
        >
          Hubungi Kami di WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
        <Field
          label="Nama Lengkap"
          htmlFor="fullName"
          error={errors.fullName}
          required
          className="sm:col-span-2"
        >
          <TextInput
            id="fullName"
            autoComplete="name"
            placeholder="Contoh: Yufika Agustyani"
            value={values.fullName}
            error={errors.fullName}
            onChange={(e) => setField("fullName", e.target.value)}
          />
        </Field>

        <Field
          label="No. WhatsApp"
          htmlFor="affWhatsapp"
          error={errors.whatsapp}
          hint="Dipakai untuk verifikasi dan grup affiliator."
          required
        >
          <TextInput
            id="affWhatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="08123456789"
            value={values.whatsapp}
            error={errors.whatsapp}
            onChange={(e) => setField("whatsapp", e.target.value)}
          />
        </Field>

        <Field label="Email" htmlFor="affEmail" error={errors.email}>
          <TextInput
            id="affEmail"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={values.email}
            error={errors.email}
            onChange={(e) => setField("email", e.target.value)}
          />
        </Field>

        <Field
          label="Domisili"
          htmlFor="affDomicile"
          error={errors.domicile}
          required
          className="sm:col-span-2"
        >
          <TextInput
            id="affDomicile"
            autoComplete="address-level2"
            placeholder="Contoh: Beji, Depok"
            value={values.domicile}
            error={errors.domicile}
            onChange={(e) => setField("domicile", e.target.value)}
          />
        </Field>

        <Field
          label="Nama Bank"
          htmlFor="bankName"
          error={errors.bankName}
          required
        >
          <TextInput
            id="bankName"
            placeholder="Contoh: BCA"
            value={values.bankName}
            error={errors.bankName}
            onChange={(e) => setField("bankName", e.target.value)}
          />
        </Field>

        <Field
          label="Nomor Rekening"
          htmlFor="bankAccountNumber"
          error={errors.bankAccountNumber}
          required
        >
          <TextInput
            id="bankAccountNumber"
            inputMode="numeric"
            placeholder="1234567890"
            value={values.bankAccountNumber}
            error={errors.bankAccountNumber}
            onChange={(e) => setField("bankAccountNumber", e.target.value)}
          />
        </Field>

        <Field
          label="Nama Pemilik Rekening"
          htmlFor="bankAccountName"
          error={errors.bankAccountName}
          hint="Komisi ditransfer ke rekening ini H-1 sebelum kegiatan."
          required
          className="sm:col-span-2"
        >
          <TextInput
            id="bankAccountName"
            placeholder="Sesuai buku tabungan"
            value={values.bankAccountName}
            error={errors.bankAccountName}
            onChange={(e) => setField("bankAccountName", e.target.value)}
          />
        </Field>

        <Field
          label="Alasan Bergabung"
          htmlFor="reason"
          className="sm:col-span-2"
        >
          <TextArea
            id="reason"
            rows={3}
            placeholder="Opsional — ceritakan komunitas atau jaringan yang kamu punya."
            value={values.reason}
            onChange={(e) => setField("reason", e.target.value)}
          />
        </Field>
      </div>

      <Checkbox
        id="consent"
        checked={consent}
        error={consentError ?? undefined}
        onChange={(checked) => {
          setConsent(checked);
          if (checked) setConsentError(null);
        }}
        label="Saya menyatakan data di atas benar dan bersedia dihubungi tim Kelas Bermain terkait program affiliate."
      />

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Mengirim…
          </>
        ) : (
          "Daftar Jadi Affiliator"
        )}
      </button>
    </div>
  );
}
