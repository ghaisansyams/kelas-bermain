"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getYoutubeEmbedUrl } from "@/lib/utils/youtube";
import { cn } from "@/lib/utils/cn";

/**
 * Shared "click a thumbnail, play a YouTube video in a popup" behaviour —
 * used by the home testimonial videos and the event detail video card, which
 * otherwise render completely different trigger UIs. The iframe is only
 * created once the modal opens (never on page load) and is unmounted on
 * close, so the video actually stops rather than playing on in the
 * background — that's `open ? <iframe/> : null`, not a hidden/paused one.
 */
export function YoutubeModal({
  youtubeUrl,
  title,
  triggerLabel,
  triggerClassName,
  children,
}: {
  youtubeUrl: string;
  /** Accessible name for the video, used as both the iframe title and the dialog label. */
  title: string;
  triggerLabel: string;
  triggerClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const embedUrl = getYoutubeEmbedUrl(youtubeUrl);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  if (!embedUrl) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        className={cn("group text-left", triggerClassName)}
      >
        {children}
      </button>

      {open
        ? createPortal(
            // Rendered into `document.body` rather than in place: a `fixed`
            // element nested inside anything with `will-change`/`transform`
            // (the `Reveal` wrapper on testimonial cards, for one) stops
            // being fixed to the viewport and gets trapped in that ancestor's
            // box instead — a portal sidesteps the whole class of bug.
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/80 p-4 sm:p-6"
              onClick={close}
            >
              <div
                className="relative w-full max-w-3xl overflow-hidden rounded-card bg-canvas shadow-lift motion-safe:animate-fade-up"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={close}
                  aria-label="Tutup video"
                  className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-ink/70 text-white transition-colors hover:bg-ink"
                >
                  <X className="size-5" aria-hidden />
                </button>
                <div className="aspect-video">
                  <iframe
                    src={embedUrl}
                    title={title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
