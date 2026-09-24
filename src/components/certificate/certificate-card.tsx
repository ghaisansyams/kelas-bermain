import { LogoMark } from "@/components/brand/logo";
import type { CertificateRecord } from "@/lib/repositories/types";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/date";

/**
 * Printable certificate.
 *
 * Sized with container-query units so the whole document scales as one piece —
 * it stays legible from a 360px phone up to a printed A4 landscape sheet.
 */
export function CertificateCard({
  certificate,
  className,
}: {
  certificate: CertificateRecord;
  className?: string;
}) {
  const playful = certificate.template === "playful";

  return (
    <div className={cn("@container w-full", className)}>
      <article
        style={{ fontSize: "2.05cqw" }}
        className={cn(
          "relative aspect-[1.414/1] w-full overflow-hidden rounded-[1.2em] bg-surface shadow-lift",
          "ring-1 ring-line",
        )}
      >
        {/* Frame */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-[0.9em] rounded-[0.7em] border-[0.13em]",
            playful ? "border-brand/35" : "border-pine/30",
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-[1.25em] rounded-[0.5em] border",
            playful ? "border-sun/40" : "border-pine/15",
          )}
        />
        {/* Corner flourishes */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -left-[4em] -top-[4em] size-[8em] rounded-full blur-[2em]",
            playful ? "bg-sun/22" : "bg-pine/12",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -bottom-[4.5em] -right-[4em] size-[9em] rounded-full blur-[2.2em]",
            playful ? "bg-brand/18" : "bg-sun/16",
          )}
        />

        <div className="relative flex h-full flex-col items-center px-[3.2em] py-[2.4em] text-center">
          <header className="flex items-center gap-[0.55em]">
            <LogoMark className="size-[2.2em]" />
            <span className="text-[0.95em] font-extrabold tracking-tight text-ink">
              Kelas <span className="text-accent font-semibold text-brand">Bermain</span>
            </span>
          </header>

          {/* Body is centred in the space left between header and footer. */}
          <div className="flex flex-1 flex-col items-center justify-center">
          <p
            className={cn(
              "text-[0.62em] font-bold uppercase tracking-[0.42em]",
              playful ? "text-brand" : "text-pine",
            )}
          >
            Sertifikat Kepesertaan
          </p>

          <p className="mt-[1.4em] text-[0.62em] text-muted">Diberikan kepada</p>
          {/* A paragraph, not a heading: the page already owns the document h1. */}
          <p className="text-accent mt-[0.3em] max-w-[90%] text-[2.1em] leading-tight text-ink">
            {certificate.participantName}
          </p>
          <span
            aria-hidden
            className={cn(
              "mt-[0.6em] h-[0.09em] w-[7em] rounded-full",
              playful ? "bg-brand/50" : "bg-pine/40",
            )}
          />

          <p className="mt-[1.1em] max-w-[85%] text-[0.66em] leading-relaxed text-muted">
            atas partisipasi dan kontribusinya dalam kegiatan
          </p>
          <p className="mt-[0.35em] max-w-[88%] text-[0.95em] font-extrabold leading-snug text-ink">
            {certificate.eventTitle}
          </p>
          <p className="mt-[0.45em] text-[0.62em] text-muted">
            yang diselenggarakan pada {formatDate(certificate.eventDate)}
          </p>
          </div>

          <footer className="flex w-full items-end justify-between gap-[1.5em] pt-[1.2em]">
            <div className="text-left">
              <p className="text-[0.52em] font-bold uppercase tracking-[0.2em] text-muted">
                Nomor Sertifikat
              </p>
              <p className="mt-[0.15em] font-mono text-[0.78em] font-extrabold tracking-tight text-ink">
                {certificate.number}
              </p>
              <p className="mt-[0.3em] text-[0.5em] text-muted">
                Terbit {formatDate(certificate.issuedAt)}
              </p>
            </div>

            <div
              aria-hidden
              className={cn(
                "flex size-[3.6em] shrink-0 flex-col items-center justify-center rounded-full border-[0.11em] text-center",
                playful ? "border-brand/40 text-brand" : "border-pine/40 text-pine",
              )}
            >
              <span className="text-[0.44em] font-bold uppercase tracking-[0.12em]">
                Terverifikasi
              </span>
              <span className="mt-[0.1em] text-[0.62em] font-extrabold">KB</span>
            </div>

            <div className="text-right">
              <p className="text-accent text-[1.05em] leading-none text-ink/85">
                {certificate.signatory.name}
              </p>
              <span
                aria-hidden
                className="mt-[0.35em] block h-px w-[8em] bg-line"
              />
              <p className="mt-[0.3em] text-[0.55em] font-bold text-ink">
                {certificate.signatory.name}
              </p>
              <p className="text-[0.5em] text-muted">{certificate.signatory.role}</p>
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}
