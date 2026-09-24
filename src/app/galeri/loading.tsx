import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Container className="pt-6 sm:pt-10">
        <Skeleton className="h-[18rem] w-full rounded-[1.5rem] sm:h-[24rem] lg:h-[30rem]" />
      </Container>
      <Container className="py-10 sm:py-14">
        <div className="max-w-3xl space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-80 max-w-full" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="mt-8 h-72 w-full max-w-4xl rounded-card" />
        <Skeleton className="mt-10 h-28 w-full rounded-card" />
      </Container>
    </>
  );
}
