import { CircleCheck, ExternalLink, FolderOpen, Info } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/date";

/**
 * The gallery page links out to a Drive folder rather than hosting a grid.
 * With no URL configured yet, this renders an explicit "not set" state so the
 * page never ships a dead link.
 */
export function DriveLinkCard({
  drive,
}: {
  drive: {
    title: string;
    description: string;
    url: string;
    updatedAt: string;
    contents: readonly string[];
    buttonLabel?: string;
  };
}) {
  const configured = drive.url.trim().length > 0;
  const buttonLabel = drive.buttonLabel?.trim() || "Buka Google Drive";

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:gap-6 sm:p-8">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand sm:size-16">
          <FolderOpen className="size-7 sm:size-8" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-extrabold leading-snug text-ink sm:text-2xl">
            {drive.title}
          </h3>
          <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted">
            {drive.description}
          </p>

          <ul className="mt-5 space-y-2">
            {drive.contents.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-soft"
              >
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-pine" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            {configured ? (
              <a
                href={drive.url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
              >
                <FolderOpen className="size-4" aria-hidden />
                {buttonLabel}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-pill bg-canvas-deep px-7 text-base font-semibold text-muted sm:w-auto"
              >
                <FolderOpen className="size-4" aria-hidden />
                {buttonLabel}
              </span>
            )}

            <p className="text-xs text-muted">
              Terakhir diperbarui {formatDate(drive.updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {configured ? null : (
        <p className="flex items-start gap-2.5 border-t border-line bg-sun-soft/60 px-6 py-4 text-xs leading-relaxed text-sun-dark sm:px-8">
          <Info className="mt-px size-4 shrink-0" aria-hidden />
          <span>
            Tautan folder Drive belum diisi. Admin dapat mengisinya lewat variabel
            lingkungan{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 font-bold">
              NEXT_PUBLIC_GALLERY_DRIVE_URL
            </code>{" "}
            atau pada berkas <code className="font-bold">src/data/gallery.ts</code>.
          </span>
        </p>
      )}
    </div>
  );
}
