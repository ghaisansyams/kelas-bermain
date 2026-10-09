"use client";

import Link from "next/link";
import {
  CalendarPlus,
  Clock,
  CreditCard,
  ExternalLink,
  Info,
  Printer,
  Ticket,
} from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import type { RegistrationBatch } from "@/lib/services/registration";
import type { EventView } from "@/lib/types";
import { certificatesEnabled } from "@/lib/features";
import { formatDate, formatDateRange } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

/**
 * "Selesai" step content. The registration/payment rows are already
 * created by this point (PENDING for a paid class) — this never claims a
 * payment succeeded, since nothing here can actually verify one. Marking a
 * payment PAID is admin's job today, and will be the future ERP's job later;
 * see the note on set_payment_status in supabase/schema.sql.
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

  // Nothing here is finished yet, so nothing here is green. A tick reads as
  // "done" to a parent, and the team has not confirmed anything — a paid
  // class still needs the transfer verified, and a free one still needs the
  // seat confirmed. Settled is a state only the ERP may declare, and the
  // parent watches for it on Cek Tiket.
  const headline = isFree
    ? "Mohon Tunggu Konfirmasi Pendaftaran"
    : "Mohon Tunggu Konfirmasi Pembayaran";

  const standfirst = isFree
    ? "Registrasi Anda telah berhasil kami terima. Tim Kelas Bermain akan mengonfirmasi ketersediaan tempat, dan status terbarunya dapat Anda pantau melalui halaman Cek Tiket."
    : isThirdParty
      ? "Registrasi Anda telah berhasil kami terima. Pembayaran diselesaikan di platform mitra, dan status terbarunya dapat Anda pantau melalui halaman Cek Tiket."
      : "Registrasi Anda telah berhasil kami terima. Mohon menunggu konfirmasi pembayaran dari tim Kelas Bermain. Status terbarunya dapat Anda pantau kapan saja melalui halaman Cek Tiket.";

  return (
    <div className="space-y-6">
      <div className="print-area rounded-card border border-sun/40 bg-sun-soft/60 p-6 text-center sm:p-8">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-sun-dark text-white motion-safe:animate-fade-up">
          <Clock className="size-8" aria-hidden />
        </span>
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-pill bg-sun-dark/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-sun-dark">
          Menunggu Konfirmasi
        </p>
        <h2 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">{headline}</h2>
        <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
          {standfirst}
        </p>

        <dl className="mx-auto mt-6 max-w-md space-y-3 rounded-2xl border border-sun/30 bg-surface p-4 text-left text-sm">
          <Line label="Kelas" value={event.title} />
          <Line label="Tanggal" value={formatDateRange(event.startDate, event.endDate)} />
          <Line
            label="Lokasi"
            value={`${event.location.venue}, ${event.location.city}`}
          />
          <Line label="Pendamping" value={parentName} />
          <Line label="Nomor customer" value={batch.customerNumber} mono />
          <Line
            label="Status pembayaran"
            value={
              isFree
                ? "Tidak diperlukan"
                : isThirdParty
                  ? "Menunggu konfirmasi mitra"
                  : "Menunggu konfirmasi"
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
              className="rounded-2xl border border-sun/30 bg-surface p-4 text-left"
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

        {/* The number above is the only thing a parent needs to look the
            registration up later, so the way to use it sits right beneath
            it rather than somewhere further down the page. */}
        <div className="no-print mt-5">
          <Link
            href="/cek-tiket"
            className={buttonStyles({
              variant: "secondary",
              size: "lg",
              className: "w-full sm:w-auto",
            })}
          >
            <Ticket className="size-4" aria-hidden />
            Cek Status di Cek Tiket
          </Link>
          <p className="mt-2.5 text-xs leading-relaxed text-muted">
            Simpan nomor pendaftaran di atas. Masukkan nomor tersebut di halaman Cek Tiket
            untuk melihat status terbaru pendaftaran Anda.
          </p>
        </div>
      </div>

      {/* Payment routing */}
      {!isFree && isThirdParty && batch.payment ? (
        <div className="no-print rounded-card border border-sun/30 bg-sun-soft/50 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-ink">
            <CreditCard className="size-5 text-sun-dark" aria-hidden />
            Pembayaran di Platform Mitra
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

          {batch.payment.redirectUrl ? (
            <div className="mt-5">
              <a
                href={batch.payment.redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
              >
                Lanjut ke Platform Mitra
                <ExternalLink className="size-4" aria-hidden />
              </a>
            </div>
          ) : null}

          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            {batch.payment.note}
          </p>
        </div>
      ) : null}

      {!isFree ? (
        <p className="no-print text-center text-xs text-muted">
          Simpan halaman ini atau{" "}
          <Link
            href={`/payment/${lead.accessToken}`}
            className="font-semibold text-brand hover:underline"
          >
            buka status pendaftaran
          </Link>{" "}
          kapan pun untuk melihatnya lagi.
        </p>
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
          {certificatesEnabled && event.certificate.available ? (
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
