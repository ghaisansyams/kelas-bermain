import type { Metadata } from "next";
import { UpdateCard } from "@/components/update/update-card";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/section-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { siteConfig } from "@/data/site";
import { getUpdates } from "@/lib/services/update";

export const metadata: Metadata = {
  title: "Update",
  description: "Ikuti update terbaru, kegiatan, dan cerita dari Kelas Bermain.",
  alternates: { canonical: "/update" },
  openGraph: {
    title: `Update · ${siteConfig.name}`,
    description: "Ikuti update terbaru, kegiatan, dan cerita dari Kelas Bermain.",
    url: `${siteConfig.url}/update`,
  },
};

export const revalidate = 3600;

export default async function UpdatePage() {
  const result = await getUpdates();

  return (
    <>
      <section className="border-b border-line bg-canvas-deep/40 py-12 sm:py-16">
        <Container>
          <Eyebrow>Update</Eyebrow>
          <h1 className="mt-4 text-[1.75rem] leading-tight font-extrabold text-ink sm:text-4xl">
            Update Kelas Bermain
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            Ikuti cerita, kegiatan, dan kabar terbaru dari Kelas Bermain.
          </p>
        </Container>
      </section>

      <Container className="py-10 sm:py-14">
        {!result.ok ? (
          <EmptyState
            title="Update belum dapat dimuat."
            description="Coba muat ulang halaman ini sebentar lagi."
          />
        ) : result.updates.length === 0 ? (
          <EmptyState
            title="Belum ada update"
            description="Update terbaru Kelas Bermain akan muncul di sini."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.updates.map((update) => (
              <UpdateCard key={update.id} update={update} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
