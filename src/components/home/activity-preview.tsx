import { DecorScene } from "@/components/ui/playful";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ActivityCard } from "@/components/kegiatan/activity-card";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { HeadingContent } from "@/lib/services/cms-website";
import type { ActivityRecord } from "@/lib/types";

export function ActivityPreview({
  activities,
  heading,
}: {
  activities: ActivityRecord[];
  heading: HeadingContent;
}) {
  return (
    <section className="relative isolate overflow-hidden py-16 sm:py-20">
      <DecorScene name="sectionA" />

      <Container>
        <SectionHeading
          eyebrow={heading.eyebrow}
          title={heading.title}
          description={heading.description}
          action={
            <Link
              href="/kegiatan"
              className={buttonStyles({ variant: "secondary", className: "hidden sm:inline-flex" })}
            >
              Semua Kegiatan
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity, index) => (
            <Reveal key={activity.id} delay={index * 70} className="h-full">
              <ActivityCard activity={activity} />
            </Reveal>
          ))}
        </div>

        <div className="mt-8 sm:hidden">
          <Link href="/kegiatan" className={buttonStyles({ variant: "secondary", className: "w-full" })}>
            Lihat Semua Kegiatan
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Container>
    </section>
  );
}
