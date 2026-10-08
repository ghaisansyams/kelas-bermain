"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { SECTION_TEMPLATES } from "@/lib/cms/section-templates";

export interface StructureItem {
  key: string;
  label: string;
  isVisible: boolean;
  isDirty: boolean;
  /** Sections that shipped with the site cannot be archived. */
  isCore: boolean;
}

/**
 * The page's structure, as a reorderable list.
 *
 * Dragging uses the browser's own drag events rather than a library: a single
 * vertical list needs no dependency, and the arrow buttons double as the
 * keyboard path, so reordering works without a mouse (§34).
 *
 * Dropping only submits a new order of keys — never content — so a drag can
 * never touch an event, a payment or a registration (§6).
 */
export function StructurePanel({
  pageKey,
  tab,
  items,
  selectedKey,
  onSelect,
  reorderAction,
  visibilityAction,
  duplicateAction,
  archiveAction,
  addAction,
}: {
  pageKey: string;
  tab: string;
  items: StructureItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  reorderAction: (formData: FormData) => void | Promise<void>;
  visibilityAction: (formData: FormData) => void | Promise<void>;
  duplicateAction: (formData: FormData) => void | Promise<void>;
  archiveAction: (formData: FormData) => void | Promise<void>;
  addAction: (formData: FormData) => void | Promise<void>;
}) {
  const [order, setOrder] = useState(items.map((item) => item.key));
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Server is the source of truth; a publish or save elsewhere resets us.
  useEffect(() => {
    setOrder(items.map((item) => item.key));
  }, [items]);

  const byKey = new Map(items.map((item) => [item.key, item]));
  const dirty = order.join(",") !== items.map((item) => item.key).join(",");

  function move(key: string, direction: -1 | 1) {
    setOrder((current) => {
      const index = current.indexOf(key);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function dropOn(targetKey: string) {
    if (!dragKey || dragKey === targetKey) return;
    setOrder((current) => {
      const next = current.filter((key) => key !== dragKey);
      next.splice(next.indexOf(targetKey), 0, dragKey);
      return next;
    });
    setDragKey(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Struktur Halaman</h2>
        <button
          type="button"
          onClick={() => setAdding((value) => !value)}
          aria-expanded={adding}
          className="inline-flex min-h-8 items-center gap-1 rounded-pill border border-line px-2.5 text-xs font-bold text-ink hover:border-brand/40 hover:text-brand"
        >
          <Plus className="size-3.5" aria-hidden />
          Section
        </button>
      </div>

      {adding ? (
        <form action={addAction} className="space-y-2 rounded-xl border border-line p-3">
          <input type="hidden" name="pageKey" value={pageKey} />
          <input type="hidden" name="tab" value={tab} />
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink">
            Jenis section
            <select
              name="sectionType"
              className="h-10 rounded-lg border border-line bg-surface px-2 text-sm text-ink"
            >
              {SECTION_TEMPLATES.map((template) => (
                <option key={template.type} value={template.type}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs leading-relaxed text-muted">
            Section baru dibuat sebagai draf — tidak langsung tampil di website.
          </p>
          <button
            type="submit"
            className="inline-flex min-h-9 w-full items-center justify-center rounded-pill bg-brand px-3 text-xs font-bold text-white"
          >
            Tambahkan
          </button>
        </form>
      ) : null}

      <ul className="space-y-1.5">
        {order.map((key, index) => {
          const item = byKey.get(key);
          if (!item) return null;
          const selected = selectedKey === key;

          return (
            <li
              key={key}
              draggable
              onDragStart={() => setDragKey(key)}
              onDragEnd={() => setDragKey(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropOn(key)}
              className={`rounded-xl border bg-surface transition-colors ${
                selected ? "border-brand" : "border-line"
              } ${dragKey === key ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-1 p-2">
                <span
                  aria-hidden
                  className="cursor-grab text-muted active:cursor-grabbing"
                  title="Seret untuk memindahkan"
                >
                  <GripVertical className="size-4" />
                </span>

                <button
                  type="button"
                  onClick={() => onSelect(key)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`truncate text-sm font-bold ${
                        item.isVisible ? "text-ink" : "text-muted line-through"
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.isDirty ? (
                      <span className="rounded-pill bg-sun-soft px-1.5 py-0.5 text-[0.5625rem] font-bold text-ink">
                        DRAF
                      </span>
                    ) : null}
                  </span>
                </button>

                <span className="flex shrink-0 items-center">
                  <IconBtn
                    label="Naikkan"
                    onClick={() => move(key, -1)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="size-3.5" aria-hidden />
                  </IconBtn>
                  <IconBtn
                    label="Turunkan"
                    onClick={() => move(key, 1)}
                    disabled={index === order.length - 1}
                  >
                    <ChevronDown className="size-3.5" aria-hidden />
                  </IconBtn>
                </span>
              </div>

              {selected ? (
                <div className="flex flex-wrap gap-1 border-t border-line p-2">
                  <MiniForm
                    action={visibilityAction}
                    hidden={{
                      pageKey,
                      sectionKey: key,
                      tab,
                      visible: item.isVisible ? "false" : "true",
                    }}
                    label={item.isVisible ? "Sembunyikan" : "Tampilkan"}
                  >
                    {item.isVisible ? (
                      <EyeOff className="size-3.5" aria-hidden />
                    ) : (
                      <Eye className="size-3.5" aria-hidden />
                    )}
                    {item.isVisible ? "Sembunyikan" : "Tampilkan"}
                  </MiniForm>

                  <MiniForm
                    action={duplicateAction}
                    hidden={{ pageKey, sectionKey: key, tab }}
                    label="Duplikat"
                  >
                    <Copy className="size-3.5" aria-hidden />
                    Duplikat
                  </MiniForm>

                  {!item.isCore ? (
                    <MiniForm
                      action={archiveAction}
                      hidden={{ pageKey, sectionKey: key, tab }}
                      label="Arsipkan"
                      confirm="Section ini akan disembunyikan dari website. Isinya tetap tersimpan dan bisa dikembalikan. Lanjutkan?"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      Arsipkan
                    </MiniForm>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {dirty ? (
        <form action={reorderAction} className="rounded-xl border border-brand/30 bg-brand-soft/40 p-2.5">
          <input type="hidden" name="pageKey" value={pageKey} />
          <input type="hidden" name="tab" value={tab} />
          <input type="hidden" name="order" value={order.join(",")} />
          <p className="text-xs font-semibold text-brand-ink">Urutan berubah dan belum disimpan.</p>
          <div className="mt-2 flex gap-1.5">
            <button
              type="submit"
              className="inline-flex min-h-9 flex-1 items-center justify-center rounded-pill bg-brand px-3 text-xs font-bold text-white"
            >
              Simpan Urutan
            </button>
            <button
              type="button"
              onClick={() => setOrder(items.map((item) => item.key))}
              className="inline-flex min-h-9 items-center rounded-pill border border-line bg-surface px-3 text-xs font-semibold text-ink-soft"
            >
              Batal
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="inline-flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:text-brand disabled:opacity-25"
    >
      {children}
    </button>
  );
}

function MiniForm({
  action,
  hidden,
  label,
  confirm,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
  label: string;
  confirm?: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <button
        type="submit"
        aria-label={label}
        className="inline-flex min-h-8 items-center gap-1 rounded-pill border border-line px-2.5 text-[0.6875rem] font-bold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
      >
        {children}
      </button>
    </form>
  );
}
