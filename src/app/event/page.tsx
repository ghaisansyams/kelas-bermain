import type { Metadata } from "next";
import { EventExplorer } from "@/components/event/event-explorer";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/data/site";
import { getEvents } from "@/lib/services/content";

/**
 * Event status is derived from the current date, so regenerate hourly to keep
 * "Akan Datang" / "Selesai" honest without needing a redeploy.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Event",
  description:
    "Jadwal kelas Kelas Bermain untuk anak usia 3–15 tahun di Jabodetabek: kelas profesi, kuliner, alam, dan kreatif. Saring berdasarkan status dan kategori.",
  alternates: { canonical: "/event" },
  openGraph: {
    title: `Event · ${siteConfig.name}`,
    description:
      "Kelas profesi, kuliner, alam, dan kreatif untuk anak usia 3–15 tahun di Jabodetabek.",
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
        title="Jadwal Kelas Bermain"
        description={
          <>
            Kelas satu hari untuk anak usia 3–15 tahun di Jabodetabek. Saat ini{" "}
            <strong className="font-bold text-ink">{openCount} kelas</strong> sedang membuka
            pendaftaran.
          </>
        }
      />

      <Container className="py-10 sm:py-14">
        <EventExplorer events={events} />
      </Container>
    </>
  );
}
