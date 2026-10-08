import { History, RotateCcw } from "lucide-react";
import { restoreVersionAction } from "@/app/admin/cms/website-actions";

export interface VersionRow {
  id: string;
  scope: string;
  scopeKey: string;
  createdAt: string;
  author: string;
  sectionCount: number;
  isCurrent: boolean;
}

/**
 * Snapshots taken before each publish.
 *
 * Restoring writes into the draft only — the live site is untouched until the
 * admin publishes, so looking at history can never surprise a visitor.
 */
export function VersionHistory({ rows, tab }: { rows: VersionRow[]; tab: string }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
          <History className="size-4 text-brand" aria-hidden />
          Riwayat Versi
        </h3>
        <p className="text-xs leading-relaxed text-muted">
          Setiap kali kamu menekan Publikasikan, versi yang sedang tayang disimpan dulu. Memulihkan
          versi lama menjadikannya draf — website publik baru berubah setelah kamu publikasikan.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          Belum ada riwayat. Versi pertama tersimpan saat kamu publikasikan.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3"
            >
              <div className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-ink">Versi {rows.length - index}</span>
                  {row.isCurrent ? (
                    <span className="rounded-pill bg-pine-soft px-2 py-0.5 text-[0.625rem] font-bold text-pine-dark">
                      Terakhir diterbitkan
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {row.createdAt} · {row.author} · {row.sectionCount} bagian
                </span>
              </div>

              {!row.isCurrent ? (
                <form action={restoreVersionAction}>
                  <input type="hidden" name="versionId" value={row.id} />
                  <input type="hidden" name="tab" value={tab} />
                  <button
                    type="submit"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-line px-3 text-xs font-bold text-ink-soft hover:border-brand/40 hover:text-brand"
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    Pulihkan jadi draf
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
