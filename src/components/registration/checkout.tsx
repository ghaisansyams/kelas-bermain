"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CircleCheckBig,
  Clock3,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { childrenRepo, customersRepo } from "@/lib/repositories";
import type { Payment, Registration } from "@/lib/repositories/types";
import { events } from "@/data/events";
import { getPaymentByRegistration, settlePayment } from "@/lib/services/payment";
import { getRegistration } from "@/lib/services/registration";
import { formatDate } from "@/lib/utils/date";
import { BankTransferPanel } from "@/components/registration/bank-transfer";
import { formatRupiah } from "@/lib/utils/format";

/**
 * Mock checkout.
 *
 * Settles through `lib/services/payment.ts`; no real gateway is contacted. The
 * failure button exists so the FAILED branch can be demonstrated rather than
 * described.
 */
export function Checkout({ registrationRef }: { registrationRef: string }) {
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const found = await getRegistration(registrationRef);
    setRegistration(found);
    setPayment(found ? await getPaymentByRegistration(found.id) : null);
    setLoading(false);
  }, [registrationRef]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pay(outcome: "PAID" | "FAILED") {
    if (!registration) return;
    setWorking(true);
    setError(null);
    const result = await settlePayment(registration.id, outcome);
    setWorking(false);
    if (!result.ok) {
      setError(result.error);
      await load();
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (!registration) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-6" aria-hidden />}
        title="Pendaftaran tidak ditemukan"
        description={`Nomor ${registrationRef} tidak terdaftar. Periksa kembali nomor pendaftaran yang kamu terima.`}
        action={
          <Link href="/event" className={buttonStyles()}>
            Lihat Daftar Kelas
          </Link>
        }
      />
    );
  }

  const event = events.find((e) => e.id === registration.eventId);
  const child = childrenRepo.find(registration.childId);
  const customer = customersRepo.find(registration.customerId);
  const siblings = registration
    ? // Everyone registered by the same family for the same class shares one payment.
      [registration]
    : [];

  if (!payment || registration.paymentMethod === "NONE") {
    return (
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
    );
  }

  if (payment.status === "PAID") {
    return (
      <div className="space-y-6">
        <div className="rounded-card border border-pine/25 bg-pine-soft/60 p-6 text-center sm:p-8">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-pine text-white">
            <CircleCheckBig className="size-8" aria-hidden />
          </span>
          <h2 className="mt-5 text-2xl font-extrabold text-ink sm:text-3xl">
            Pembayaran Berhasil
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
            Pendaftaran {registration.registrationNumber} sudah terkonfirmasi. Sampai jumpa
            di {event?.location.venue}!
          </p>
          <p className="mx-auto mt-4 inline-block rounded-xl border border-pine/20 bg-surface px-4 py-2 font-mono text-sm font-bold text-ink">
            {payment.paymentNumber}
          </p>
        </div>

        <Summary
          event={event?.title ?? "—"}
          date={event ? formatDate(event.startDate) : "—"}
          parent={customer?.fullName ?? "—"}
          child={child?.fullName ?? "—"}
          quantity={siblings.length}
          amount={payment.amount}
          status="Lunas"
        />

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Link
            href={`/attendance/${event?.slug ?? ""}`}
            className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
          >
            Check-in Kehadiran
          </Link>
          <Link
            href={`/event/${event?.slug ?? ""}`}
            className={buttonStyles({
              variant: "secondary",
              size: "lg",
              className: "w-full sm:w-auto",
            })}
          >
            Detail Kelas
          </Link>
        </div>
      </div>
    );
  }

  if (payment.method === "THIRD_PARTY") {
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

        <Summary
          event={event?.title ?? "—"}
          date={event ? formatDate(event.startDate) : "—"}
          parent={customer?.fullName ?? "—"}
          child={child?.fullName ?? "—"}
          quantity={siblings.length}
          amount={payment.amount}
          status="Menunggu konfirmasi mitra"
        />

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

  const expired = payment.status === "EXPIRED";
  const failed = payment.status === "FAILED";

  return (
    <div className="space-y-6">
      <Summary
        event={event?.title ?? "—"}
        date={event ? formatDate(event.startDate) : "—"}
        parent={customer?.fullName ?? "—"}
        child={child?.fullName ?? "—"}
        quantity={siblings.length}
        amount={payment.amount}
        status={
          expired ? "Kedaluwarsa" : failed ? "Gagal" : "Menunggu pembayaran"
        }
      />

      {failed || error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand-soft p-4 text-sm font-medium text-brand-ink"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error ?? "Pembayaran sebelumnya gagal diproses. Silakan coba lagi."}
        </p>
      ) : null}

      {/* The team's own transfer wording and real accounts, shared with the
          registration receipt so the site and WhatsApp never disagree. */}
      <BankTransferPanel
        amount={payment.amount}
        registrationNumber={registration.registrationNumber}
        eventTitle={event?.title ?? "Kelas Bermain"}
        childName={child?.fullName}
      />

      <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <h3 className="text-base font-extrabold text-ink">Status pembayaran</h3>

        {payment.expiresAt ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <Clock3 className="size-3.5" aria-hidden />
            Selesaikan sebelum {formatDate(payment.expiresAt)}.
          </p>
        ) : null}

        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Berita transfer:{" "}
          <span className="font-mono font-bold text-ink">
            {registration.registrationNumber}
          </span>
        </p>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Button size="lg" onClick={() => pay("PAID")} disabled={working} className="w-full sm:w-auto">
            {working ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Memproses…
              </>
            ) : (
              <>
                <CreditCard className="size-4" aria-hidden />
                Saya Sudah Transfer
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => pay("FAILED")}
            disabled={working}
            className="w-full sm:w-auto"
          >
            Simulasikan Pembayaran Gagal
          </Button>
        </div>

        <p className="mt-4 rounded-xl bg-canvas-deep/60 p-3.5 text-xs leading-relaxed text-muted">
          Catatan versi demo: menekan tombol di atas langsung menandai pembayaran lunas.
          Alur sungguhnya — unggah bukti transfer lalu diverifikasi admin — menunggu
          penyimpanan berkas (PRD F10/F11).
        </p>
      </div>
    </div>
  );
}

function Summary({
  event,
  date,
  parent,
  child,
  quantity,
  amount,
  status,
}: {
  event: string;
  date: string;
  parent: string;
  child: string;
  quantity: number;
  amount: number;
  status: string;
}) {
  return (
    <dl className="divide-y divide-line rounded-card border border-line bg-surface text-sm">
      <Row label="Kelas" value={event} />
      <Row label="Tanggal" value={date} />
      <Row label="Pendamping" value={parent} />
      <Row label="Anak" value={child} />
      <Row label="Jumlah" value={`${quantity} peserta`} />
      <Row label="Status" value={status} />
      <div className="flex items-baseline justify-between gap-4 bg-canvas-deep/40 px-4 py-3.5">
        <dt className="font-bold text-ink">Total</dt>
        <dd className="text-lg font-extrabold text-brand">{formatRupiah(amount)}</dd>
      </div>
    </dl>
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
