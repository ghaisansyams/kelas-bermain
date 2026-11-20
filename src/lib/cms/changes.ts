import { heroMode, parseManualSlides } from "@/lib/cms/hero";
import type { FieldDef } from "@/lib/cms/schema";

/**
 * Perbedaan antara draf dan isi yang sedang tayang, dalam kalimat yang bisa
 * dibaca admin sebelum menekan Publikasikan.
 */
export interface ChangeLine {
  label: string;
  before: string;
  after: string;
}

export interface SectionChange {
  section: string;
  /** Penjelasan singkat, misalnya "Baru, belum pernah tayang". */
  note?: string;
  lines: ChangeLine[];
}

type Content = Record<string, unknown> | null | undefined;

const EMPTY = "(kosong)";
const MAX = 110;

function clip(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > MAX ? `${flat.slice(0, MAX - 1)}…` : flat;
}

function show(field: FieldDef | undefined, value: unknown): string {
  if (value === null || value === undefined || value === "") return EMPTY;
  if (field?.type === "boolean") return value === true || value === "true" ? "Aktif" : "Mati";
  if (field?.type === "select") {
    return field.options?.find((option) => option.value === String(value))?.label ?? clip(String(value));
  }
  if (field?.type === "image") return String(value).split("/").pop() || EMPTY;
  if (typeof value === "object") return clip(JSON.stringify(value));
  return clip(String(value)) || EMPTY;
}

const SLIDE_FIELDS: { key: "title" | "date" | "location" | "eventSlug" | "image" | "alt"; label: string }[] = [
  { key: "title", label: "Judul" },
  { key: "date", label: "Tanggal" },
  { key: "location", label: "Lokasi" },
  { key: "eventSlug", label: "Event tujuan" },
  { key: "image", label: "Gambar" },
  { key: "alt", label: "Teks alternatif" },
];

function heroLines(draft: Content, published: Content): ChangeLine[] {
  const lines: ChangeLine[] = [];
  const modeLabel = (mode: string) => (mode === "auto" ? "Otomatis dari event" : "Atur sendiri");
  const before = heroMode(published);
  const after = heroMode(draft);
  if (before !== after) lines.push({ label: "Cara mengisi banner", before: modeLabel(before), after: modeLabel(after) });

  const oldSlides = parseManualSlides(published);
  const newSlides = parseManualSlides(draft);
  const oldById = new Map(oldSlides.map((slide) => [slide.id, slide]));
  const newIds = new Set(newSlides.map((slide) => slide.id));

  newSlides.forEach((slide, index) => {
    const old = oldById.get(slide.id);
    const name = `Slide ${index + 1}${slide.title ? ` (${clip(slide.title)})` : ""}`;
    if (!old) {
      lines.push({ label: name, before: "(belum ada)", after: "Slide baru ditambahkan" });
      return;
    }
    for (const field of SLIDE_FIELDS) {
      const a = old[field.key];
      const b = slide[field.key];
      if (a !== b) {
        lines.push({
          label: `${name} — ${field.label}`,
          before: show(field.key === "image" ? { key: "", label: "", type: "image" } : undefined, a),
          after: show(field.key === "image" ? { key: "", label: "", type: "image" } : undefined, b),
        });
      }
    }
  });
  for (const slide of oldSlides) {
    if (!newIds.has(slide.id)) lines.push({ label: `Slide "${clip(slide.title) || slide.id}"`, before: "Tampil", after: "Dihapus" });
  }
  const oldOrder = oldSlides.filter((slide) => newIds.has(slide.id)).map((slide) => slide.id).join(",");
  const newOrder = newSlides.filter((slide) => oldById.has(slide.id)).map((slide) => slide.id).join(",");
  if (oldOrder !== newOrder) lines.push({ label: "Urutan slide", before: "Lama", after: "Diubah" });
  return lines;
}

export function describeSectionChange(input: {
  label: string;
  fields: FieldDef[];
  draft: Content;
  published: Content;
  customEditor?: string | null;
}): SectionChange | null {
  const { label, fields, draft, published } = input;
  if (JSON.stringify(draft ?? null) === JSON.stringify(published ?? null)) return null;

  const lines: ChangeLine[] =
    input.customEditor === "hero_slides"
      ? heroLines(draft, published)
      : (fields.length > 0
          ? fields
          : [...new Set([...Object.keys(draft ?? {}), ...Object.keys(published ?? {})])].map(
              (key): FieldDef => ({ key, label: key, type: "text" }),
            )
        )
          .map((field) => ({
            label: field.label,
            before: show(field, published?.[field.key]),
            after: show(field, draft?.[field.key]),
          }))
          .filter((line) => line.before !== line.after);

  return {
    section: label,
    note: published ? undefined : "Baru, belum pernah tayang",
    lines,
  };
}
