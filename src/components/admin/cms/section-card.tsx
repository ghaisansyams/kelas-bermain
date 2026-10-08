"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil } from "lucide-react";
import { FieldInput } from "@/components/admin/cms/field-input";
import type { SectionDef } from "@/lib/cms/schema";

/**
 * One section of a page, as a collapsible card. Collapsed by default so the
 * page reads as a list of the website's parts rather than one endless form
 * (section 24 of the brief).
 */
export function SectionCard({
  section,
  pageKey,
  tab,
  content,
  isVisible,
  isDirty,
  canMoveUp,
  canMoveDown,
  saveAction,
  visibilityAction,
  moveAction,
  children,
}: {
  section: SectionDef;
  pageKey: string;
  tab: string;
  content: Record<string, unknown>;
  isVisible: boolean;
  isDirty: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  saveAction: (formData: FormData) => void | Promise<void>;
  visibilityAction: (formData: FormData) => void | Promise<void>;
  moveAction: (formData: FormData) => void | Promise<void>;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-card border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          aria-expanded={open}
        >
          <span
            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full ${
              open ? "bg-brand text-white" : "bg-canvas-deep/60 text-muted"
            }`}
          >
            <Pencil className="size-3.5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-ink">{section.label}</span>
              {!isVisible ? (
                <span className="rounded-pill bg-canvas-deep/60 px-2 py-0.5 text-[0.6875rem] font-bold text-muted">
                  Disembunyikan
                </span>
              ) : null}
              {isDirty ? (
                <span className="rounded-pill bg-sun-soft px-2 py-0.5 text-[0.6875rem] font-bold text-ink">
                  Draf belum terbit
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted">
              {section.description}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <IconForm
            action={moveAction}
            hidden={{ pageKey, sectionKey: section.key, tab, direction: "up" }}
            disabled={!canMoveUp}
            label="Naikkan"
          >
            <ChevronUp className="size-4" aria-hidden />
          </IconForm>
          <IconForm
            action={moveAction}
            hidden={{ pageKey, sectionKey: section.key, tab, direction: "down" }}
            disabled={!canMoveDown}
            label="Turunkan"
          >
            <ChevronDown className="size-4" aria-hidden />
          </IconForm>
          <IconForm
            action={visibilityAction}
            hidden={{
              pageKey,
              sectionKey: section.key,
              tab,
              visible: isVisible ? "false" : "true",
            }}
            label={isVisible ? "Sembunyikan" : "Tampilkan"}
          >
            {isVisible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
          </IconForm>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line p-4">
          {section.fields.length > 0 ? (
            <form action={saveAction} className="space-y-4">
              <input type="hidden" name="pageKey" value={pageKey} />
              <input type="hidden" name="sectionKey" value={section.key} />
              <input type="hidden" name="tab" value={tab} />

              <div className="grid gap-4 sm:grid-cols-2">
                {section.fields.map((field) => (
                  <div
                    key={field.key}
                    className={field.type === "textarea" || field.type === "richtext" ? "sm:col-span-2" : undefined}
                  >
                    <FieldInput field={field} value={content[field.key]} />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-pill bg-brand px-5 text-sm font-bold text-white"
              >
                Simpan Draf
              </button>
            </form>
          ) : null}

          {section.dataDriven ? (
            <p className="mt-3 rounded-xl bg-canvas-deep/40 p-3 text-xs leading-relaxed text-muted">
              Isi bagian ini diambil otomatis dari data yang sudah ada, jadi tidak perlu
              dimasukkan dua kali.
            </p>
          ) : null}

          {children}
        </div>
      ) : null}
    </div>
  );
}

function IconForm({
  action,
  hidden,
  label,
  disabled,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
  label: string;
  disabled?: boolean;
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
        className="inline-flex size-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-30"
      >
        {children}
      </button>
    </form>
  );
}
