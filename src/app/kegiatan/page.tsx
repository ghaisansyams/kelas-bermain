import type { Metadata } from "next";
import { ActivityExplorer } from "@/components/kegiatan/activity-explorer";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/data/site";
import { getActivities } from "@/lib/services/content";

export const metadata: Metadata = {
  title: "Kegiatan",
  description:
    "Dokumentasi kegiatan Kelas Bermain: kelas profesi, kuliner, alam, kreatif, dan kegiatan luar ruang untuk anak usia 3–15 tahun.",
  alternates: { canonical: "/kegiatan" },
  openGraph: {
    title: `Kegiatan · ${siteConfig.name}`,
    description:
      "Kelas profesi, kuliner, alam, dan kreatif yang sudah kami jalankan bersama anak-anak.",
    url: `${siteConfig.url}/kegiatan`,
  },
};

export default async function KegiatanPage() {
  const activities = await getActivities();
  const participants = activities.reduce((total, item) => total + item.participants, 0);

  return (
    <>
      <PageHeader
        eyebrow="Jejak kami"
        title="Kegiatan Kelas Bermain"
        description={
          <>
            Kelas yang sudah berlangsung — total{" "}
            <strong className="font-bold text-ink">
              {participants.toLocaleString("id-ID")} anak
            </strong>{" "}
            terlibat dalam {activities.length} kegiatan yang terdokumentasi di bawah ini.
          </>
        }
      />

      <Container className="py-10 sm:py-14">
        <ActivityExplorer activities={activities} />
      </Container>
    </>
  );
}
