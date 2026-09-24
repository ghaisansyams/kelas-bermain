import { Suspense } from "react";
import type { Metadata } from "next";
import { EventExplorer } from "@/components/event/event-explorer";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { siteConfig } from "@/data/site";
import { getEvents } from "@/lib/services/content";

export const metadata: Metadata = {
  title: "Event",
  description:
    "Daftar event Kelas Bermain: workshop, kelas kepemimpinan, kegiatan luar ruang, dan festival komunitas. Saring berdasarkan status dan kategori.",
  alternates: { canonical: "/event" },
  openGraph: {
    title: `Event · ${siteConfig.name}`,
    description:
      "Workshop, kelas kepemimpinan, kegiatan luar ruang, dan festival komunitas yang bisa kamu ikuti.",
    url: `${siteConfig.url}/event`,
  },
};

export default async function EventPage() {
  const events = await getEvents();
  const openCount = events.filter((event) => event.availability === "open").length;

  return (
    <>
      <PageHeader
        eyebrow="Agenda"
        title="Event Kelas Bermain"
        description={
          <>
            Dari workshop setengah hari sampai kemah tiga hari. Saat ini{" "}
            <strong className="font-bold text-ink">{openCount} event</strong> sedang membuka
            pendaftaran.
          </>
        }
      />

      <Container className="py-10 sm:py-14">
        <Suspense fallback={<CardGridSkeleton count={6} />}>
          <EventExplorer events={events} />
        </Suspense>
      </Container>
    </>
  );
}
