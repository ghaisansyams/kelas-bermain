import { Rocket } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

/**
 * Draft count plus the publish button, as one strip above the editor.
 *
 * Every tab uses this same strip. Keeping publish out of the page header
 * means the header is always two equal-height buttons, which is what stopped
 * "Publikasikan" from wrapping onto its own line on the wider tabs.
 */
export function PublishBar({
  label,
  pendingCount,
  lastPublishedAt,
  action,
  hidden,
}: {
  /** What is being published, shown in the confirmation. */
  label: string;
  pendingCount: number;
  lastPublishedAt?: string | null;
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`text-sm font-bold ${pendingCount > 0 ? "text-ink" : "text-muted"}`}>
          {pendingCount > 0
            ? `${pendingCount} bagian belum terbit`
            : "Semua perubahan sudah terbit"}
        </span>
        {lastPublishedAt ? (
          <span className="text-xs text-muted">Terakhir terbit {lastPublishedAt}</span>
        ) : null}
      </div>

      {pendingCount === 0 ? (
        <span className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-pill bg-canvas-deep/60 px-4 text-sm font-bold text-muted">
          <Rocket className="size-4" aria-hidden />
          Tidak ada yang perlu diterbitkan
        </span>
      ) : (
        <ConfirmDialog
          action={action}
          hidden={hidden}
          trigger="Publikasikan"
          icon={<Rocket className="size-4" aria-hidden />}
          size="md"
          title="Publikasikan perubahan?"
          description="Isi yang sekarang masih draf akan tampil di website publik. Versi yang sedang tayang disimpan dulu, jadi bisa dikembalikan lewat Riwayat Versi."
          summary={[
            { label: "Bagian", value: label },
            { label: "Belum terbit", value: String(pendingCount) },
            { label: "Terakhir terbit", value: lastPublishedAt ?? "Belum pernah" },
          ]}
          confirmLabel="Ya, publikasikan"
        />
      )}
    </div>
  );
}
