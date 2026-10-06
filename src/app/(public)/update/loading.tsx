import { Container } from "@/components/ui/container";
import { CardGridSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="border-b border-line bg-canvas-deep/40 py-12 sm:py-16">
        <Container className="space-y-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </Container>
      </div>
      <Container className="py-10 sm:py-14">
        <CardGridSkeleton count={6} />
      </Container>
    </>
  );
}
