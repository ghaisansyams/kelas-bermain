import type { SectionChange } from "@/lib/cms/changes";

/** Daftar "apa yang akan berubah" di pop-up Publikasikan. */
export function ChangeList({ changes }: { changes: SectionChange[] }) {
  if (changes.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-extrabold text-ink">Yang akan berubah di website</p>
      <ul className="mt-2 space-y-3">
        {changes.map((change) => (
          <li key={change.section} className="rounded-xl border border-line bg-surface p-3.5">
            <p className="text-sm font-extrabold text-ink">{change.section}</p>
            {change.note ? <p className="mt-0.5 text-xs font-semibold text-sun-dark">{change.note}</p> : null}
            {change.lines.length > 0 ? (
              <ul className="mt-2 space-y-2.5">
                {change.lines.map((line) => (
                  <li key={line.label} className="text-sm">
                    <span className="block text-xs font-bold uppercase tracking-wider text-muted">{line.label}</span>
                    <span className="mt-0.5 block text-muted line-through decoration-muted/50">{line.before}</span>
                    <span className="block font-semibold text-pine-dark">{line.after}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-muted">Perubahan kecil pada pengaturan bagian ini.</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
