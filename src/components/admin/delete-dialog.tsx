"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

/**
 * Two-step delete.
 *
 * Step one is opening this dialog; step two is typing the record's own code.
 * A single "are you sure?" is too easy to click through by reflex, and these
 * rows are real people whose records are attached to money. Typing the code
 * forces the admin to read which row they are actually about to remove.
 *
 * `blockedReason` disables deletion entirely — used when the record still has
 * registrations, where the database itself would refuse anyway.
 */
export function DeleteDialog({
  action,
  hidden,
  code,
  title,
  summary,
  consequences,
  blockedReason,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
  /** The admin must type this exactly to enable the delete button. */
  code: string;
  title: string;
  summary: { label: string; value: string }[];
  /** What else disappears along with this record. */
  consequences: string[];
  blockedReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const matches = typed.trim().toUpperCase() === code.toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTyped("");
          setOpen(true);
        }}
        className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-pill border border-line px-3 text-xs font-semibold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
      >
        <Trash2 className="size-3.5" aria-hidden />
        Hapus
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

                <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <AlertTriangle className="size-4" aria-hidden />
                  </span>
                  {title}
                </h2>

                <dl className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface text-sm">
                  {summary.map((row) => (
                    <div key={row.label} className="flex justify-between gap-4 px-3.5 py-2.5">
                      <dt className="text-muted">{row.label}</dt>
                      <dd className="text-right font-semibold text-ink">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                {blockedReason ? (
                  <p className="mt-4 rounded-xl border border-line bg-canvas-deep/40 p-3 text-sm leading-relaxed text-ink-soft">
                    {blockedReason}
                  </p>
                ) : (
                  <>
                    <div className="mt-4 rounded-xl border border-brand/25 bg-brand-soft/40 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-ink">
                        Ikut terhapus permanen
                      </p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-ink-soft">
                        {consequences.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-sm font-semibold text-brand-ink">
                        Tindakan ini tidak bisa dibatalkan.
                      </p>
                    </div>

                    <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-ink">
                      Ketik <span className="font-mono font-bold text-brand">{code}</span> untuk
                      mengonfirmasi
                      <input
                        value={typed}
                        onChange={(event) => setTyped(event.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={code}
                        className="h-11 w-full rounded-xl border border-line bg-surface px-3 font-mono text-[0.9375rem] text-ink"
                      />
                    </label>
                  </>
                )}

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                    className="inline-flex min-h-10 items-center rounded-pill border border-line px-4 text-sm font-semibold text-ink-soft"
                  >
                    Batal
                  </button>
                  {!blockedReason ? (
                    <button
                      type="submit"
                      disabled={!matches || submitting}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-brand px-4 text-sm font-bold text-white disabled:opacity-40"
                    >
                      {submitting ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="size-4" aria-hidden />
                      )}
                      Hapus Permanen
                    </button>
                  ) : null}
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
