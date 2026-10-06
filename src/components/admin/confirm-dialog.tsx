"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Wraps a server action in a confirmation step. The action only runs after
 * the admin reads the summary and confirms — used for anything that moves
 * money or writes an audit trail.
 */
export function ConfirmDialog({
  action,
  hidden,
  trigger,
  title,
  description,
  summary,
  confirmLabel,
  tone = "brand",
  reasonField,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
  trigger: string;
  title: string;
  description: string;
  summary: { label: string; value: string }[];
  confirmLabel: string;
  tone?: "brand" | "danger";
  reasonField?: { name: string; label: string; placeholder: string };
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-9 items-center rounded-pill px-3 text-xs font-bold transition-colors",
          tone === "danger"
            ? "border border-line text-ink-soft hover:border-brand/40 hover:text-brand"
            : "bg-brand text-white hover:bg-brand-dark",
        )}
      >
        {trigger}
      </button>

      {open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/70 p-4"
              onClick={() => !submitting && setOpen(false)}
            >
              <form
                action={action}
                onSubmit={() => setSubmitting(true)}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-md rounded-card bg-canvas p-5 shadow-lift sm:p-6"
              >
                {Object.entries(hidden).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}

                <h2 className="text-base font-extrabold text-ink">{title}</h2>
                <p className="mt-1.5 text-sm text-muted">{description}</p>

                <dl className="mt-4 space-y-2 rounded-xl border border-line bg-surface p-4 text-sm">
                  {summary.map((item) => (
                    <div key={item.label} className="flex items-baseline justify-between gap-4">
                      <dt className="text-muted">{item.label}</dt>
                      <dd className="text-right font-semibold text-ink">{item.value}</dd>
                    </div>
                  ))}
                </dl>

                {reasonField ? (
                  <label className="mt-4 block text-sm font-semibold text-ink">
                    {reasonField.label}
                    <input
                      name={reasonField.name}
                      required
                      placeholder={reasonField.placeholder}
                      className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 text-[0.9375rem] text-ink"
                    />
                  </label>
                ) : null}

                <div className="mt-5 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                    className="inline-flex min-h-10 items-center rounded-pill border border-line px-4 text-sm font-semibold text-ink-soft"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-brand px-4 text-sm font-semibold text-white"
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                    {confirmLabel}
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
