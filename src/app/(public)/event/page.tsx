import type { Metadata } from "next";
import { EventExplorer } from "@/components/event/event-explorer";
import { PageHeader } from "@/components/layout/page-header";
import { PAGE_HEADINGS } from "@/lib/cms/home-defaults";
import { getPageContent, toHeading } from "@/lib/services/cms-website";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/data/site";
import { getEvents } from "@/lib/services/content";
import { getEventCategories } from "@/lib/services/event-categories";

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
  const [events, categories, pages] = await Promise.all([getEvents(), getEventCategories(), getPageContent("pages")]);
  const heading = toHeading(pages.sections.event, PAGE_HEADINGS.event);
  const openCount = events.filter((event) => event.availability === "open").length;

  return (
    <>
      <PageHeader
        eyebrow={heading.eyebrow}
        title={heading.title}
        description={
          <>
            {heading.description} Saat ini{" "}
            <strong className="font-bold text-ink">{openCount} kelas</strong> sedang membuka
            pendaftaran.
          </>
        }
      />

      <Container className="py-10 sm:py-14">
        <EventExplorer events={events} categories={categories.map((item) => item.name)} />
      </Container>
    </>
  );
}
