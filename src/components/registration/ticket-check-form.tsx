"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Field, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { findTicketAccessToken } from "@/lib/services/ticket";
import {
  hasErrors,
  validateTicketLookup,
  type FieldErrors,
  type TicketLookupFormValues,
} from "@/lib/utils/validation";

const EMPTY: TicketLookupFormValues = { registrationNumber: "", contact: "" };

/**
 * "Cek Tiket" — same verification rule as the attendance check-in form
 * (registration number + the contact given at sign-up), but this one is
 * read-only and routes straight to the existing status page on a match
 * instead of showing its own result screen.
 */
export function TicketCheckForm() {
  const router = useRouter();
  const [values, setValues] = useState<TicketLookupFormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<TicketLookupFormValues>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof TicketLookupFormValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const next = validateTicketLookup(values);
    setErrors(next);
    if (hasErrors(next)) return;

    setSubmitting(true);
    const result = await findTicketAccessToken(values);
    setSubmitting(false);

    if (!result.ok) {
      if (result.field) {
        setErrors({ [result.field]: result.error } as FieldErrors<TicketLookupFormValues>);
        document.getElementById(result.field)?.focus();
      } else {
        setFormError(result.error);
      }
      return;
    }
    router.push(`/payment/${result.accessToken}`);
  }

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
        label="Email atau Nomor WhatsApp"
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

      <div className="border-t border-line pt-5">
        <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Memeriksa…
            </>
          ) : (
            "Cek Status Tiket"
          )}
        </Button>
      </div>
    </form>
  );
}
