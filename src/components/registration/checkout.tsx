"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CircleCheckBig,
  Clock3,
  ExternalLink,
  Loader2,
  MessageCircle,
  RotateCw,
  ShieldAlert,
  Upload,
  XCircle,
} from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { events } from "@/data/events";
import {
  getRegistrationByToken,
  type RegistrationStatusView,
} from "@/lib/services/registration";
import { formatDate } from "@/lib/utils/date";
import { BankTransferPanel } from "@/components/registration/bank-transfer";
import { formatRupiah } from "@/lib/utils/format";
import { submitProof, uploadPaymentProof } from "@/lib/services/payment-proof";
import { paymentProofWhatsappUrl } from "@/lib/config/whatsapp";

/**
 * Read-only registration/payment status, looked up by the opaque access
 * token in the URL (never the sequential registration number).
 *
 * This page cannot mark anything PAID — that used to be a "Saya Sudah
 * Transfer" button here, which was harmless when every visitor's data lived
 * only in their own browser but becomes a real fraud path against a shared
 * database: anyone could call the same function and mark their own transfer
 * paid without sending a rupiah. Verifying a transfer is admin's job, done
 * by hand in the Supabase Table Editor once the WhatsApp proof arrives.
 */
export function Checkout({ accessToken }: { accessToken: string }) {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<RegistrationStatusView | null>(null);
  const [markingProof, setMarkingProof] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setView(await getRegistrationByToken(accessToken));
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (!view) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-6" aria-hidden />}
        title="Pendaftaran tidak ditemukan"
        description="Tautan ini tidak valid atau pendaftaran sudah tidak ada."
        action={
          <Link href="/event" className={buttonStyles()}>
            Lihat Daftar Kelas
          </Link>
        }
      />
    );
  }

  const event = events.find((e) => e.id === view.eventId);

  const summary = (
    <dl className="divide-y divide-line rounded-card border border-line bg-surface text-sm">
      <Row label="Kelas" value={event?.title ?? "—"} />
      <Row label="Tanggal" value={event ? formatDate(event.startDate) : "—"} />
      <Row label="Pendamping" value={view.customerFullName} />
      <Row label="Anak" value={view.childFullName} />
      <Row label="Nomor Pendaftaran" value={view.registrationNumber} mono />
      {/* Only exists once an admin has confirmed the transfer, so its
          presence is itself the proof that the payment was verified. */}
      {view.invoiceNumber ? (
        <Row label="Nomor Invoice" value={view.invoiceNumber} mono />
      ) : null}
      {view.paidAt ? (
        <Row label="Dibayar pada" value={formatDate(view.paidAt.slice(0, 10))} />
      ) : null}
      <div className="flex items-baseline justify-between gap-4 bg-canvas-deep/40 px-4 py-3.5">
        <dt className="font-bold text-ink">Total</dt>
        <dd className="text-lg font-extrabold text-brand">{formatRupiah(view.amount)}</dd>
      </div>
    </dl>
  );

  if (view.paymentMethod === "NONE") {
    return (
      <div className="space-y-6">
        {summary}
        <EmptyState
          icon={<CircleCheckBig className="size-6" aria-hidden />}
          title="Kelas ini tidak memerlukan pembayaran"
          description="Pendaftaran sudah terkonfirmasi. Sampai jumpa di lokasi!"
          action={
            <Link href={`/event/${event?.slug ?? ""}`} className={buttonStyles()}>
              Lihat Detail Kelas
            </Link>
          }
        />
      </div>
    );
  }

  if (view.paymentStatus === "PAID") {
    return (
      <div className="space-y-6">
        <div className="rounded-card border border-pine/25 bg-pine-soft/60 p-6 text-center sm:p-8">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-pine text-white">
            <CircleCheckBig className="size-8" aria-hidden />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold text-ink sm:text-3xl">
            Pembayaran Terverifikasi
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
            Pendaftaran {view.registrationNumber} sudah lunas. Sampai jumpa di{" "}
            {event?.location.venue}!
          </p>
          {view.invoiceNumber ? (
            <p className="mx-auto mt-3 inline-block rounded-xl border border-pine/20 bg-surface px-4 py-2 text-sm font-semibold text-ink">
              Nomor invoice:{" "}
              <span className="font-mono font-bold">{view.invoiceNumber}</span>
            </p>
          ) : null}
        </div>
        {summary}
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Link
            href={`/attendance/${event?.slug ?? ""}`}
            className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
          >
            Check-in Kehadiran
          </Link>
          <Link
            href={`/event/${event?.slug ?? ""}`}
            className={buttonStyles({ variant: "secondary", size: "lg", className: "w-full sm:w-auto" })}
          >
            Detail Kelas
          </Link>
        </div>
      </div>
    );
  }

  if (view.paymentMethod === "THIRD_PARTY") {
    return (
      <div className="space-y-6">
        <div className="rounded-card border border-sky/25 bg-sky-soft/60 p-6">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
            <ExternalLink className="size-5 text-sky" aria-hidden />
            Pembayaran di Platform Mitra
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Kelas ini tidak diproses pembayarannya di situs Kelas Bermain. Selesaikan
            pembayaran di platform mitra, lalu panitia akan memperbarui status pendaftaranmu.
          </p>
        </div>
        {summary}
        {event?.registration.thirdPartyUrl ? (
          <a
            href={event.registration.thirdPartyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
          >
            Buka Platform Mitra
            <ExternalLink className="size-4" aria-hidden />
          </a>
        ) : null}
      </div>
    );
  }

  /** Uploads the screenshot, then records the claim in one step. */
  async function handleProofFile(files: FileList | null) {
    const file = files?.[0];
    if (!file || markingProof) return;

    setProofError(null);
    setMarkingProof(true);
    const result = await uploadPaymentProof(accessToken, file);
    setMarkingProof(false);
    if (proofInputRef.current) proofInputRef.current.value = "";

    if (!result.ok) {
      setProofError(result.error);
      return;
    }
    await load();
  }

  /** Records the claim without a file, for proof sent over WhatsApp. */
  async function handleProofSent() {
    if (markingProof) return;
    setProofError(null);
    setMarkingProof(true);
    const result = await submitProof(accessToken);
    setMarkingProof(false);
    // Reload either way: if the call failed the page should show the real
    // state rather than pretending the claim landed.
    if (!result.ok) {
      setProofError(result.error);
      return;
    }
    await load();
  }

  const proofWhatsappUrl = paymentProofWhatsappUrl({
    registrationNumber: view.registrationNumber,
    companionName: view.customerFullName,
    childName: view.childFullName,
  });

  const rejected = view.paymentStatus === "FAILED";
  const waiting = view.paymentStatus === "WAITING_VERIFICATION";

  if (waiting) {
    return (
      <div className="space-y-6">
        {/* Amber, never green. The money has not been confirmed received —
            saying "berhasil" here would be a promise the system cannot keep,
            and a parent who believes it stops watching for our message. */}
        <div className="rounded-card border border-sun/40 bg-sun-soft/60 p-6 text-center sm:p-8">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-sun text-ink">
            <Clock3 className="size-8" aria-hidden />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold text-ink sm:text-3xl">
            Terima kasih sudah mendaftar
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
            Bukti transfermu sudah kami terima dan sedang diperiksa tim Kelas Bermain.
            Konfirmasinya kami kirim lewat WhatsApp, biasanya pada jam kerja.
          </p>
          <p className="mx-auto mt-4 inline-block rounded-xl border border-sun/30 bg-surface px-4 py-2 text-sm font-semibold text-ink">
            Nomor pendaftaran:{" "}
            <span className="font-mono font-bold">{view.registrationNumber}</span>
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Simpan nomor itu. Kapan pun kamu ingin tahu statusnya, cek lewat menu Cek Tiket.
          </p>
        </div>

        {summary}

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/cek-tiket"
            className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
          >
            Cek Status Tiket
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className={buttonStyles({
              variant: "secondary",
              size: "lg",
              className: "w-full sm:w-auto",
            })}
          >
            <RotateCw className="size-4" aria-hidden />
            Muat Ulang Status
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summary}

      {rejected ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand-soft p-4 text-sm font-medium text-brand-ink"
        >
          <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          Bukti transfer sebelumnya belum bisa diverifikasi. Silakan kirim ulang lewat
          WhatsApp di bawah.
        </p>
      ) : null}

      <BankTransferPanel
        amount={view.amount}
        registrationNumber={view.registrationNumber}
        eventTitle={event?.title ?? "Kelas Bermain"}
        childName={view.childFullName}
      />

      {/* Two ways in: upload the screenshot here, or send it over WhatsApp
          where the team already works. Either way this only records that proof
          was handed in — it can never mark the payment settled, which stays an
          admin decision. */}
      <div className="rounded-card border border-brand/25 bg-brand-soft/35 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-ink">
          <Upload className="size-4 text-brand" aria-hidden />
          Sudah transfer? Kirim buktinya
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Unggah foto atau tangkapan layar bukti transfer langsung di sini, atau kirim lewat
          WhatsApp kalau lebih mudah. Nomor pendaftaranmu sudah kami siapkan di pesannya.
        </p>

        <div className="mt-4 rounded-xl border border-dashed border-brand/40 bg-surface p-4">
          <label
            htmlFor="paymentProof"
            className="text-sm font-bold text-ink"
          >
            Unggah bukti transfer
          </label>
          <input
            ref={proofInputRef}
            id="paymentProof"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            disabled={markingProof}
            onChange={(e) => void handleProofFile(e.target.files)}
            className="mt-2 block w-full text-sm text-ink-soft file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-pill file:border-0 file:bg-brand file:px-4 file:text-sm file:font-bold file:text-white disabled:opacity-60"
          />
          <p className="mt-2 text-xs text-muted">
            JPG, PNG, WEBP, atau PDF. Maksimal 5 MB. Hanya tim Kelas Bermain yang bisa
            melihat berkas ini.
          </p>
          {proofError ? (
            <p role="alert" className="mt-2 text-xs font-semibold text-brand-ink">
              {proofError}
            </p>
          ) : null}
        </div>

        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">
          Atau lewat WhatsApp
        </p>

        <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
          <a
            href={proofWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void handleProofSent()}
            className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
          >
            <MessageCircle className="size-4" aria-hidden />
            Kirim Bukti via WhatsApp
          </a>
          <button
            type="button"
            onClick={() => void handleProofSent()}
            disabled={markingProof}
            className={buttonStyles({
              variant: "secondary",
              size: "lg",
              className: "w-full sm:w-auto",
            })}
          >
            {markingProof ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Saya Sudah Kirim Bukti
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted">
          Setelah menekan salah satunya, status berubah jadi menunggu pemeriksaan. Tim kami
          yang memastikan dananya masuk sebelum pendaftaran dinyatakan lunas.
        </p>
      </div>

      <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <h3 className="text-base font-extrabold text-ink">Status saat ini</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Menunggu pembayaran. Setelah kami menerima dan memverifikasi bukti transfer lewat
          WhatsApp, halaman ini akan menunjukkan status lunas.
        </p>
        {view.paymentExpiresAt ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <Clock3 className="size-3.5" aria-hidden />
            Selesaikan sebelum {formatDate(view.paymentExpiresAt)}.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void load()}
          className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-4" })}
        >
          <RotateCw className="size-3.5" aria-hidden />
          Muat Ulang Status
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`text-right font-semibold text-ink ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
