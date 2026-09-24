import { cn } from "@/lib/utils/cn";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("shimmer rounded-lg bg-line-soft", className)} style={style} aria-hidden />
  );
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-28 rounded-pill" />
          <Skeleton className="h-9 w-24 rounded-pill" />
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}
