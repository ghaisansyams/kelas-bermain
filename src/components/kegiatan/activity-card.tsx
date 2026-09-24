import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, ImageIcon, MapPin, Users } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { ActivityCategory, ActivityRecord } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDateRange } from "@/lib/utils/date";

export const activityCategoryLabel: Record<ActivityCategory, string> = {
  Workshop: "Workshop",
  Community: "Komunitas",
  "School Visit": "Kunjungan Sekolah",
  Leadership: "Kepemimpinan",
  Volunteer: "Relawan",
  Outdoor: "Luar Ruang",
};

export const activityCategoryTone: Record<ActivityCategory, BadgeTone> = {
  Workshop: "grape",
  Community: "pine",
  "School Visit": "sky",
  Leadership: "brand",
  Volunteer: "sun",
  Outdoor: "leaf",
};

export function ActivityCard({
  activity,
  priority = false,
  className,
}: {
  activity: ActivityRecord;
  priority?: boolean;
  className?: string;
}) {
  const href = `/kegiatan/${activity.slug}`;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface",
        "shadow-soft transition-[transform,box-shadow,border-color] duration-300",
        "hover:-translate-y-1 hover:border-pine/25 hover:shadow-lift focus-within:-translate-y-1",
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-canvas-deep to-line-soft">
        <Image
          src={activity.cover.src}
          alt={activity.cover.alt}
          fill
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw"
          priority={priority}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-ink/50 via-ink/5 to-transparent"
        />
        <div className="absolute left-3 top-3">
          <Badge
            tone={activityCategoryTone[activity.category]}
            className="bg-surface/95 backdrop-blur-sm"
          >
            {activityCategoryLabel[activity.category]}
          </Badge>
        </div>
        {activity.galleryIds.length > 0 ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-pill bg-surface/95 px-2.5 py-1 text-xs font-bold text-ink backdrop-blur-sm">
            <ImageIcon className="size-3.5 text-pine" aria-hidden />
            {activity.galleryIds.length} foto
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          <h3 className="text-lg leading-snug font-extrabold text-ink">
            <Link href={href} className="after:absolute after:inset-0 after:content-['']">
              {activity.title}
            </Link>
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted">{activity.summary}</p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0 text-pine/70" aria-hidden />
            {formatDateRange(activity.date, activity.endDate)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0 text-pine/70" aria-hidden />
            {activity.location.city}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4 shrink-0 text-pine/70" aria-hidden />
            {activity.participants.toLocaleString("id-ID")} peserta
          </span>
        </div>

        <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-bold text-pine transition-transform duration-300 group-hover:translate-x-0.5">
          Lihat Kegiatan
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </div>
    </article>
  );
}
