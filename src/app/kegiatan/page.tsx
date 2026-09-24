import type { Metadata } from "next";
import { ActivityExplorer } from "@/components/kegiatan/activity-explorer";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/data/site";
import { getActivities } from "@/lib/services/content";

export const metadata: Metadata = {
  title: "Kegiatan",
  description:
    "Dokumentasi kegiatan Kelas Bermain: workshop, kunjungan sekolah, aksi relawan, pertemuan komunitas, dan kegiatan luar ruang.",
  alternates: { canonical: "/kegiatan" },
  openGraph: {
    title: `Kegiatan · ${siteConfig.name}`,
    description:
      "Workshop, kunjungan sekolah, aksi relawan, dan pertemuan komunitas yang sudah kami jalankan.",
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
            Program yang berjalan di luar event terjadwal — total{" "}
            <strong className="font-bold text-ink">
              {participants.toLocaleString("id-ID")} peserta
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
