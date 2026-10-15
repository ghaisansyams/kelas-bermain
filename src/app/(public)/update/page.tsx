import type { Metadata } from "next";
import { InstagramIcon } from "@/components/brand/social-icons";
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
            Postingan terbaru langsung dari Instagram Kelas Bermain — kegiatan, cerita, dan
            pengumuman kelas.
          </p>
          <a
            href="https://instagram.com/kelasbermain.id"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-pill border border-line bg-surface px-4 text-sm font-bold text-ink transition-colors hover:border-brand/40 hover:text-brand"
          >
            <InstagramIcon className="size-4" aria-hidden />
            @kelasbermain.id
          </a>
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
            description="Postingan Instagram terbaru akan muncul di sini setelah sinkronisasi berikutnya."
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
