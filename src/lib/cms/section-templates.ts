/**
 * Section templates an admin can add to a page.
 *
 * Each one reuses a component the website already renders, so adding a
 * section never needs new CSS or a developer. Templates that pull live data
 * (events, gallery, testimonials) declare a `source` field instead of
 * carrying their own copy of that data.
 */

import type { FieldDef } from "@/lib/cms/schema";

export interface SectionTemplate {
  type: string;
  label: string;
  description: string;
  fields: FieldDef[];
  /** Repeatable items live in this collection. */
  collection?: string;
  defaults: Record<string, unknown>;
}

const heading: FieldDef[] = [
  { key: "eyebrow", label: "Label kecil di atas judul", type: "text" },
  { key: "title", label: "Judul", type: "text" },
  { key: "description", label: "Deskripsi", type: "textarea" },
];

const button: FieldDef[] = [
  { key: "buttonLabel", label: "Tombol — tulisan", type: "text" },
  { key: "buttonHref", label: "Tombol — tujuan", type: "url" },
  {
    key: "buttonStyle",
    label: "Tombol — gaya",
    type: "select",
    options: [
      { value: "primary", label: "Utama" },
      { value: "secondary", label: "Sekunder" },
      { value: "outline", label: "Garis" },
      { value: "ghost", label: "Polos" },
    ],
  },
  {
    key: "buttonSize",
    label: "Tombol — ukuran",
    type: "select",
    options: [
      { value: "sm", label: "Kecil" },
      { value: "md", label: "Sedang" },
      { value: "lg", label: "Besar" },
    ],
  },
];

const countField = (label: string): FieldDef => ({
  key: "limit",
  label,
  type: "select",
  options: [
    { value: "3", label: "3" },
    { value: "4", label: "4" },
    { value: "6", label: "6" },
    { value: "8", label: "8" },
    { value: "9", label: "9" },
    { value: "12", label: "12" },
  ],
});

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    type: "text_image",
    label: "Teks + Gambar",
    description: "Satu blok penjelasan dengan gambar di sampingnya.",
    fields: [
      ...heading,
      { key: "imageUrl", label: "Gambar", type: "image" },
      { key: "imageAlt", label: "Keterangan gambar", type: "text" },
      {
        key: "imageFit",
        label: "Cara gambar mengisi",
        type: "select",
        options: [
          { value: "cover", label: "Penuhi bingkai" },
          { value: "contain", label: "Tampilkan utuh" },
        ],
      },
      {
        key: "imagePosition",
        label: "Posisi gambar",
        type: "select",
        options: [
          { value: "right", label: "Kanan" },
          { value: "left", label: "Kiri" },
        ],
      },
      ...button,
    ],
    defaults: { title: "Judul bagian baru", imageFit: "cover", imagePosition: "right" },
  },
  {
    type: "cta",
    label: "Ajakan Bertindak",
    description: "Kotak ajakan dengan satu tombol.",
    fields: [
      { key: "title", label: "Judul", type: "text" },
      { key: "description", label: "Deskripsi", type: "textarea" },
      ...button,
    ],
    defaults: { title: "Siap mencoba kelas pertama?", buttonLabel: "Lihat Event", buttonHref: "/event" },
  },
  {
    type: "video",
    label: "Video",
    description: "Satu video YouTube dengan judul dan penjelasan.",
    fields: [
      ...heading,
      { key: "youtubeUrl", label: "Tautan YouTube", type: "url" },
      { key: "thumbnailUrl", label: "Gambar sampul", type: "image" },
    ],
    defaults: { title: "Lihat keseruannya" },
  },
  {
    type: "feature_grid",
    label: "Kartu Kemampuan",
    description: "Beberapa kartu bericon, seperti bagian Yang Diasah.",
    collection: "pillars",
    fields: heading,
    defaults: { title: "Yang kami asah" },
  },
  {
    type: "event_grid",
    label: "Daftar Event",
    description: "Kelas yang bisa diikuti. Datanya dari menu Event, tidak disalin.",
    fields: [
      ...heading,
      {
        key: "source",
        label: "Event yang ditampilkan",
        type: "select",
        options: [
          { value: "UPCOMING", label: "Yang akan datang" },
          { value: "FEATURED", label: "Yang ditandai disorot" },
        ],
      },
      {
        key: "sort",
        label: "Urutan",
        type: "select",
        options: [
          { value: "SOONEST", label: "Tanggal terdekat" },
          { value: "NEWEST", label: "Paling baru" },
        ],
      },
      countField("Jumlah event"),
    ],
    defaults: { title: "Kelas yang bisa diikuti si kecil", source: "UPCOMING", sort: "SOONEST", limit: "6" },
  },
  {
    type: "gallery_grid",
    label: "Galeri Foto",
    description: "Foto kegiatan. Isinya diatur di tab Galeri.",
    fields: [
      ...heading,
      {
        key: "source",
        label: "Foto yang ditampilkan",
        type: "select",
        options: [
          { value: "LATEST", label: "Terbaru" },
          { value: "FEATURED", label: "Yang ditandai unggulan" },
        ],
      },
      {
        key: "layout",
        label: "Tata letak",
        type: "select",
        options: [
          { value: "GRID", label: "Kotak rapi" },
          { value: "CAROUSEL", label: "Geser menyamping" },
        ],
      },
      countField("Jumlah foto"),
    ],
    defaults: { title: "Sekilas keseruan di kelas", source: "LATEST", layout: "GRID", limit: "6" },
  },
  {
    type: "testimonial",
    label: "Cerita Orang Tua",
    description: "Testimoni, termasuk yang berbentuk video.",
    collection: "testimonials",
    fields: [
      ...heading,
      {
        key: "layout",
        label: "Tata letak",
        type: "select",
        options: [
          { value: "GRID", label: "Kotak rapi" },
          { value: "SINGLE", label: "Satu per satu" },
        ],
      },
    ],
    defaults: { title: "Cerita dari Ayah & Bunda", layout: "GRID" },
  },
  {
    type: "custom_text",
    label: "Teks Bebas",
    description: "Satu blok tulisan, untuk pengumuman atau penjelasan.",
    fields: [
      ...heading,
      {
        key: "body",
        label: "Isi tulisan",
        type: "richtext",
        hint: "Pakai tombol di atas kotak untuk judul, tebal, tautan, daftar, dan gambar.",
      },
    ],
    defaults: { title: "Judul bagian" },
  },
];

/**
 * Reserved page key for saved section templates. No public page renders this
 * key, so templates can live in cms_sections without a table of their own.
 */
export const TEMPLATE_PAGE_KEY = "_templates";

export function findTemplate(type: string): SectionTemplate | undefined {
  return SECTION_TEMPLATES.find((item) => item.type === type);
}
