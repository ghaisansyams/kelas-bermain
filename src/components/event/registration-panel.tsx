import Link from "next/link";
import {
  Award,
  CalendarCheck,
  CircleCheck,
  Clock3,
  Info,
  Users,
  Wallet,
} from "lucide-react";
import { availabilityLabel } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import type { EventView } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

/**
 * The registration box on the event detail template. Its contents are driven
 * entirely by the event record, so a free workshop and a paid camp both render
 * correctly without a bespoke page.
 */
export function RegistrationPanel({ event }: { event: EventView }) {
  const isPaid = event.registration.type === "PAID";
  const isOpen = event.availability === "open";
  const showAttendance = event.lifecycle !== "upcoming";

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
      <div className="border-b border-line bg-canvas-deep/40 px-5 py-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
          {isPaid ? "Biaya Registrasi" : "Registrasi"}
        </p>
        <p className="mt-1.5 flex items-baseline gap-2">
          <span className="text-3xl leading-none font-extrabold text-ink">
            {isPaid ? formatRupiah(event.registration.price ?? 0) : "Gratis"}
          </span>
          {isPaid ? (
            <span className="text-sm font-semibold text-muted">/ peserta</span>
          ) : null}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm">
          <span
            className={cn(
              "size-2 rounded-full",
              isOpen ? "bg-pine" : event.availability === "full" ? "bg-sun-dark" : "bg-muted",
            )}
            aria-hidden
          />
          <span className="font-semibold text-ink-soft">
            {availabilityLabel[event.availability]}
          </span>
        </p>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-ink-soft">
              <Users className="size-4 text-brand/70" aria-hidden />
              Kuota peserta
            </span>
            <span className="tabular-nums text-muted">
              {event.registered.toLocaleString("id-ID")} /{" "}
              {event.capacity.toLocaleString("id-ID")}
            </span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-pill bg-canvas-deep"
            role="progressbar"
            aria-valuenow={event.filledPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Kuota terisi"
          >
            <div
              className={cn(
                "h-full rounded-pill transition-[width] duration-700",
                event.filledPercent >= 100 ? "bg-sun-dark" : "bg-brand",
              )}
              style={{ width: `${Math.max(event.filledPercent, 4)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {event.seatsLeft > 0
              ? `Tersisa ${event.seatsLeft.toLocaleString("id-ID")} kursi`
              : "Kuota sudah terpenuhi"}
          </p>
        </div>

        <dl className="space-y-2.5 border-t border-line pt-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-muted">
              <Clock3 className="size-4 shrink-0 text-brand/70" aria-hidden />
              Batas daftar
            </dt>
            <dd className="text-right font-semibold text-ink">
              {formatDate(event.registration.deadline)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-muted">
              <Wallet className="size-4 shrink-0 text-brand/70" aria-hidden />
              Pembayaran
            </dt>
            <dd className="text-right font-semibold text-ink">
              {isPaid ? "Transfer manual" : "Tidak diperlukan"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-muted">
              <Award className="size-4 shrink-0 text-brand/70" aria-hidden />
              Sertifikat
            </dt>
            <dd className="text-right font-semibold text-ink">
              {event.certificate.available ? "Tersedia" : "Tidak tersedia"}
            </dd>
          </div>
        </dl>

        <div className="space-y-2.5 pt-1">
          {isOpen ? (
            <Link
              href={`/register/${event.slug}`}
              className={buttonStyles({ size: "lg", className: "w-full" })}
            >
              Daftar Sekarang
            </Link>
          ) : (
            <span
              aria-disabled
              className={cn(
                "inline-flex min-h-13 w-full items-center justify-center rounded-pill px-6 text-base font-semibold",
                event.availability === "full"
                  ? "bg-sun-soft text-sun-dark"
                  : "bg-canvas-deep text-muted",
              )}
            >
              {event.availability === "full" ? "Kuota Penuh" : "Pendaftaran Ditutup"}
            </span>
          )}

          {showAttendance ? (
            <Link
              href={`/attendance/${event.slug}`}
              className={buttonStyles({ variant: "secondary", className: "w-full" })}
            >
              <CalendarCheck className="size-4" aria-hidden />
              Submit Kehadiran
            </Link>
          ) : null}
        </div>

        {event.availability === "full" ? (
          <p className="flex items-start gap-2 rounded-xl bg-sun-soft/70 p-3 text-xs leading-relaxed text-sun-dark">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            Kuota sudah terpenuhi. Pantau Instagram @kelasbermain untuk pengumuman kursi
            tambahan atau gelaran berikutnya.
          </p>
        ) : null}

        {event.registration.notes && event.registration.notes.length > 0 ? (
          <ul className="space-y-2 border-t border-line pt-4">
            {event.registration.notes.map((note) => (
              <li key={note} className="flex items-start gap-2 text-xs leading-relaxed text-muted">
                <CircleCheck className="mt-px size-3.5 shrink-0 text-pine" aria-hidden />
                {note}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

/** Fixed action bar shown only on small screens. */
export function MobileRegistrationBar({ event }: { event: EventView }) {
  const isPaid = event.registration.type === "PAID";
  const isOpen = event.availability === "open";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
            {isPaid ? "Biaya registrasi" : "Registrasi"}
          </p>
          <p className="truncate text-lg leading-tight font-extrabold text-ink">
            {isPaid ? formatRupiah(event.registration.price ?? 0) : "Gratis"}
          </p>
        </div>
        {isOpen ? (
          <Link
            href={`/register/${event.slug}`}
            className={buttonStyles({ className: "shrink-0" })}
          >
            Daftar Sekarang
          </Link>
        ) : (
          <span
            aria-disabled
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center justify-center rounded-pill px-5 text-[0.9375rem] font-semibold",
              event.availability === "full"
                ? "bg-sun-soft text-sun-dark"
                : "bg-canvas-deep text-muted",
            )}
          >
            {event.availability === "full" ? "Kuota Penuh" : "Ditutup"}
          </span>
        )}
      </div>
    </div>
  );
}
