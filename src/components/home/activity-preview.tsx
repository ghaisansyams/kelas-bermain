import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ActivityCard } from "@/components/kegiatan/activity-card";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import type { ActivityRecord } from "@/lib/types";

export function ActivityPreview({ activities }: { activities: ActivityRecord[] }) {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Kegiatan terbaru"
          title="Yang sudah kami jalankan"
          description="Dokumentasi kelas yang sudah berlangsung — dari kebun di Tangerang Selatan sampai hangar pesawat di Jakarta."
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
