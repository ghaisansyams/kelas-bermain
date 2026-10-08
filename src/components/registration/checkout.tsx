"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CircleCheckBig,
  Clock3,
  ExternalLink,
  RotateCw,
  ShieldAlert,
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

  const rejected = view.paymentStatus === "FAILED";

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
