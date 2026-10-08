"use client";

import { useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { MediaPicker } from "@/components/admin/media-picker";
import { RichTextInput } from "@/components/admin/cms/richtext-input";
import type { FieldDef } from "@/lib/cms/schema";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-[0.9375rem] font-medium text-ink";

/**
 * Renders one CMS field from its definition. Every field posts a plain form
 * value under its own name, so the save action never needs to know which
 * section it came from.
 */
export function FieldInput({
  field,
  value,
  namePrefix = "",
}: {
  field: FieldDef;
  value: unknown;
  namePrefix?: string;
}) {
  const name = `${namePrefix}${field.key}`;
  const initial = value == null ? "" : String(value);

  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
      {field.label}
      <FieldControl field={field} name={name} initial={initial} value={value} />
      {field.hint && field.type !== "richtext" ? (
        <span className="text-xs font-medium text-muted">{field.hint}</span>
      ) : null}
    </label>
  );
}

function FieldControl({
  field,
  name,
  initial,
  value,
}: {
  field: FieldDef;
  name: string;
  initial: string;
  value: unknown;
}) {
  switch (field.type) {
    case "textarea":
      return (
        <textarea
          name={name}
          defaultValue={initial}
          rows={4}
          placeholder={field.placeholder}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[0.9375rem] leading-relaxed font-medium text-ink"
        />
      );

    case "boolean":
      return (
        <span className="flex items-center gap-2 pt-1">
          {/* The hidden input makes an unchecked box post "false" rather than nothing. */}
          <input type="hidden" name={name} value="false" />
          <input
            type="checkbox"
            name={name}
            value="true"
            defaultChecked={value === true}
            className="size-5 rounded border-line accent-brand"
          />
          <span className="text-sm font-medium text-ink-soft">Aktif</span>
        </span>
      );

    case "select":
      return (
        <select name={name} defaultValue={initial} className={inputClass}>
          <option value="">— pilih —</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case "number":
      return (
        <input
          type="number"
          name={name}
          defaultValue={initial}
          min={0}
          placeholder={field.placeholder}
          className={inputClass}
        />
      );

    case "richtext":
      return <RichTextInput name={name} initial={initial} hint={field.hint} />;

    case "color":
      return <ColorField name={name} initial={initial} />;

    case "image":
      return <ImageField name={name} initial={initial} />;

    default:
      return (
        <input
          name={name}
          defaultValue={initial}
          placeholder={field.placeholder}
          className={inputClass}
        />
      );
  }
}

/** Colour swatch plus the raw value, so a brand hex can be pasted exactly. */
function ColorField({ name, initial }: { name: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const isHex = /^#[0-9a-fA-F]{3,8}$/.test(value);

  return (
    <span className="flex items-center gap-2">
      <input
        type="color"
        value={isHex ? value : "#ffffff"}
        onChange={(event) => setValue(event.target.value)}
        aria-label="Pilih warna"
        className="size-11 shrink-0 cursor-pointer rounded-xl border border-line bg-surface p-1"
      />
      <input
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Kosongkan untuk warna bawaan"
        className={inputClass}
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Kosongkan warna"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-muted hover:text-brand"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </span>
  );
}

/** Pick from the Media Library, or paste a URL for an image hosted elsewhere. */
function ImageField({ name, initial }: { name: string; initial: string }) {
  const [value, setValue] = useState(initial);

  return (
    <span className="flex flex-col gap-2">
      <span className="flex items-center gap-2">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="size-11 shrink-0 rounded-xl border border-line object-cover"
          />
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-line text-muted">
            <ImageIcon className="size-4" aria-hidden />
          </span>
        )}
        <input
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Pilih dari Media Library atau tempel tautan gambar"
          className={inputClass}
        />
      </span>
      <MediaPicker value={value} onChange={(url) => setValue(url)} folder="general" />
    </span>
  );
}
