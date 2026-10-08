"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { THEME_PRESETS } from "@/lib/cms/theme-presets";

/**
 * Picks a ready-made palette. Applying writes to the draft, so the public
 * site does not change until Publish — and the confirmation step makes that
 * explicit rather than relying on the admin knowing it.
 */
export function ThemePresetPicker({
  tab,
  action,
}: {
  tab: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-extrabold text-ink">Pilihan Tampilan</h3>
        <p className="text-xs leading-relaxed text-muted">
          Setiap pilihan sudah diperiksa agar teksnya tetap terbaca. Menerapkannya hanya mengubah
          draf — website publik berubah setelah kamu publikasikan.
        </p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {THEME_PRESETS.map((preset) => (
          <li key={preset.id} className="rounded-xl border border-line p-3">
            <div className="flex items-center gap-2">
              <span className="flex gap-1" aria-hidden>
                {preset.swatches.map((colour) => (
                  <span
                    key={colour}
                    className="size-5 rounded-full border border-line"
                    style={{ backgroundColor: colour }}
                  />
                ))}
              </span>
              <span className="font-bold text-ink">{preset.label}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{preset.description}</p>

            {confirming === preset.id ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <form action={action}>
                  <input type="hidden" name="presetId" value={preset.id} />
                  <input type="hidden" name="tab" value={tab} />
                  <button
                    type="submit"
                    className="inline-flex min-h-9 items-center gap-1 rounded-pill bg-brand px-3 text-xs font-bold text-white"
                  >
                    <Check className="size-3.5" aria-hidden />
                    Terapkan ke draf
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="inline-flex min-h-9 items-center rounded-pill border border-line px-3 text-xs font-semibold text-ink-soft"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(preset.id)}
                className="mt-2 inline-flex min-h-9 items-center rounded-pill border border-line px-3 text-xs font-bold text-ink-soft hover:border-brand/40 hover:text-brand"
              >
                Gunakan tampilan ini
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
