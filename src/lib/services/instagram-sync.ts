import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchApifyPosts, type ApifyPost } from "@/lib/services/instagram-apify";

/**
 * Memindahkan postingan Instagram ke halaman Update.
 *
 * Dua keputusan yang membentuk berkas ini:
 *
 * 1. Postingan masuk sebagai DRAF, bukan langsung tayang. Yang ditulis ke
 *    `published` adalah null, jadi situs belum menampilkannya sampai admin
 *    menekan Terbitkan di CMS. Menyalakan jalur otomatis dari akun media
 *    sosial ke halaman publik tanpa satu pun mata manusia di tengahnya
 *    berarti satu salah unggah di Instagram langsung jadi halaman di situs.
 *
 * 2. Gambarnya disalin, bukan ditautkan. URL CDN Instagram ditandatangani
 *    dan mati dalam hitungan minggu, dan menautkannya langsung kena 403.
 *
 * Soal hak akses: ini login sebagai akun admin khusus lewat Supabase Auth,
 * BUKAN service-role key. Artinya cron ini hanya bisa melakukan apa yang
 * seorang admin bisa lakukan lewat antarmuka — kalau kredensialnya bocor,
 * yang hilang sebatas itu, bukan seluruh database.
 */

const BUCKET = "website";
const COLLECTION = "updates";

export interface SyncReport {
  ok: boolean;
  scanned: number;
  saved: number;
  skipped: number;
  uploaded: number;
  reused: number;
  error?: string;
  /** Judul yang baru masuk, untuk ditampilkan di log cron. */
  titles: string[];
}

/* ------------------------------------------------------------------ */
/* Mengubah caption jadi isi kartu                                      */
/* ------------------------------------------------------------------ */

const CATEGORY_RULES: [string, RegExp][] = [
  ["Pengumuman", /\b(pengumuman|info penting|perhatian|mohon|dibuka|ditutup)\b/i],
  ["Event", /\b(event|kelas|workshop|open house|pendaftaran|daftar|kuota)\b/i],
  ["Dokumentasi", /\b(dokumentasi|keseruan|momen|recap|galeri|terima kasih)\b/i],
];

function detectCategory(caption: string): string {
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(caption)) return category;
  }
  return "Kegiatan";
}

function toTitle(caption: string): string {
  const firstLine =
    caption
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";
  const cleaned = firstLine.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
  const source = cleaned || caption.replace(/\s+/g, " ").trim();
  if (!source) return "Update Kelas Bermain";
  return source.length > 90 ? `${source.slice(0, 90).trimEnd()}…` : source;
}

function toExcerpt(caption: string): string {
  const text = caption.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
  return text.length > 180 ? `${text.slice(0, 180).trimEnd()}…` : text;
}

function toSlug(caption: string, shortcode: string): string {
  const base = toTitle(caption)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 8)
    .join("-");
  const suffix = shortcode.slice(-6).toLowerCase();
  return base ? `${base}-${suffix}` : `post-${suffix}`;
}

/* ------------------------------------------------------------------ */

export async function syncInstagramPosts(): Promise<SyncReport> {
  const empty: SyncReport = {
    ok: false,
    scanned: 0,
    saved: 0,
    skipped: 0,
    uploaded: 0,
    reused: 0,
    titles: [],
  };

  const username = process.env.INSTAGRAM_USERNAME?.replace(/^@/, "") || "kelasbermain.id";
  const limit = Number(process.env.INSTAGRAM_LIMIT || 12);
  // Hajid melewati video karena situsnya situs berita. Kelas Bermain banyak
  // memakai reel, dan thumbnail reel tetap gambar yang layak, jadi di sini
  // video ikut secara bawaan.
  const skipVideo = process.env.INSTAGRAM_SKIP_VIDEO === "true";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.SUPABASE_ADMIN_EMAIL;
  const password = process.env.SUPABASE_ADMIN_PASSWORD;

  if (!url || !anonKey) return { ...empty, error: "Konfigurasi Supabase belum lengkap." };
  if (!email || !password) {
    return { ...empty, error: "SUPABASE_ADMIN_EMAIL / SUPABASE_ADMIN_PASSWORD belum diatur." };
  }

  const result = await fetchApifyPosts(username, limit);
  if (!result.ok) return { ...empty, error: result.error };

  const posts = result.posts;
  if (posts.length === 0) {
    // Nol postingan itu kegagalan, bukan keberhasilan yang kosong. Kalau
    // Apify berubah atau akunnya tidak terbaca, yang sudah tersimpan harus
    // tetap utuh.
    return { ...empty, error: "Apify tidak mengembalikan satu postingan pun." };
  }

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) return { ...empty, error: `Login admin gagal: ${authError.message}` };

  const report: SyncReport = { ...empty, ok: true, scanned: posts.length };

  try {
    for (const post of posts) {
      const outcome = await savePost(supabase, post, { skipVideo });
      if (outcome === "skipped") report.skipped += 1;
      else {
        report.saved += 1;
        if (outcome.uploaded) report.uploaded += 1;
        else report.reused += 1;
        report.titles.push(outcome.title);
      }
    }
  } finally {
    await supabase.auth.signOut();
  }

  return report;
}

type SaveOutcome = "skipped" | { uploaded: boolean; title: string };

async function savePost(
  supabase: SupabaseClient,
  post: ApifyPost,
  options: { skipVideo: boolean },
): Promise<SaveOutcome> {
  const shortcode = post.shortCode?.trim();
  const caption = (post.caption ?? "").trim();
  const image = post.displayUrl;

  // Tanpa salah satu dari ini, kartunya tidak punya isi yang layak tampil.
  if (!shortcode || !caption || !image) return "skipped";
  if (options.skipVideo && post.type && post.type !== "Image") return "skipped";

  const path = `instagram/${shortcode}.jpg`;
  const { data: stored } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // Postingan lama tidak berubah gambarnya; mengunduh ulang tiap malam itu
  // kuota yang terbuang.
  const head = await fetch(stored.publicUrl, { method: "HEAD" }).catch(() => null);
  let uploaded = false;

  if (!head?.ok) {
    const response = await fetch(image).catch(() => null);
    if (!response?.ok) return "skipped";

    const bytes = new Uint8Array(await response.arrayBuffer());
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
    if (error) return "skipped";
    uploaded = true;
  }

  const publishedAt = (post.timestamp ?? new Date().toISOString()).slice(0, 10);
  const content = {
    slug: toSlug(caption, shortcode),
    title: toTitle(caption),
    excerpt: toExcerpt(caption),
    imageUrl: stored.publicUrl,
    postUrl: post.url ?? `https://www.instagram.com/p/${shortcode}/`,
    publishedAt,
    category: detectCategory(caption),
  };

  // `published` sengaja tidak disentuh di sini. Baris baru lahir sebagai
  // draf; baris yang sudah diterbitkan admin tetap tayang dengan isi yang
  // mereka setujui, dan perubahan caption di Instagram menunggu persetujuan
  // berikutnya.
  const { error } = await supabase.from("cms_collections").upsert(
    {
      collection_key: COLLECTION,
      item_key: `ig-${shortcode}`,
      draft: content,
      // Terbaru di atas: tanggal dibalik supaya urutannya stabil.
      sort_order: -Number(publishedAt.replace(/-/g, "")),
      is_visible: true,
    },
    { onConflict: "collection_key,item_key", ignoreDuplicates: false },
  );

  if (error) return "skipped";
  return { uploaded, title: content.title };
}
