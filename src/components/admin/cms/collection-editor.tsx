"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { FieldInput } from "@/components/admin/cms/field-input";
import type { CollectionDef } from "@/lib/cms/schema";

export interface CollectionRow {
  itemKey: string;
  content: Record<string, unknown>;
  isVisible: boolean;
  isDirty: boolean;
}

/**
 * Add / edit / reorder / hide / delete for one repeatable list. Used for the
 * pillars, hero slides, testimonials, gallery, news and updates — all from the
 * same component, driven by the collection's field definitions.
 */
export function CollectionEditor({
  collection,
  tab,
  rows,
  saveAction,
  deleteAction,
  moveAction,
  visibilityAction,
}: {
  collection: CollectionDef;
  tab: string;
  rows: CollectionRow[];
  saveAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  moveAction: (formData: FormData) => void | Promise<void>;
  visibilityAction: (formData: FormData) => void | Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const titleOf = (content: Record<string, unknown>) =>
    String(content.title ?? content.name ?? content.caption ?? content.alt ?? "Tanpa judul");

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-extrabold text-ink">{collection.label}</h4>
          <p className="text-xs text-muted">{collection.description}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAdding((value) => !value);
            setEditing(null);
          }}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-line px-3 text-xs font-bold text-ink hover:border-brand/40 hover:text-brand"
        >
          <Plus className="size-3.5" aria-hidden />
          Tambah {collection.itemNoun}
        </button>
      </div>

      {adding ? (
        <ItemForm
          collection={collection}
          tab={tab}
          itemKey=""
          content={{}}
          action={saveAction}
          onCancel={() => setAdding(false)}
        />
      ) : null}

      {rows.length === 0 && !adding ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          Belum ada {collection.itemNoun}. Tambahkan yang pertama.
        </p>
      ) : null}

      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li key={row.itemKey} className="rounded-xl border border-line bg-canvas-deep/20">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3">
              <button
                type="button"
                onClick={() => setEditing(editing === row.itemKey ? null : row.itemKey)}
                className="min-w-0 flex-1 text-left"
                aria-expanded={editing === row.itemKey}
              >
                <RowPreview
                  title={titleOf(row.content)}
                  content={row.content}
                  expanded={editing === row.itemKey}
                  isVisible={row.isVisible}
                  isDirty={row.isDirty}
                />
              </button>

              <div className="flex shrink-0 items-center gap-1.5">
                <Mini
                  action={moveAction}
                  hidden={{ collectionKey: collection.key, itemKey: row.itemKey, tab, direction: "up" }}
                  disabled={index === 0}
                  label="Naikkan"
                >
                  <ChevronUp className="size-3.5" aria-hidden />
                </Mini>
                <Mini
                  action={moveAction}
                  hidden={{ collectionKey: collection.key, itemKey: row.itemKey, tab, direction: "down" }}
                  disabled={index === rows.length - 1}
                  label="Turunkan"
                >
                  <ChevronDown className="size-3.5" aria-hidden />
                </Mini>
                <Mini
                  action={visibilityAction}
                  hidden={{
                    collectionKey: collection.key,
                    itemKey: row.itemKey,
                    tab,
                    visible: row.isVisible ? "false" : "true",
                  }}
                  label={row.isVisible ? "Sembunyikan" : "Tampilkan"}
                >
                  {row.isVisible ? (
                    <Eye className="size-3.5" aria-hidden />
                  ) : (
                    <EyeOff className="size-3.5" aria-hidden />
                  )}
                </Mini>
                <Mini
                  action={deleteAction}
                  hidden={{ collectionKey: collection.key, itemKey: row.itemKey, tab }}
                  label="Hapus"
                  danger
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </Mini>
              </div>
            </div>

            {editing === row.itemKey ? (
              <div className="border-t border-line p-3">
                <ItemForm
                  collection={collection}
                  tab={tab}
                  itemKey={row.itemKey}
                  content={row.content}
                  action={saveAction}
                  onCancel={() => setEditing(null)}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

const HASHTAG = /#[\p{L}\p{N}_]+/gu;

/**
 * Pratinjau satu baris: gambar, judul, caption, dan hashtag. Untuk koleksi
 * tanpa gambar/caption (pilar, testimoni, dst.) tampilannya tetap sebaris judul.
 */
function RowPreview({
  title,
  content,
  expanded,
  isVisible,
  isDirty,
}: {
  title: string;
  content: Record<string, unknown>;
  expanded: boolean;
  isVisible: boolean;
  isDirty: boolean;
}) {
  const image = typeof content.imageUrl === "string" ? content.imageUrl : "";
  const caption = typeof content.caption === "string" ? content.caption.trim() : "";
  const date = typeof content.publishedAt === "string" ? content.publishedAt : "";
  const category = typeof content.category === "string" ? content.category : "";

  const hashtags = Array.from(new Set(caption.match(HASHTAG) ?? []));
  const body = caption.replace(HASHTAG, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  return (
    <span className="flex items-start gap-3">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail from local uploads
        <img
          src={image}
          alt=""
          className={`shrink-0 rounded-lg object-cover ${expanded ? "size-40" : "size-20"}`}
        />
      ) : null}

      <span className="block min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-ink">{title}</span>
          {!isVisible ? (
            <span className="rounded-pill bg-canvas-deep px-2 py-0.5 text-[0.625rem] font-bold text-muted">
              Disembunyikan
            </span>
          ) : null}
          {isDirty ? (
            <span className="rounded-pill bg-sun-soft px-2 py-0.5 text-[0.625rem] font-bold text-ink">
              Draf
            </span>
          ) : null}
        </span>

        {date || category ? (
          <span className="mt-0.5 block text-xs text-muted">
            {[date, category].filter(Boolean).join(" · ")}
          </span>
        ) : null}

        {body ? (
          <span
            className={`mt-1.5 block whitespace-pre-line text-sm text-ink-soft ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            {body}
          </span>
        ) : null}

        {hashtags.length > 0 ? (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {(expanded ? hashtags : hashtags.slice(0, 4)).map((tag) => (
              <span
                key={tag}
                className="rounded-pill bg-brand/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-brand"
              >
                {tag}
              </span>
            ))}
            {!expanded && hashtags.length > 4 ? (
              <span className="px-1 text-[0.6875rem] font-semibold text-muted">
                +{hashtags.length - 4}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function ItemForm({
  collection,
  tab,
  itemKey,
  content,
  action,
  onCancel,
}: {
  collection: CollectionDef;
  tab: string;
  itemKey: string;
  content: Record<string, unknown>;
  action: (formData: FormData) => void | Promise<void>;
  onCancel: () => void;
}) {
  return (
    <form action={action} className="space-y-3 rounded-xl border border-line bg-surface p-3">
      <input type="hidden" name="collectionKey" value={collection.key} />
      <input type="hidden" name="itemKey" value={itemKey} />
      <input type="hidden" name="tab" value={tab} />

      <div className="grid gap-3 sm:grid-cols-2">
        {collection.fields.map((field) => (
          <div key={field.key} className={field.type === "textarea" || field.type === "richtext" ? "sm:col-span-2" : undefined}>
            <FieldInput field={field} value={content[field.key]} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="inline-flex min-h-10 items-center rounded-pill bg-brand px-4 text-sm font-bold text-white"
        >
          Simpan
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-10 items-center rounded-pill border border-line px-4 text-sm font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

function Mini({
  action,
  hidden,
  label,
  disabled,
  danger,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <button
        type="submit"
        disabled={disabled}
        title={label}
        aria-label={label}
        className={`inline-flex size-8 items-center justify-center rounded-full border border-line transition-colors disabled:opacity-30 ${
          danger ? "text-muted hover:border-brand/40 hover:text-brand" : "text-muted hover:border-brand/40 hover:text-brand"
        }`}
      >
        {children}
      </button>
    </form>
  );
}
