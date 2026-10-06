import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { publishHomeAction, saveHomeDraftAction } from "@/app/admin/cms/actions";
import { Card, Notice, PageHeader } from "@/components/admin/admin-ui";
import { HeroSlidesEditor, type HeroSlideDraft } from "@/components/admin/hero-slides-editor";
import { Field, TextArea, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { DEFAULT_HOME_CONTENT } from "@/lib/services/cms";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Draft = Record<string, string>;

const STATUS_MESSAGE: Record<string, { tone: "success" | "error"; text: string }> = {
  "draft-saved": { tone: "success", text: "Draft tersimpan. Website publik belum berubah." },
  published: { tone: "success", text: "Perubahan dipublikasikan. Website publik sudah diperbarui." },
  error: { tone: "error", text: "Perubahan gagal disimpan. Coba lagi." },
};

export default async function CmsHomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("cms_sections")
    .select("section_key, draft, published, published_at")
    .eq("page_key", "home");

  const rows = (data ?? []) as {
    section_key: string;
    draft: Draft | null;
    published: Draft | null;
    published_at: string | null;
  }[];

  const hero = { ...DEFAULT_HOME_CONTENT.hero, ...(rows.find((r) => r.section_key === "hero")?.draft ?? {}) };
  const teaser = {
    ...DEFAULT_HOME_CONTENT.eventsTeaser,
    ...(rows.find((r) => r.section_key === "events_teaser")?.draft ?? {}),
  };
  const slidesRow = rows.find((r) => r.section_key === "hero_slides");
  const rawSlides = (slidesRow?.draft as unknown as { slides?: HeroSlideDraft[] } | null)?.slides;
  const slides: HeroSlideDraft[] = Array.isArray(rawSlides) ? rawSlides : [];

  const heroRow = rows.find((r) => r.section_key === "hero");
  const hasUnpublished =
    heroRow && JSON.stringify(heroRow.draft) !== JSON.stringify(heroRow.published);

  const notice = status ? STATUS_MESSAGE[status] : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="CMS — Home"
        description="Teks halaman depan. Simpan draft dulu, publikasikan saat siap."
        action={
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-pill border border-line px-4 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
          >
            Buka website
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        }
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <Notice tone="info">
        Banner berjalan di halaman depan diatur di bagian &quot;Gambar hero (carousel)&quot;
        di bawah. Perubahan baru tampil di website setelah klik Publish.
      </Notice>
      {error ? <Notice tone="error">Konten gagal dimuat dari database.</Notice> : null}
      {hasUnpublished ? (
        <Notice tone="info">Ada perubahan draft yang belum dipublikasikan.</Notice>
      ) : null}

      <form className="space-y-6">
        <Card>
          <h2 className="text-base font-extrabold text-ink">Hero</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Field label="Label kecil" htmlFor="hero.eyebrow" className="sm:col-span-2">
              <TextInput id="hero.eyebrow" name="hero.eyebrow" defaultValue={hero.eyebrow} />
            </Field>
            <Field label="Judul" htmlFor="hero.title" className="sm:col-span-2">
              <TextArea id="hero.title" name="hero.title" rows={2} defaultValue={hero.title} />
            </Field>
            <Field
              label="Kata yang diberi warna"
              htmlFor="hero.highlight"
              hint="Harus salah satu kata di judul. Kosongkan jika tidak perlu."
            >
              <TextInput id="hero.highlight" name="hero.highlight" defaultValue={hero.highlight} />
            </Field>
            <Field label="Deskripsi" htmlFor="hero.description" className="sm:col-span-2">
              <TextArea
                id="hero.description"
                name="hero.description"
                rows={3}
                defaultValue={hero.description}
              />
            </Field>
            <Field label="Tombol utama — teks" htmlFor="hero.primaryCtaLabel">
              <TextInput
                id="hero.primaryCtaLabel"
                name="hero.primaryCtaLabel"
                defaultValue={hero.primaryCtaLabel}
              />
            </Field>
            <Field label="Tombol utama — tautan" htmlFor="hero.primaryCtaHref">
              <TextInput
                id="hero.primaryCtaHref"
                name="hero.primaryCtaHref"
                defaultValue={hero.primaryCtaHref}
              />
            </Field>
            <Field label="Tombol kedua — teks" htmlFor="hero.secondaryCtaLabel">
              <TextInput
                id="hero.secondaryCtaLabel"
                name="hero.secondaryCtaLabel"
                defaultValue={hero.secondaryCtaLabel}
              />
            </Field>
            <Field label="Tombol kedua — tautan" htmlFor="hero.secondaryCtaHref">
              <TextInput
                id="hero.secondaryCtaHref"
                name="hero.secondaryCtaHref"
                defaultValue={hero.secondaryCtaHref}
              />
            </Field>
            <Field label="Statistik — nilai" htmlFor="hero.statValue">
              <TextInput id="hero.statValue" name="hero.statValue" defaultValue={hero.statValue} />
            </Field>
            <Field label="Statistik — label" htmlFor="hero.statLabel">
              <TextInput id="hero.statLabel" name="hero.statLabel" defaultValue={hero.statLabel} />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-extrabold text-ink">Gambar hero (carousel)</h2>
          <p className="mt-1 text-sm text-muted">
            Gambar diambil dari Media Library. Slide tanpa gambar tidak akan tampil di website.
          </p>
          <div className="mt-4">
            <HeroSlidesEditor initial={slides} />
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-extrabold text-ink">Bagian jadwal kegiatan</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Field label="Label kecil" htmlFor="events_teaser.eyebrow">
              <TextInput
                id="events_teaser.eyebrow"
                name="events_teaser.eyebrow"
                defaultValue={teaser.eyebrow}
              />
            </Field>
            <Field label="Judul" htmlFor="events_teaser.title">
              <TextInput
                id="events_teaser.title"
                name="events_teaser.title"
                defaultValue={teaser.title}
              />
            </Field>
            <Field label="Deskripsi" htmlFor="events_teaser.description" className="sm:col-span-2">
              <TextArea
                id="events_teaser.description"
                name="events_teaser.description"
                rows={3}
                defaultValue={teaser.description}
              />
            </Field>
          </div>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="submit" variant="secondary" size="lg" formAction={saveHomeDraftAction}>
            Simpan Draft
          </Button>
          <Button type="submit" size="lg" formAction={publishHomeAction}>
            Publish
          </Button>
        </div>
      </form>
    </div>
  );
}
