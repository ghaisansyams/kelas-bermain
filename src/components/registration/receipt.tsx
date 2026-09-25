"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarPlus,
  CircleCheckBig,
  CreditCard,
  ExternalLink,
  Info,
  Printer,
} from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import type { RegistrationBatch } from "@/lib/services/registration";
import type { EventView } from "@/lib/types";
import { formatDate, formatDateRange } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

/**
 * Success state after a registration is created.
 *
 * Shows every registration number produced by the batch (one per child) and
 * routes the family to whatever comes next: pay here, pay at the partner, or
 * nothing at all for a free class.
 */
export function RegistrationReceipt({
  event,
  batch,
  parentName,
}: {
  event: EventView;
  batch: RegistrationBatch;
  parentName: string;
}) {
  const lead = batch.registrations[0];
  const isFree = batch.paymentMethod === "NONE";
  const isThirdParty = batch.paymentMethod === "THIRD_PARTY";

  function addToCalendar() {
    const stamp = (value: string) => value.replace(/-/g, "");
    const end = new Date(event.endDate);
    end.setDate(end.getDate() + 1);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Kelas Bermain//Registrasi//ID",
      "BEGIN:VEVENT",
      `UID:${lead.registrationNumber}@kelasbermain`,
      `DTSTART;VALUE=DATE:${stamp(event.startDate)}`,
      `DTEND;VALUE=DATE:${stamp(end.toISOString().slice(0, 10))}`,
      `SUMMARY:${event.title} — Kelas Bermain`,
      `LOCATION:${event.location.venue}, ${event.location.city}`,
      `DESCRIPTION:Nomor pendaftaran ${lead.registrationNumber}. Jam ${event.timeStart}-${event.timeEnd} ${event.timezone}.`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${lead.registrationNumber}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="print-area rounded-card border border-pine/25 bg-pine-soft/60 p-6 text-center sm:p-8">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-pine text-white motion-safe:animate-fade-up">
          <CircleCheckBig className="size-8" aria-hidden />
        </span>
        <h2 className="mt-5 text-2xl font-extrabold text-ink sm:text-3xl">
          Registrasi Berhasil!
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
          {isFree
            ? "Tempat sudah kami simpan. Detail kegiatan dikirimkan ke kontak yang kamu berikan."
            : "Pendaftaran tercatat. Selesaikan pembayaran agar tempatnya terkunci."}
        </p>

        <dl className="mx-auto mt-6 max-w-md space-y-3 rounded-2xl border border-pine/20 bg-surface p-4 text-left text-sm">
          <Line label="Kelas" value={event.title} />
          <Line label="Tanggal" value={formatDateRange(event.startDate, event.endDate)} />
          <Line
            label="Lokasi"
            value={`${event.location.venue}, ${event.location.city}`}
          />
          <Line label="Orang tua" value={parentName} />
          <Line label="Nomor customer" value={batch.customerNumber} mono />
          <Line
            label="Status pembayaran"
            value={
              isFree
                ? "Tidak diperlukan"
                : isThirdParty
                  ? "Menunggu konfirmasi mitra"
                  : "Menunggu pembayaran"
            }
          />
          {!isFree ? (
            <Line label="Total" value={formatRupiah(batch.totalAmount)} />
          ) : null}
        </dl>

        <div className="mx-auto mt-4 max-w-md space-y-2.5">
          {batch.registrations.map((registration, index) => (
            <div
              key={registration.id}
              className="rounded-2xl border border-pine/20 bg-surface p-4 text-left"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Nomor Pendaftaran · Anak {index + 1}
              </p>
              <p className="mt-1 font-mono text-base font-extrabold tracking-tight text-ink">
                {registration.registrationNumber}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment routing */}
      {!isFree && batch.payment ? (
        <div className="no-print rounded-card border border-sun/30 bg-sun-soft/50 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-ink">
            <CreditCard className="size-5 text-sun-dark" aria-hidden />
            {isThirdParty ? "Pembayaran di Platform Mitra" : "Selesaikan Pembayaran"}
          </h3>

          <ol className="mt-4 space-y-2.5">
            {batch.payment.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sun-dark/15 text-xs font-bold text-sun-dark">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            {isThirdParty && batch.payment.redirectUrl ? (
              <a
                href={batch.payment.redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
              >
                Lanjut ke Platform Mitra
                <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : (
              <Link
                href={`/payment/${lead.registrationNumber}`}
                className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
              >
                Bayar Sekarang
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            {batch.payment.note}
          </p>
        </div>
      ) : null}

      {/* Next steps */}
      <div className="no-print rounded-card border border-line bg-surface p-5 sm:p-6">
        <h3 className="text-base font-extrabold text-ink">Langkah berikutnya</h3>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
          <li>
            Datang ke {event.location.venue}, {event.location.city} pada{" "}
            {formatDate(event.startDate)} pukul {event.timeStart} {event.timezone}.
          </li>
          <li>
            Isi kehadiran lewat halaman check-in menggunakan nomor pendaftaran di atas.
          </li>
          {event.certificate.available ? (
            <li>Setelah kehadiran tercatat, e-sertifikat anak bisa langsung diunduh.</li>
          ) : null}
        </ul>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={addToCalendar}
            className={buttonStyles({ variant: "secondary", className: "w-full sm:w-auto" })}
          >
            <CalendarPlus className="size-4" aria-hidden />
            Tambah ke Kalender
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className={buttonStyles({ variant: "secondary", className: "w-full sm:w-auto" })}
          >
            <Printer className="size-4" aria-hidden />
            Download Bukti Registrasi
          </button>
          <Link
            href={`/attendance/${event.slug}`}
            className={buttonStyles({ variant: "secondary", className: "w-full sm:w-auto" })}
          >
            Check-in Kehadiran
          </Link>
          <Link
            href={`/event/${event.slug}`}
            className={buttonStyles({ variant: "ghost", className: "w-full sm:w-auto" })}
          >
            Detail Kelas
          </Link>
        </div>
      </div>

      <p className="no-print rounded-xl bg-canvas-deep/60 p-4 text-xs leading-relaxed text-muted">
        Catatan versi demo: data pendaftaran ini disimpan sementara di peramban kamu dan
        belum terhubung ke basis data produksi.
      </p>
    </div>
  );
}

function Line({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`text-right font-semibold text-ink ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
