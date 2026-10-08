import Link from "next/link";
import { Eye, ExternalLink } from "lucide-react";
import {
  deleteCollectionItemAction,
  moveCollectionItemAction,
  moveSectionAction,
  publishCollectionAction,
  publishPageAction,
  saveCollectionItemAction,
  saveHeroSlidesAction,
  saveSectionDraftAction,
  setCollectionItemVisibilityAction,
  resetThemeAction,
  addSectionAction,
  applyThemePresetAction,
  archiveSectionAction,
  duplicateSectionAction,
  reorderSectionsAction,
  saveCertificateTemplateAction,
  saveSectionPresentationAction,
  setDefaultCertificateTemplateAction,
  setEventPlacementAction,
  setSectionVisibilityAction,
} from "@/app/admin/cms/website-actions";
import { Card, Notice, PageHeader } from "@/components/admin/admin-ui";
import { PublishBar } from "@/components/admin/cms/publish-bar";
import { CollectionEditor, type CollectionRow } from "@/components/admin/cms/collection-editor";
import { HomeBuilder, type BuilderSection } from "@/components/admin/cms/home-builder";
import { GalleryDriveEditor } from "@/components/admin/cms/gallery-drive-editor";
import { ThemePresetPicker } from "@/components/admin/cms/theme-preset-picker";
import { getGalleryDriveSettings } from "@/lib/services/gallery-settings";
import { VersionHistory, type VersionRow } from "@/components/admin/cms/version-history";
import {
  EventVisibility,
  type EventVisibilityRow,
} from "@/components/admin/cms/event-visibility";
import { CertificateDesigner } from "@/components/admin/cms/certificate-designer";
import { normaliseConfig, type CertificateTemplate } from "@/lib/cms/certificate-template";
import { SectionCard } from "@/components/admin/cms/section-card";
import { NavigationEditor, type NavRow } from "@/components/admin/cms/navigation-editor";
import { requireAdmin } from "@/lib/admin/auth";
import { findCollection, GLOBAL_PAGE, HOME_PAGE, type PageDef } from "@/lib/cms/schema";
import { findTemplate } from "@/lib/cms/section-templates";
import { toPresentation } from "@/lib/cms/presentation";
import { getEvents } from "@/lib/services/content";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface SectionRow {
  section_key: string;
  label: string;
  draft: Record<string, unknown> | null;
  published: Record<string, unknown> | null;
  sort_order: number;
  is_visible: boolean;
  section_type: string;
  presentation: Record<string, unknown> | null;
  archived: boolean;
  published_at: string | null;
}

interface ItemRow {
  item_key: string;
  draft: Record<string, unknown> | null;
  published: Record<string, unknown> | null;
  sort_order: number;
  is_visible: boolean;
}

const TABS: { key: string; label: string }[] = [
  { key: "global", label: "Website" },
  { key: "home", label: "Halaman Depan" },
  { key: "events", label: "Event" },
  { key: "updates", label: "Update" },
  { key: "certificates", label: "Sertifikat" },
];

const NOTICES: Record<string, { tone: "success" | "error" | "info"; text: string }> = {
  "draft-saved": {
    tone: "info",
    text: "Draf tersimpan. Website publik belum berubah — tekan Publikasikan bila sudah yakin.",
  },
  published: { tone: "success", text: "Perubahan terbit. Website publik sudah diperbarui." },
  hidden: { tone: "success", text: "Bagian disembunyikan dari website." },
  shown: { tone: "success", text: "Bagian ditampilkan kembali." },
  reordered: { tone: "success", text: "Urutan diperbarui." },
  duplicated: {
    tone: "success",
    text: "Salinan dibuat sebagai draf. Ubah isinya lalu publikasikan.",
  },
  "preset-applied": {
    tone: "info",
    text: "Tampilan diterapkan ke draf. Tekan Publikasikan agar tampil di website.",
  },
  "gallery-saved": {
    tone: "success",
    text: "Tautan galeri tersimpan dan langsung tayang di website.",
  },
  "template-saved": {
    tone: "success",
    text: "Tersimpan sebagai template. Pilih lewat Tambah Section kapan saja.",
  },
  restored: {
    tone: "info",
    text: "Versi lama dipulihkan sebagai draf. Periksa dulu, lalu publikasikan.",
  },
  "section-added": {
    tone: "success",
    text: "Section baru dibuat sebagai draf — belum tampil di website.",
  },
  archived: {
    tone: "success",
    text: "Section diarsipkan. Isinya tetap tersimpan dan tidak dihapus.",
  },
  deleted: { tone: "success", text: "Item dihapus." },
  invalid: { tone: "error", text: "Periksa isian yang ditandai." },
  error: { tone: "error", text: "Perubahan gagal disimpan." },
};

function sameContent(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export default async function CmsWebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; message?: string; edit?: string }>;
}) {
  await requireAdmin();
  const { tab: rawTab, status, message, edit: rawEdit } = await searchParams;
  const tab = TABS.some((item) => item.key === rawTab) ? rawTab! : "global";
  const supabase = await createSupabaseServerClient();

  const pageDef: PageDef | null =
    tab === "global" ? GLOBAL_PAGE : tab === "home" ? HOME_PAGE : null;

  const [sectionsRes, collectionsRes, navRes] = await Promise.all([
    pageDef
      ? supabase
          .from("cms_sections")
          .select(
            "section_key, label, draft, published, sort_order, is_visible, section_type, presentation, archived, published_at",
          )
          .eq("page_key", pageDef.key)
          .order("sort_order")
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("cms_collections")
      .select("collection_key, item_key, draft, published, sort_order, is_visible")
      .order("sort_order"),
    tab === "global"
      ? supabase.from("navigation_items").select("*").order("sort_order")
      : Promise.resolve({ data: [], error: null }),
  ]);

  const versionsRes = pageDef
    ? await supabase
        .from("cms_versions")
        .select("id, scope, scope_key, created_at, snapshot")
        .eq("scope", "page")
        .eq("scope_key", pageDef.key)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [], error: null };

  const versionRows: VersionRow[] = (
    (versionsRes.data ?? []) as unknown as {
      id: string;
      scope: string;
      scope_key: string;
      created_at: string;
      snapshot: unknown[];
    }[]
  ).map((row, index) => ({
    id: row.id,
    scope: row.scope,
    scopeKey: row.scope_key,
    createdAt: new Date(row.created_at).toLocaleString("id-ID"),
    author: "Admin",
    sectionCount: Array.isArray(row.snapshot) ? row.snapshot.length : 0,
    isCurrent: index === 0,
  }));

  const eventsRes =
    tab === "events"
      ? await supabase
          .from("events")
          .select("id, title, slug, start_date, status, featured, show_on_event_page, show_in_history")
          .order("start_date", { ascending: false })
      : { data: [], error: null };

  const galleryDriveSettings = tab === "global" ? await getGalleryDriveSettings() : null;

  const certificateEvents =
    tab === "certificates" ? (await getEvents()).map((e) => ({ id: e.id, title: e.title })) : [];

  const templatesRes =
    tab === "certificates"
      ? await supabase.from("certificate_templates").select("*").order("created_at")
      : { data: [], error: null };

  const templates: CertificateTemplate[] = (
    (templatesRes.data ?? []) as unknown as {
      id: string;
      name: string;
      description: string;
      background_url: string;
      orientation: "LANDSCAPE" | "PORTRAIT";
      config: unknown;
      status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      is_default: boolean;
    }[]
  ).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    backgroundUrl: row.background_url,
    orientation: row.orientation,
    config: normaliseConfig(row.config),
    status: row.status,
    isDefault: row.is_default,
  }));

  const editingTemplate =
    templates.find((item) => item.id === rawEdit) ?? null;

  const eventRows: EventVisibilityRow[] = (
    (eventsRes.data ?? []) as unknown as {
      id: string;
      title: string;
      slug: string;
      start_date: string;
      status: string;
      featured: boolean;
      show_on_event_page: boolean;
      show_in_history: boolean;
    }[]
  ).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    startDate: row.start_date,
    status: row.status,
    featured: row.featured,
    showOnEventPage: row.show_on_event_page,
    showInHistory: row.show_in_history,
  }));

  const notSetUp = Boolean(sectionsRes.error ?? collectionsRes.error);
  const sectionRows = (sectionsRes.data ?? []) as unknown as SectionRow[];
  const allItems = (collectionsRes.data ?? []) as unknown as (ItemRow & {
    collection_key: string;
  })[];

  const rowsFor = (collectionKey: string): CollectionRow[] =>
    allItems
      .filter((row) => row.collection_key === collectionKey)
      .map((row) => ({
        itemKey: row.item_key,
        content: row.draft ?? {},
        isVisible: row.is_visible,
        isDirty: !sameContent(row.draft, row.published),
      }));

  // Sections an admin may not archive: the ones the site ships with.
  const CORE = new Set(HOME_PAGE.sections.map((item) => item.key));

  const activeRows = sectionRows.filter((row) => !row.archived);

  const builderSections: BuilderSection[] = activeRows.map((row) => {
    const defined = pageDef?.sections.find((item) => item.key === row.section_key);
    const template = findTemplate(row.section_type);
    return {
      key: row.section_key,
      label: defined?.label ?? row.label ?? row.section_key,
      description: defined?.description ?? template?.description ?? "",
      fields: defined?.fields ?? template?.fields ?? [],
      content: row.draft ?? {},
      presentation: toPresentation(row.presentation),
      isVisible: row.is_visible,
      isDirty: !sameContent(row.draft, row.published),
      isCore: CORE.has(row.section_key),
      collectionKey: defined?.collection ?? template?.collection ?? null,
      customEditor: defined?.customEditor ?? null,
      dataDriven: Boolean(defined?.dataDriven),
    };
  });

  const builderCollections: Record<
    string,
    { label: string; description: string; itemNoun: string; fields: typeof HOME_PAGE.sections[number]["fields"]; rows: CollectionRow[] }
  > = {};
  for (const section of builderSections) {
    if (!section.collectionKey || builderCollections[section.collectionKey]) continue;
    const definition = findCollection(section.collectionKey);
    if (!definition) continue;
    builderCollections[section.collectionKey] = {
      label: definition.label,
      description: definition.description,
      itemNoun: definition.itemNoun,
      fields: definition.fields,
      rows: rowsFor(definition.key),
    };
  }

  const lastPublishedAt = activeRows
    .map((row) => row.published_at)
    .filter(Boolean)
    .sort()
    .pop();

  const notice = status ? NOTICES[status] : undefined;
  const pendingDrafts =
    sectionRows.filter((row) => !sameContent(row.draft, row.published)).length +
    allItems.filter((row) => !sameContent(row.draft, row.published)).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="CMS Website"
        description="Pusat kendali seluruh website Kelas Bermain. Ubah isi di sini, lalu publikasikan — tanpa perlu membuka kode."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/preview?path=${encodeURIComponent(pageDef?.previewPath ?? "/")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-pill border border-line px-4 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
            >
              <Eye className="size-4" aria-hidden />
              Buka Pratinjau
            </Link>
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-pill border border-line px-4 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
            >
              Lihat Website
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          </div>
        }
      />

      {notSetUp ? (
        <Notice tone="error">
          Tabel CMS belum ada. Jalankan supabase/cms-website-schema.sql di SQL Editor Supabase
          lebih dulu.
        </Notice>
      ) : null}

      {notice ? (
        <Notice tone={notice.tone}>
          {message ? decodeURIComponent(message) : notice.text}
        </Notice>
      ) : null}

      {pendingDrafts > 0 ? (
        <Notice tone="info">
          Ada {pendingDrafts} perubahan yang masih berupa draf. Website publik belum
          menampilkannya sampai kamu menekan Publikasikan.
        </Notice>
      ) : null}

      <nav className="flex flex-wrap gap-1.5" aria-label="Bagian CMS">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/admin/cms?tab=${item.key}`}
            className={`inline-flex min-h-10 items-center rounded-pill px-4 text-sm font-bold transition-colors ${
              tab === item.key
                ? "bg-brand text-white"
                : "border border-line text-ink-soft hover:border-brand/40 hover:text-brand"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab !== "home" && tab !== "events" ? (
        <PublishBar
          label={TABS.find((item) => item.key === tab)?.label ?? tab}
          pendingCount={pendingDrafts}
          lastPublishedAt={
            lastPublishedAt ? new Date(lastPublishedAt).toLocaleString("id-ID") : null
          }
          action={pageDef ? publishPageAction : publishCollectionAction}
          hidden={pageDef ? { pageKey: pageDef.key, tab } : { collectionKey: tab, tab }}
        />
      ) : null}


      {tab === "home" && pageDef ? (
        <HomeBuilder
          pageKey={pageDef.key}
          tab={tab}
          previewPath={pageDef.previewPath}
          sections={builderSections}
          collections={builderCollections}
          pendingCount={pendingDrafts}
          lastPublishedAt={
            lastPublishedAt ? new Date(lastPublishedAt).toLocaleString("id-ID") : null
          }
          actions={{
            saveSection: saveSectionDraftAction,
            savePresentation: saveSectionPresentationAction,
            saveHeroSlides: saveHeroSlidesAction,
            reorder: reorderSectionsAction,
            visibility: setSectionVisibilityAction,
            duplicate: duplicateSectionAction,
            archive: archiveSectionAction,
            addSection: addSectionAction,
            publish: publishPageAction,
            saveCollectionItem: saveCollectionItemAction,
            deleteCollectionItem: deleteCollectionItemAction,
            moveCollectionItem: moveCollectionItemAction,
            collectionVisibility: setCollectionItemVisibilityAction,
          }}
        />
      ) : pageDef ? (
        <div className="space-y-3">
          {pageDef.sections.map((section, index) => {
            const row = sectionRows.find((item) => item.section_key === section.key);
            if (!row) return null;
            const collection = section.collection ? findCollection(section.collection) : undefined;

            return (
              <SectionCard
                key={section.key}
                section={section}
                pageKey={pageDef.key}
                tab={tab}
                content={row.draft ?? {}}
                isVisible={row.is_visible}
                isDirty={!sameContent(row.draft, row.published)}
                canMoveUp={index > 0}
                canMoveDown={index < pageDef.sections.length - 1}
                saveAction={saveSectionDraftAction}
                visibilityAction={setSectionVisibilityAction}
                moveAction={moveSectionAction}
              >
                {section.key === "theme" ? (
                  <form action={resetThemeAction} className="mt-3">
                    <input type="hidden" name="tab" value={tab} />
                    <button
                      type="submit"
                      className="inline-flex min-h-10 items-center rounded-pill border border-line px-4 text-sm font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
                    >
                      Kembalikan ke tampilan bawaan
                    </button>
                  </form>
                ) : null}

                {collection ? (
                  <CollectionEditor
                    collection={collection}
                    tab={tab}
                    rows={rowsFor(collection.key)}
                    saveAction={saveCollectionItemAction}
                    deleteAction={deleteCollectionItemAction}
                    moveAction={moveCollectionItemAction}
                    visibilityAction={setCollectionItemVisibilityAction}
                  />
                ) : null}
              </SectionCard>
            );
          })}

          {tab === "global" ? (
            <>
              <Card>
                <NavigationEditor items={(navRes.data ?? []) as unknown as NavRow[]} />
              </Card>
              {galleryDriveSettings ? (
                <Card>
                  <GalleryDriveEditor value={galleryDriveSettings} />
                </Card>
              ) : null}
              <Card>
                <ThemePresetPicker tab={tab} action={applyThemePresetAction} />
              </Card>
              <Card>
                <VersionHistory rows={versionRows} tab={tab} />
              </Card>
            </>
          ) : null}
        </div>

      ) : tab === "history" ? (
        <Card>
          <VersionHistory rows={versionRows} tab={tab} />
        </Card>
      ) : tab === "certificates" ? (
        <div className="space-y-4">
          <Notice tone="info">
            Template baru tidak mengubah sertifikat yang sudah terbit. Sertifikat lama tetap
            tampil dengan desain saat diterbitkan.
          </Notice>

          {templates.length > 0 ? (
            <Card>
              <h3 className="text-sm font-extrabold text-ink">Template tersimpan</h3>
              <ul className="mt-3 space-y-2">
                {templates.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-ink">{item.name}</span>
                        <span className="rounded-pill bg-canvas-deep/60 px-2 py-0.5 text-[0.625rem] font-bold text-muted">
                          {item.status}
                        </span>
                        {item.isDefault ? (
                          <span className="rounded-pill bg-pine-soft px-2 py-0.5 text-[0.625rem] font-bold text-pine-dark">
                            Dipakai sebagai bawaan
                          </span>
                        ) : null}
                      </span>
                      {item.description ? (
                        <span className="mt-0.5 block text-xs text-muted">{item.description}</span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 gap-2">
                      <Link
                        href={`/admin/cms?tab=certificates&edit=${item.id}`}
                        className="inline-flex min-h-9 items-center rounded-pill border border-line px-3 text-xs font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
                      >
                        Ubah
                      </Link>
                      {!item.isDefault ? (
                        <form action={setDefaultCertificateTemplateAction}>
                          <input type="hidden" name="templateId" value={item.id} />
                          <button
                            type="submit"
                            className="inline-flex min-h-9 items-center rounded-pill bg-brand px-3 text-xs font-bold text-white"
                          >
                            Jadikan bawaan
                          </button>
                        </form>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              {editingTemplate ? (
                <Link
                  href="/admin/cms?tab=certificates"
                  className="mt-3 inline-flex text-sm font-semibold text-muted hover:text-brand"
                >
                  Batal mengubah, buat template baru
                </Link>
              ) : null}
            </Card>
          ) : null}

          <Card>
            <h3 className="text-sm font-extrabold text-ink">
              {editingTemplate ? `Ubah ${editingTemplate.name}` : "Template baru"}
            </h3>
            <div className="mt-3">
              <CertificateDesigner
                key={editingTemplate?.id ?? "new"}
                template={editingTemplate}
                events={certificateEvents}
                action={saveCertificateTemplateAction}
              />
            </div>
          </Card>
        </div>
      ) : tab === "events" ? (
        <div className="space-y-3">
          <Notice tone="info">
            Event dibuat dan diubah di menu Event. Di sini kamu hanya mengatur di mana event itu
            ditampilkan — jadi tanggal dan harga tidak pernah ada dua versi.
          </Notice>
          <EventVisibility rows={eventRows} action={setEventPlacementAction} />
        </div>
      ) : (
        <Card>
          {(() => {
            const collection = findCollection(tab);
            if (!collection) return <p className="text-sm text-muted">Bagian tidak ditemukan.</p>;
            return (
              <CollectionEditor
                collection={collection}
                tab={tab}
                rows={rowsFor(collection.key)}
                saveAction={saveCollectionItemAction}
                deleteAction={deleteCollectionItemAction}
                moveAction={moveCollectionItemAction}
                visibilityAction={setCollectionItemVisibilityAction}
              />
            );
          })()}
        </Card>
      )}
    </div>
  );
}
