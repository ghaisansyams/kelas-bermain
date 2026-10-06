import { Play } from "lucide-react";
import { YoutubeModal } from "@/components/media/youtube-modal";
import type { EventVideo } from "@/lib/types";
import { getYoutubeThumbnail } from "@/lib/utils/youtube";

/**
 * Preview-video card for the detail page sidebar, rendered right under
 * `RegistrationPanel` — a separate card, never merged into it. Renders
 * nothing when the event has no video (see the `event.video ?` check at the
 * call site), rather than showing an empty card.
 */
export function EventVideoCard({ video, className }: { video: EventVideo; className?: string }) {
  const thumbnail = video.thumbnail ?? getYoutubeThumbnail(video.youtubeUrl);
  const title = video.title ?? "Video Kegiatan";

  return (
    <div className={`overflow-hidden rounded-card border border-line bg-surface shadow-soft ${className ?? ""}`}>
      <YoutubeModal
        youtubeUrl={video.youtubeUrl}
        title={title}
        triggerLabel={`Putar video: ${title}`}
        triggerClassName="group/video relative block aspect-video w-full overflow-hidden bg-ink"
      >
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail, not an optimizable local asset
          <img
            src={thumbnail}
            alt=""
            aria-hidden
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/video:scale-[1.03]"
          />
        ) : null}
        <div aria-hidden className="absolute inset-0 bg-ink/25 transition-colors group-hover/video:bg-ink/35" />
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-brand shadow-lift transition-transform duration-200 group-hover/video:scale-110"
        >
          <Play className="ml-0.5 size-6 fill-current" aria-hidden />
        </span>
      </YoutubeModal>
      <p className="px-5 py-4 text-sm font-semibold text-ink-soft">Lihat Video Kegiatan</p>
    </div>
  );
}
