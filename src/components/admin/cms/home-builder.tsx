"use client";

import { useState } from "react";
import { Rocket, Settings2 } from "lucide-react";
import { CollectionEditor, type CollectionRow } from "@/components/admin/cms/collection-editor";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FieldInput } from "@/components/admin/cms/field-input";
import { PresentationEditor } from "@/components/admin/cms/presentation-editor";
import { StructurePanel, type StructureItem } from "@/components/admin/cms/structure-panel";
import { HeroSlidesEditor, type HeroEventOption, type HeroSlideDraft } from "@/components/admin/hero-slides-editor";
import { heroMode } from "@/lib/cms/hero";
import { ChangeList } from "@/components/admin/cms/change-list";
import type { SectionChange } from "@/lib/cms/changes";
import type { FieldDef } from "@/lib/cms/schema";
import type { SectionPresentation } from "@/lib/cms/presentation";

export interface BuilderSection {
  key: string;
  label: string;
  description: string;
  fields: FieldDef[];
  content: Record<string, unknown>;
  presentation: SectionPresentation;
  isVisible: boolean;
  isDirty: boolean;
  isCore: boolean;
  collectionKey: string | null;
  customEditor: "hero_slides" | null;
  dataDriven: boolean;
}

export interface BuilderActions {
  saveSection: (formData: FormData) => void | Promise<void>;
  savePresentation: (formData: FormData) => void | Promise<void>;
  saveHeroSlides: (formData: FormData) => void | Promise<void>;
  reorder: (formData: FormData) => void | Promise<void>;
  visibility: (formData: FormData) => void | Promise<void>;
  duplicate: (formData: FormData) => void | Promise<void>;
  archive: (formData: FormData) => void | Promise<void>;
  addSection: (formData: FormData) => void | Promise<void>;
  publish: (formData: FormData) => void | Promise<void>;
  saveCollectionItem: (formData: FormData) => void | Promise<void>;
  deleteCollectionItem: (formData: FormData) => void | Promise<void>;
  moveCollectionItem: (formData: FormData) => void | Promise<void>;
  collectionVisibility: (formData: FormData) => void | Promise<void>;
}

/**
 * The website builder: structure on the left, live preview in the middle,
 * settings for the selected section on the right.
 *
 * The preview is a real iframe of the public page rather than a second
 * rendering of the content, so there is no mock layout that can drift away
 * from what visitors actually see.
 */
export function HomeBuilder({
  pageKey,
  tab,
  sections,
  collections,
  pendingCount,
  lastPublishedAt,
  heroAutoPreview,
  heroEventOptions,
  changes,
  actions,
}: {
  pageKey: string;
  tab: string;
  sections: BuilderSection[];
  collections: Record<string, { label: string; description: string; itemNoun: string; fields: FieldDef[]; rows: CollectionRow[] }>;
  pendingCount: number;
  lastPublishedAt: string | null;
  /** Slide yang tampil kalau banner diatur otomatis dari event. */
  heroAutoPreview: HeroSlideDraft[];
  /** Event yang bisa dipilih sebagai tujuan klik slide. */
  heroEventOptions: HeroEventOption[];
  /** Rincian perubahan yang akan terbit, ditampilkan di pop-up Publikasikan. */
  changes: SectionChange[];
  actions: BuilderActions;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(sections[0]?.key ?? null);

  const selected = sections.find((section) => section.key === selectedKey) ?? null;

  const structure: StructureItem[] = sections.map((section) => ({
    key: section.key,
    label: section.label,
    isVisible: section.isVisible,
    isDirty: section.isDirty,
    isCore: section.isCore,
  }));

  return (
    <div className="space-y-4">
      {/* Top bar — draft state and publishing. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className={`text-sm font-bold ${pendingCount > 0 ? "text-ink" : "text-muted"}`}
          >
            {pendingCount > 0
              ? `${pendingCount} bagian belum terbit`
              : "Semua perubahan sudah terbit"}
          </span>
          {lastPublishedAt ? (
            <span className="text-xs text-muted">Terakhir terbit {lastPublishedAt}</span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {pendingCount === 0 ? (
            <span className="inline-flex min-h-10 items-center gap-1.5 rounded-pill bg-canvas-deep/60 px-4 text-sm font-bold text-muted">
              <Rocket className="size-4" aria-hidden />
              Tidak ada yang perlu diterbitkan
            </span>
          ) : (
            <ConfirmDialog
              action={actions.publish}
              hidden={{ pageKey, tab }}
              trigger="Publikasikan"
              icon={<Rocket className="size-4" aria-hidden />}
              size="md"
              title="Publikasikan perubahan?"
              description="Isi yang sekarang masih draf akan tampil di website publik. Versi yang sedang tayang disimpan dulu, jadi bisa dikembalikan lewat Riwayat Versi."
              summary={[
                { label: "Halaman", value: "Halaman Depan" },
                { label: "Bagian belum terbit", value: String(pendingCount) },
                { label: "Terakhir terbit", value: lastPublishedAt ?? "Belum pernah" },
              ]}
              confirmLabel="Ya, publikasikan"
              wide
              details={<ChangeList changes={changes} />}
            />
          )}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="rounded-card border border-line bg-surface p-3">
          <StructurePanel
            pageKey={pageKey}
            tab={tab}
            items={structure}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            reorderAction={actions.reorder}
            visibilityAction={actions.visibility}
            duplicateAction={actions.duplicate}
            archiveAction={actions.archive}
            addAction={actions.addSection}
          />
        </aside>

        <aside className="min-w-0 space-y-4 rounded-card border border-line bg-surface p-4">
          {!selected ? (
            <p className="text-sm text-muted">Pilih salah satu bagian di sebelah kiri.</p>
          ) : (
            // key: tiap bagian dimuat ulang, supaya isian bagian sebelumnya tidak terbawa
            <div key={selected.key} className="space-y-4">
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
                  <Settings2 className="size-4 text-brand" aria-hidden />
                  {selected.label}
                </h2>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{selected.description}</p>
              </div>

              {selected.dataDriven ? (
                <p className="rounded-xl bg-canvas-deep/40 p-2.5 text-xs leading-relaxed text-muted">
                  Isi bagian ini diambil otomatis dari data yang sudah ada, jadi tidak perlu
                  dimasukkan dua kali.
                </p>
              ) : null}

              {selected.fields.length > 0 ? (
                <form action={actions.saveSection} className="space-y-3">
                  <input type="hidden" name="pageKey" value={pageKey} />
                  <input type="hidden" name="sectionKey" value={selected.key} />
                  <input type="hidden" name="tab" value={tab} />

                  {selected.fields.map((field) => (
                    <FieldInput key={field.key} field={field} value={selected.content[field.key]} />
                  ))}

                  <button
                    type="submit"
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-pill bg-brand px-4 text-sm font-bold text-white"
                  >
                    Simpan Draf
                  </button>
                </form>
              ) : null}

              {selected.customEditor === "hero_slides" ? (
                <form action={actions.saveHeroSlides} className="space-y-3">
                  <input type="hidden" name="tab" value={tab} />
                  <HeroSlidesEditor
                    initial={
                      (Array.isArray(selected.content.slides)
                        ? (selected.content.slides as HeroSlideDraft[])
                        : []) as HeroSlideDraft[]
                    }
                    initialMode={heroMode(selected.content)}
                    autoPreview={heroAutoPreview}
                    eventOptions={heroEventOptions}
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-pill bg-brand px-4 text-sm font-bold text-white"
                  >
                    Simpan Draf
                  </button>
                </form>
              ) : null}

              {selected.collectionKey && collections[selected.collectionKey] ? (
                <CollectionEditor
                  collection={{
                    key: selected.collectionKey,
                    label: collections[selected.collectionKey].label,
                    description: collections[selected.collectionKey].description,
                    itemNoun: collections[selected.collectionKey].itemNoun,
                    fields: collections[selected.collectionKey].fields,
                  }}
                  tab={tab}
                  rows={collections[selected.collectionKey].rows}
                  saveAction={actions.saveCollectionItem}
                  deleteAction={actions.deleteCollectionItem}
                  moveAction={actions.moveCollectionItem}
                  visibilityAction={actions.collectionVisibility}
                />
              ) : null}

              <details className="rounded-xl border border-line p-3">
                <summary className="cursor-pointer text-xs font-bold text-ink">
                  Tampilan bagian ini
                </summary>
                <div className="mt-3">
                  <PresentationEditor
                    pageKey={pageKey}
                    sectionKey={selected.key}
                    tab={tab}
                    value={selected.presentation}
                    action={actions.savePresentation}
                  />
                </div>
              </details>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
