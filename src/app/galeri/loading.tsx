import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Container className="pt-6 sm:pt-10">
        <Skeleton className="h-[18rem] w-full rounded-[1.5rem] sm:h-[24rem] lg:h-[30rem]" />
      </Container>
      <Container className="py-10 sm:py-14">
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-10 w-24 rounded-pill" />
          ))}
        </div>
        <div className="mt-8 columns-2 gap-3 sm:columns-3 lg:columns-4">
          {/* Varied heights mirror the masonry layout underneath. */}
          {[14, 11, 16, 12, 15, 10, 13, 17, 11, 14, 12, 16].map((height, index) => (
            <Skeleton
              key={index}
              className="mb-3 w-full rounded-2xl"
              style={{ height: `${height}rem` }}
            />
          ))}
        </div>
      </Container>
    </>
  );
}
