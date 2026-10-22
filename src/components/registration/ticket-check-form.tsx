"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Field, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import {
  findRegistrationsByContact,
  findTicketAccessToken,
  type ForgottenLookupResult,
} from "@/lib/services/ticket";
import { checkTicketStatus, type TicketStatusView } from "@/lib/services/ticket-status";
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
  const [forgot, setForgot] = useState(false);
  const [values, setValues] = useState<TicketLookupFormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<TicketLookupFormValues>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [statusOnly, setStatusOnly] = useState<TicketStatusView | null>(null);
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

    // No contact given: show the status only, on this page. The full view
    // would expose a child's name to anyone counting through registration
    // numbers, so it stays behind the contact check.
    if (!values.contact.trim()) {
      const status = await checkTicketStatus(values.registrationNumber);
      setSubmitting(false);
      if (!status.ok) {
        setFormError(status.error);
        return;
      }
      setStatusOnly(status.status);
      return;
    }

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

  if (statusOnly) {
    const paid = statusOnly.paymentStatus === "PAID";
    const waiting = statusOnly.paymentStatus === "WAITING_VERIFICATION";
    const rejected = statusOnly.paymentStatus === "REJECTED";

    const tone = paid
      ? "border-pine/25 bg-pine-soft/60"
      : waiting
        ? "border-sun/40 bg-sun-soft/60"
        : rejected
          ? "border-brand/30 bg-brand-soft"
          : "border-line bg-surface";

    const heading = paid
      ? "Pembayaran sudah terverifikasi"
      : waiting
        ? "Pembayaran sedang diperiksa"
        : rejected
          ? "Bukti pembayaran belum bisa diterima"
          : "Menunggu pembayaran";

    const body = paid
      ? "Pendaftaran ini sudah lunas. Sampai jumpa di kelas!"
      : waiting
        ? "Bukti transfer sudah kami terima dan sedang dicek tim Kelas Bermain. Konfirmasinya dikirim lewat WhatsApp."
        : rejected
          ? "Silakan kirim ulang bukti transfer yang benar lewat WhatsApp."
          : "Kami belum menerima pembayaran untuk pendaftaran ini.";

    return (
      <div className="space-y-5">
        <div className={`rounded-card border p-6 text-center ${tone}`}>
          <h2 className="text-xl font-extrabold text-ink">{heading}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{body}</p>

          {rejected && statusOnly.rejectionReason ? (
            <p className="mx-auto mt-3 max-w-md rounded-xl border border-brand/30 bg-surface px-4 py-3 text-sm text-brand-ink">
              <span className="font-bold">Catatan tim: </span>
              {statusOnly.rejectionReason}
            </p>
          ) : null}

          <dl className="mx-auto mt-5 max-w-sm divide-y divide-line rounded-xl border border-line bg-surface text-left text-sm">
            <Row label="Nomor" value={statusOnly.registrationNumber} />
            <Row label="Pendamping" value={statusOnly.companionName || "—"} />
            <Row label="Jumlah anak" value={`${statusOnly.childrenCount} anak`} />
            <Row label="Kelas" value={statusOnly.eventTitle} />
            {statusOnly.invoiceNumber ? (
              <Row label="Invoice" value={statusOnly.invoiceNumber} />
            ) : null}
          </dl>

          <p className="mt-4 text-xs leading-relaxed text-muted">
            Ingin melihat detail lengkap pendaftaran? Masukkan juga email atau nomor WhatsApp
            yang dipakai saat mendaftar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setStatusOnly(null);
            setFormError(null);
          }}
          className="text-sm font-bold text-brand hover:underline"
        >
          Cek nomor lain
        </button>
      </div>
    );
  }

  if (forgot) {
    return <ForgottenNumberForm onBack={() => setForgot(false)} />;
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
        label="Email atau Nomor WhatsApp (opsional)"
        htmlFor="contact"
        error={errors.contact}
        hint="Isi kontak yang sama seperti saat mendaftar untuk melihat detail lengkap. Kalau dikosongkan, kami hanya menampilkan status pembayaran."
      >
        <TextInput
          id="contact"
          autoComplete="email"
          placeholder="nama@email.com atau 08123456789"
          value={values.contact}
          error={errors.contact}
          disabled={submitting}
          onChange={(e) => set("contact", e.target.value)}
        />
      </Field>

      <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
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
        <button
          type="button"
          onClick={() => setForgot(true)}
          className="text-sm font-bold text-brand hover:underline"
        >
          Lupa nomor pendaftaran?
        </button>
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}

/** Pencarian untuk yang lupa nomor: nomor WhatsApp + nama anak/pendamping. */
function ForgottenNumberForm({ onBack }: { onBack: () => void }) {
  const [whatsapp, setWhatsapp] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ForgottenLookupResult | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setResult(await findRegistrationsByContact({ whatsapp, name }));
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold text-ink">Lupa nomor pendaftaran?</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Isi nomor WhatsApp yang dipakai saat mendaftar dan nama anak (atau nama pendamping)
          persis seperti saat mendaftar. Nomor pendaftaranmu akan ditampilkan.
        </p>
      </div>

      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Nomor WhatsApp" htmlFor="forgotWhatsapp" required>
          <TextInput
            id="forgotWhatsapp"
            inputMode="tel"
            autoComplete="tel"
            placeholder="08123456789"
            value={whatsapp}
            disabled={busy}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </Field>
        <Field label="Nama anak atau pendamping" htmlFor="forgotName" required>
          <TextInput
            id="forgotName"
            autoComplete="off"
            placeholder="Nama persis seperti saat mendaftar"
            value={name}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        {result && !result.ok ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand-soft p-4 text-sm font-medium text-brand-ink"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {result.error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Mencari…
            </>
          ) : (
            "Cari Pendaftaran Saya"
          )}
        </Button>
      </form>

      {result && result.ok ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {result.registrations.map((item) => (
            <li
              key={item.registrationNumber}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-sm font-bold text-ink">{item.registrationNumber}</p>
                <p className="text-xs text-ink-soft">{item.eventTitle}</p>
              </div>
              <Link
                href={`/payment/${item.accessToken}`}
                className="text-sm font-bold text-brand hover:underline"
              >
                Lihat status pembayaran
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <button type="button" onClick={onBack} className="text-sm font-bold text-brand hover:underline">
        Kembali ke Cek Tiket
      </button>
    </div>
  );
}
