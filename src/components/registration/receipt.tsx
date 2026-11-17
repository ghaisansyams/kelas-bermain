"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Confetti } from "@/components/ui/playful";
import type { RegistrationBatch } from "@/lib/services/registration";
import type { EventView } from "@/lib/types";
import { formatDateRange } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

/**
 * "Konfirmasi" step content (the last step of the form). The registration/payment rows are already
 * created by this point (PENDING for a paid class) — this never claims a
 * payment succeeded, since nothing here can actually verify one. Marking a
 * payment PAID is an admin's job, done on the Pembayaran page after the
 * transfer proof has been checked.
 */
export function RegistrationReceipt({
  event,
  batch,
  parentName,
  whatsappUrl,
}: {
  event: EventView;
  batch: RegistrationBatch;
  parentName: string;
  /** Pesan lengkap ke admin; disusun pemanggil yang memegang data pendaftarnya. */
  whatsappUrl: string;
}) {
  const lead = batch.registrations[0];
  const isFree = batch.paymentMethod === "NONE";

  // Harga penuh = tanpa diskon dan voucher, dengan biaya pendamping tambahan
  // tetap ikut (biaya itu memang tidak didiskon).
  const pricing = batch.pricing;
  const fullPrice = pricing.subtotal + pricing.extraCompanionTotal;
  const savings = Math.max(0, fullPrice - batch.totalAmount);
  const savingsNote = [pricing.discountLabel, pricing.voucher?.label].filter(Boolean).join(" + ");

  // Nothing here is finished yet, so nothing here is green. A tick reads as
  // "done" to a parent, and the team has not confirmed anything — a paid
  // class still needs the transfer verified, and a free one still needs the
  // seat confirmed. Settled is a state only the ERP may declare, and the
  // parent watches for it on Cek Tiket.
  const headline = isFree
    ? "Mohon Tunggu Konfirmasi Pendaftaran"
    : "Mohon Segera Melakukan Pembayaran";

  const standfirst = isFree
    ? "Registrasi Anda telah berhasil kami terima. Tim Kelas Bermain akan mengonfirmasi ketersediaan tempat, dan status terbarunya dapat Anda pantau melalui halaman Cek Tiket."
    : "Registrasi Anda telah berhasil kami terima. Mohon segera melakukan pembayaran dan menunggu konfirmasi dari Kelas Bermain. Status terbarunya dapat Anda pantau kapan saja melalui halaman Cek Tiket.";

  return (
    <div className="space-y-6">
      <div className="relative rounded-card border border-sun/40 bg-sun-soft/60 p-6 text-center sm:p-8">
        {/* Letusan konfeti sekali, tepat saat pendaftaran berhasil tercatat. */}
        <Confetti />
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
            value={isFree ? "Tidak diperlukan" : "Menunggu konfirmasi"}
          />
          {!isFree ? (
            <Line
              label="Total"
              value={formatRupiah(batch.totalAmount)}
              // Harga sebelum diskon dicoret kalau ada potongan (affiliate,
              // sibling, group, atau voucher), supaya orang tua melihat
              // bahwa angkanya sudah dikurangi.
              struck={savings > 0 ? formatRupiah(fullPrice) : undefined}
              note={savings > 0 ? savingsNote : undefined}
            />
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

        {/* Tombol Selesai ada di luar kartu ini, di bawah kanan. Yang di sini hanya
            penjelasannya. */}
        <p className="mt-5 text-xs leading-relaxed text-muted">
          {isFree
            ? "Klik Selesai untuk mengirim rincian pendaftaran ke tim Kelas Bermain lewat WhatsApp. "
            : "Klik Selesai untuk mengirim rincian pendaftaran dan melakukan pembayaran lewat WhatsApp. "}
          Simpan nomor pendaftaran di atas. Masukkan nomor tersebut di halaman Cek Tiket untuk
          melihat status terbaru pendaftaran Anda.
        </p>
      </div>

      {!isFree ? (
        <p className="text-center text-xs text-muted">
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

      {/* Selesai membuka WhatsApp ke admin dengan rincian pendaftaran (dan
          rekening, untuk kelas berbayar). WhatsApp tidak terbuka sendiri saat
          berpindah dari Data Peserta ke sini; baru terbuka lewat klik ini. */}
      <div className="flex justify-end">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles({ size: "lg", className: "w-full sm:w-auto sm:min-w-40" })}
        >
          Selesai
        </a>
      </div>
    </div>
  );
}

function Line({
  label,
  value,
  mono,
  struck,
  note,
}: {
  label: string;
  value: string;
  mono?: boolean;
  /** Harga sebelum dikurangi; tampil dicoret di sebelah `value`. */
  struck?: string;
  /** Keterangan kecil di bawah angka, mis. nama diskonnya. */
  note?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`text-right font-semibold text-ink ${mono ? "font-mono" : ""}`}>
        {struck ? (
          <span className="mr-2 font-medium text-muted line-through decoration-brand/70">
            {struck}
          </span>
        ) : null}
        {value}
        {note ? <span className="block text-xs font-semibold text-pine-dark">{note}</span> : null}
      </dd>
    </div>
  );
}
