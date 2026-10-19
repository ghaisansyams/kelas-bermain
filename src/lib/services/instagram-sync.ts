import "server-only";

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
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
 *    Salinannya mendarat di public/uploads/website/instagram/, bentuk yang
 *    sama dengan hasil migrate:storage, dilayani sebagai /uploads/...
 *
 * Menulis lewat Prisma ke database yang sama dengan yang dibaca situs.
 * Tidak ada lagi login Supabase di sini.
 */

const COLLECTION = "updates";
const UPLOAD_ROOT = process.env.UPLOAD_DIR || "public/uploads";
const IMAGE_PATH = "website/instagram";

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
  // Kelas Bermain banyak memakai reel, dan thumbnail reel tetap gambar yang
  // layak, jadi video ikut secara bawaan.
  const skipVideo = process.env.INSTAGRAM_SKIP_VIDEO === "true";

  const result = await fetchApifyPosts(username, limit);
  if (!result.ok) return { ...empty, error: result.error };

  const posts = result.posts;
  if (posts.length === 0) {
    // Nol postingan itu kegagalan, bukan keberhasilan yang kosong. Kalau
    // Apify berubah atau akunnya tidak terbaca, yang sudah tersimpan harus
    // tetap utuh.
    return { ...empty, error: "Apify tidak mengembalikan satu postingan pun." };
  }

  const report: SyncReport = { ...empty, ok: true, scanned: posts.length };

  for (const post of posts) {
    const outcome = await savePost(post, { skipVideo });
    if (outcome === "skipped") report.skipped += 1;
    else {
      report.saved += 1;
      if (outcome.uploaded) report.uploaded += 1;
      else report.reused += 1;
      report.titles.push(outcome.title);
    }
  }

  return report;
}

type SaveOutcome = "skipped" | { uploaded: boolean; title: string };

async function savePost(
  post: ApifyPost,
  options: { skipVideo: boolean },
): Promise<SaveOutcome> {
  const shortcode = post.shortCode?.trim();
  const caption = (post.caption ?? "").trim();
  const image = post.displayUrl;

  // Tanpa salah satu dari ini, kartunya tidak punya isi yang layak tampil.
  // Shortcode juga dipakai sebagai nama berkas, jadi hanya huruf, angka,
  // garis bawah, dan strip yang lolos.
  if (!shortcode || !/^[\w-]+$/.test(shortcode) || !caption || !image) return "skipped";
  if (options.skipVideo && post.type && post.type !== "Image") return "skipped";

  const relative = `${IMAGE_PATH}/${shortcode}.jpg`;
  const filePath = join(UPLOAD_ROOT, relative);
  let uploaded = false;

  // Postingan lama tidak berubah gambarnya; mengunduh ulang tiap malam itu
  // kuota yang terbuang.
  if (!existsSync(filePath)) {
    const response = await fetch(image).catch(() => null);
    if (!response?.ok) return "skipped";

    try {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
    } catch {
      return "skipped";
    }
    uploaded = true;
  }

  const publishedAt = (post.timestamp ?? new Date().toISOString()).slice(0, 10);
  const content = {
    slug: toSlug(caption, shortcode),
    title: toTitle(caption),
    excerpt: toExcerpt(caption),
    caption,
    imageUrl: `/uploads/${relative}`,
    postUrl: post.url ?? `https://www.instagram.com/p/${shortcode}/`,
    publishedAt,
    category: detectCategory(caption),
  };

  // `published` sengaja tidak disentuh di `update`. Baris baru lahir sebagai
  // draf; baris yang sudah diterbitkan admin tetap tayang dengan isi yang
  // mereka setujui, dan perubahan caption di Instagram menunggu persetujuan
  // berikutnya.
  // Terbaru di atas: tanggal dibalik supaya urutannya stabil.
  const sortOrder = -Number(publishedAt.replace(/-/g, ""));
  try {
    await db.cms_collections.upsert({
      where: {
        collection_key_item_key: { collection_key: COLLECTION, item_key: `ig-${shortcode}` },
      },
      create: {
        collection_key: COLLECTION,
        item_key: `ig-${shortcode}`,
        draft: content as Prisma.InputJsonValue,
        sort_order: sortOrder,
        is_visible: true,
      },
      // is_visible tidak disentuh: kalau admin menyembunyikan kartunya,
      // sync berikutnya tidak boleh menampilkannya lagi.
      update: {
        draft: content as Prisma.InputJsonValue,
        sort_order: sortOrder,
        updated_at: new Date(),
      },
    });
  } catch {
    return "skipped";
  }

  return { uploaded, title: content.title };
}
