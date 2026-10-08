import Link from "next/link";
import { Eye } from "lucide-react";

/**
 * Makes preview mode impossible to forget. Without this an admin could edit,
 * look at the site, and believe a draft was already live.
 */
export function PreviewBanner() {
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-ink px-4 py-2 text-center text-xs font-bold text-white">
      <span className="inline-flex items-center gap-1.5">
        <Eye className="size-3.5" aria-hidden />
        Mode pratinjau — kamu melihat draf yang belum dipublikasikan.
      </span>
      <Link
        href="/preview/exit"
        className="rounded-pill bg-white/15 px-3 py-1 font-bold text-white hover:bg-white/25"
      >
        Keluar pratinjau
      </Link>
    </div>
  );
}
