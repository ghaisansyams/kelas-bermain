/**
 * CMS field registry.
 *
 * Every editable part of the public site is described here as data, not as a
 * bespoke form. Adding a field to a section means adding one line below — the
 * admin UI, the save action and the public reader all follow automatically.
 * This is what keeps the CMS from turning into fifty hand-written forms.
 *
 * Labels are written for Kelas Bermain's staff, so nothing here says "JSON",
 * "schema" or "component".
 */

export type FieldType =
  | "text"
  | "textarea"
  | "image"
  | "url"
  | "color"
  | "number"
  | "boolean"
  | "select"
  | "richtext"
  | "icon";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface SectionDef {
  key: string;
  label: string;
  /** Shown under the section title in the admin, in plain language. */
  description: string;
  fields: FieldDef[];
  /** A section fed by a collection links to that collection's editor. */
  collection?: string;
  /** Sections that only pull live data (events, gallery) have no body fields. */
  dataDriven?: boolean;
  /** Renders a purpose-built editor instead of the generic field list. */
  customEditor?: "hero_slides";
}

export interface CollectionDef {
  key: string;
  label: string;
  description: string;
  /** Used for the "Tambah …" button and the empty state. */
  itemNoun: string;
  fields: FieldDef[];
}

export interface PageDef {
  key: string;
  label: string;
  description: string;
  /** Public URL, used by the Preview button. */
  previewPath: string;
  sections: SectionDef[];
}

/* ------------------------------------------------------------------ */
/* Shared field groups                                                 */
/* ------------------------------------------------------------------ */

const headingFields: FieldDef[] = [
  { key: "eyebrow", label: "Label kecil di atas judul", type: "text" },
  { key: "title", label: "Judul", type: "text" },
  { key: "description", label: "Deskripsi", type: "textarea" },
];

const ACCENTS = [
  { value: "brand", label: "Merah bata" },
  { value: "pine", label: "Hijau pinus" },
  { value: "sun", label: "Kuning" },
  { value: "grape", label: "Ungu" },
  { value: "leaf", label: "Hijau daun" },
  { value: "sky", label: "Biru langit" },
];

const PILLAR_ICONS = [
  { value: "compass", label: "Kompas" },
  { value: "sparkles", label: "Kilau" },
  { value: "footprints", label: "Jejak kaki" },
  { value: "message", label: "Percakapan" },
];

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

export const HOME_PAGE: PageDef = {
  key: "home",
  label: "Halaman Depan",
  description: "Semua bagian halaman depan, berurutan dari atas ke bawah.",
  previewPath: "/",
  sections: [
    {
      key: "hero",
      label: "Hero",
      description: "Bagian paling atas: judul besar, deskripsi, dan dua tombol.",
      fields: [
        { key: "eyebrow", label: "Label kecil di atas judul", type: "text" },
        { key: "title", label: "Judul besar", type: "textarea" },
        {
          key: "highlight",
          label: "Kata yang diberi warna",
          type: "text",
          hint: "Harus salah satu kata yang ada di judul besar.",
        },
        { key: "description", label: "Deskripsi", type: "textarea" },
        { key: "primaryCtaLabel", label: "Tombol utama — tulisan", type: "text" },
        { key: "primaryCtaHref", label: "Tombol utama — tujuan", type: "url" },
        { key: "secondaryCtaLabel", label: "Tombol kedua — tulisan", type: "text" },
        { key: "secondaryCtaHref", label: "Tombol kedua — tujuan", type: "url" },
        { key: "statValue", label: "Sorotan — isi", type: "text" },
        { key: "statLabel", label: "Sorotan — keterangan", type: "text" },
      ],
    },
    {
      key: "hero_slides",
      label: "Gambar Hero",
      description: "Gambar yang berganti otomatis di sebelah judul besar.",
      // Slides are stored as one array inside this section, not as a
      // collection, so the section card renders the existing slides editor
      // instead of the generic collection UI.
      customEditor: "hero_slides",
      fields: [],
    },
    {
      key: "pillars",
      label: "Yang Diasah",
      description: "Kemampuan yang dilatih setiap kegiatan.",
      collection: "pillars",
      fields: headingFields,
    },
    {
      key: "events_teaser",
      label: "Jadwal Kegiatan",
      description: "Judul bagian daftar kelas. Kelasnya sendiri diambil dari menu Event.",
      dataDriven: true,
      fields: [
        ...headingFields,
        { key: "limit", label: "Jumlah kelas yang ditampilkan", type: "number" },
        {
          key: "sort",
          label: "Urutan",
          type: "select",
          options: [
            { value: "SOONEST", label: "Tanggal terdekat" },
            { value: "NEWEST", label: "Paling baru dibuat" },
            { value: "FEATURED", label: "Yang disorot dulu" },
          ],
        },
        {
          key: "category",
          label: "Hanya kategori tertentu",
          type: "text",
          hint: "Kosongkan untuk menampilkan semua kategori.",
        },
      ],
    },
    {
      key: "join_steps",
      label: "Cara Ikut",
      description: "Empat langkah pendaftaran.",
      fields: headingFields,
    },
    {
      key: "activities",
      label: "Yang Sudah Kami Jalankan",
      description: "Kegiatan yang sudah selesai. Datanya diambil otomatis dari Event.",
      dataDriven: true,
      fields: [
        ...headingFields,
        { key: "limit", label: "Jumlah yang ditampilkan", type: "number" },
      ],
    },
    {
      key: "gallery",
      label: "Galeri Foto",
      description:
        "Judul bagian galeri. Tautan folder Drive-nya diatur di tab Website → Galeri.",
      dataDriven: true,
      fields: headingFields,
    },
    {
      key: "testimonials",
      label: "Cerita Ayah & Bunda",
      description: "Cerita orang tua, dalam bentuk video.",
      collection: "testimonials",
      fields: headingFields,
    },
    {
      key: "social_feed",
      label: "Ikuti Keseruan",
      description: "Cuplikan Update terbaru dan tautan ke Instagram.",
      fields: [
        ...headingFields,
        { key: "buttonLabel", label: "Tombol — tulisan", type: "text" },
        { key: "buttonHref", label: "Tombol — tujuan", type: "url" },
        { key: "instagramUrl", label: "Tautan Instagram", type: "url" },
        { key: "limit", label: "Jumlah yang ditampilkan", type: "number" },
      ],
    },
    {
      key: "cta",
      label: "Ajakan Daftar",
      description: "Kotak ajakan di bagian paling bawah sebelum footer.",
      fields: [
        { key: "title", label: "Judul", type: "text" },
        { key: "description", label: "Deskripsi", type: "textarea" },
        { key: "buttonLabel", label: "Tombol — tulisan", type: "text" },
        { key: "buttonHref", label: "Tombol — tujuan", type: "url" },
      ],
    },
  ],
};

export const GLOBAL_PAGE: PageDef = {
  key: "global",
  label: "Website",
  description: "Pengaturan yang berlaku di seluruh halaman.",
  previewPath: "/",
  sections: [
    {
      key: "identity",
      label: "Identitas Website",
      description: "Nama, logo, dan akun media sosial.",
      fields: [
        { key: "name", label: "Nama website", type: "text" },
        { key: "tagline", label: "Tagline", type: "text" },
        { key: "description", label: "Deskripsi singkat", type: "textarea" },
        { key: "logoUrl", label: "Logo utama", type: "image" },
        { key: "logoMobileUrl", label: "Logo versi HP", type: "image" },
        { key: "faviconUrl", label: "Ikon tab browser", type: "image" },
        { key: "email", label: "Email", type: "text" },
        { key: "whatsapp", label: "WhatsApp", type: "text" },
        { key: "instagramUrl", label: "Instagram", type: "url" },
        { key: "youtubeUrl", label: "YouTube", type: "url" },
        { key: "tiktokUrl", label: "TikTok", type: "url" },
        { key: "facebookUrl", label: "Facebook", type: "url" },
        { key: "threadsUrl", label: "Threads", type: "url" },
      ],
    },
    {
      key: "footer",
      label: "Footer",
      description: "Bagian paling bawah di semua halaman.",
      fields: [
        { key: "description", label: "Deskripsi", type: "textarea" },
        { key: "contactTitle", label: "Judul kolom kontak", type: "text" },
        { key: "copyright", label: "Tulisan hak cipta", type: "text" },
        {
          key: "showWhatsapp",
          label: "Tampilkan nomor WhatsApp",
          type: "boolean",
          hint: "Matikan bila nomor tidak boleh tampil publik.",
        },
      ],
    },
    {
      key: "seo",
      label: "SEO",
      description: "Judul dan deskripsi yang muncul di Google dan saat dibagikan.",
      fields: [
        { key: "siteTitle", label: "Judul website", type: "text" },
        { key: "description", label: "Deskripsi", type: "textarea" },
        { key: "keywords", label: "Kata kunci", type: "text" },
        { key: "ogImageUrl", label: "Gambar saat dibagikan", type: "image" },
      ],
    },
    {
      key: "theme",
      label: "Tampilan",
      description:
        "Warna dan bentuk. Kosongkan untuk memakai bawaan — ukuran huruf dan jarak tetap dijaga agar tampilan di HP tidak rusak.",
      fields: [
        { key: "brand", label: "Warna utama", type: "color" },
        { key: "brandInk", label: "Warna utama (gelap)", type: "color" },
        { key: "accent", label: "Warna aksen", type: "color" },
        { key: "canvas", label: "Warna latar halaman", type: "color" },
        { key: "surface", label: "Warna latar kartu", type: "color" },
        { key: "ink", label: "Warna teks", type: "color" },
        { key: "muted", label: "Warna teks samar", type: "color" },
        { key: "line", label: "Warna garis", type: "color" },
        {
          key: "radiusButton",
          label: "Kelengkungan tombol",
          type: "text",
          placeholder: "contoh: 999px",
        },
        {
          key: "radiusCard",
          label: "Kelengkungan kartu",
          type: "text",
          placeholder: "contoh: 20px",
        },
      ],
    },
  ],
};

export const PAGES: PageDef[] = [GLOBAL_PAGE, HOME_PAGE];

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export const COLLECTIONS: CollectionDef[] = [
  {
    key: "pillars",
    label: "Yang Diasah",
    description: "Kemampuan yang dilatih di setiap kegiatan.",
    itemNoun: "kemampuan",
    fields: [
      { key: "title", label: "Nama kemampuan", type: "text" },
      { key: "description", label: "Penjelasan", type: "textarea" },
      { key: "icon", label: "Ikon", type: "select", options: PILLAR_ICONS },
      { key: "accent", label: "Warna", type: "select", options: ACCENTS },
    ],
  },
  {
    key: "testimonials",
    label: "Cerita Ayah & Bunda",
    description: "Cerita orang tua dalam bentuk video.",
    itemNoun: "cerita",
    fields: [
      { key: "name", label: "Nama", type: "text" },
      { key: "role", label: "Keterangan", type: "text", placeholder: "Bunda dari Alya, 6 tahun" },
      { key: "quote", label: "Kutipan", type: "textarea" },
      { key: "youtubeUrl", label: "Tautan YouTube", type: "url" },
      { key: "thumbnailUrl", label: "Gambar sampul", type: "image" },
      { key: "eventTitle", label: "Kelas yang diikuti", type: "text" },
    ],
  },
  {
    key: "updates",
    label: "Update",
    description: "Kabar singkat bergaya Instagram di halaman Update.",
    itemNoun: "update",
    fields: [
      { key: "title", label: "Judul", type: "text" },
      { key: "slug", label: "Alamat halaman", type: "text" },
      { key: "excerpt", label: "Ringkasan", type: "textarea" },
      { key: "imageUrl", label: "Gambar", type: "image" },
      { key: "category", label: "Kategori", type: "text" },
      { key: "postUrl", label: "Tautan postingan Instagram", type: "url" },
      { key: "publishedAt", label: "Tanggal", type: "text", placeholder: "2026-10-06" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "DRAFT", label: "Draf — belum tayang" },
          { value: "PUBLISHED", label: "Terbit" },
          { value: "ARCHIVED", label: "Diarsipkan" },
        ],
      },
    ],
  },
];

export function findCollection(key: string): CollectionDef | undefined {
  return COLLECTIONS.find((item) => item.key === key);
}

export function findPage(key: string): PageDef | undefined {
  return PAGES.find((item) => item.key === key);
}

export function findSection(pageKey: string, sectionKey: string): SectionDef | undefined {
  return findPage(pageKey)?.sections.find((item) => item.key === sectionKey);
}
