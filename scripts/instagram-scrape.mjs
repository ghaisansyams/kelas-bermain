/**
 * Menarik postingan Instagram @kelasbermain.id ke halaman Update.
 *
 * Kenapa browser, bukan HTTP biasa: Instagram menolak permintaan HTTP polos
 * dari skrip (401 "require_login"), tapi tetap melayani halaman profil ke
 * browser sungguhan tanpa login. Jadi skrip ini menjalankan Firefox headless
 * — Firefox, bukan Chromium, karena macOS di mesin ini terlalu tua untuk
 * build Chrome yang sekarang.
 *
 * Kenapa harus dijalankan dari laptop, bukan dari Vercel: Instagram memblokir
 * permintaan dari IP datacenter, dan menjalankan browser di serverless bukan
 * ide yang sehat. Jadi alurnya: skrip ini menulis ke Supabase, lalu situs
 * membacanya dari sana. Tidak perlu deploy ulang — halaman Update menyegarkan
 * dirinya tiap jam.
 *
 * Kenapa gambarnya diunduh ulang: URL CDN Instagram ditandatangani dan mati
 * dalam hitungan minggu. Kalau yang disimpan URL-nya, halaman Update akan
 * penuh gambar rusak bulan depan. Jadi gambarnya dipindahkan ke Supabase
 * Storage dan yang disimpan URL milik sendiri.
 *
 * Pemakaian:
 *   npm run instagram:scrape -- --dry    # lihat hasilnya, tidak menulis
 *   npm run instagram:scrape             # tulis ke Supabase
 *
 * Butuh di .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_ADMIN_EMAIL      — akun admin yang biasa dipakai login ke /admin
 *   SUPABASE_ADMIN_PASSWORD
 *
 * Catatan: ini mengambil konten dari akun Instagram milik sendiri. Instagram
 * tidak mengizinkan pengambilan data otomatis di ketentuan layanannya, dan
 * tata letak halamannya bisa berubah sewaktu-waktu. Kalau suatu hari skrip
 * ini berhenti menemukan postingan, dia berhenti dengan error dan TIDAK
 * menghapus apa pun yang sudah ada.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer-core";

const USERNAME = process.env.INSTAGRAM_USERNAME?.replace(/^@/, "") || "kelasbermain.id";
const LIMIT = Number(process.env.INSTAGRAM_LIMIT || 12);
const BUCKET = "website";
const COLLECTION = "updates";
const DRY = process.argv.includes("--dry");

const FIREFOX =
  process.env.FIREFOX_PATH ?? "/Applications/Firefox.app/Contents/MacOS/firefox";

// ------------------------------------------------------------------
// Konfigurasi
// ------------------------------------------------------------------

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  try {
    const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of file.split("\n")) {
      if (line.trim().startsWith("#") || !line.includes("=")) continue;
      const key = line.slice(0, line.indexOf("=")).trim();
      if (key === name) return line.slice(line.indexOf("=") + 1).trim();
    }
  } catch {
    // .env.local belum ada — pesan di bawah yang menjelaskan.
  }
  return "";
}

// ------------------------------------------------------------------
// Mengubah isi postingan jadi isi kartu
// ------------------------------------------------------------------

const CATEGORY_RULES = [
  ["Pengumuman", /\b(pengumuman|info penting|perhatian|mohon|dibuka|ditutup)\b/i],
  ["Event", /\b(event|kelas|workshop|open house|pendaftaran|daftar|kuota)\b/i],
  ["Dokumentasi", /\b(dokumentasi|keseruan|momen|recap|galeri|terima kasih)\b/i],
];

function detectCategory(caption) {
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(caption)) return category;
  }
  return "Kegiatan";
}

/** Baris pertama caption yang berisi kata, dipotong sepanjang judul. */
function toTitle(caption) {
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

function toExcerpt(caption) {
  const text = caption.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
  return text.length > 180 ? `${text.slice(0, 180).trimEnd()}…` : text;
}

function toSlug(caption, shortcode) {
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
  return base ? `${base}-${shortcode.slice(-6).toLowerCase()}` : `post-${shortcode.toLowerCase()}`;
}

/** "October 05, 2026" -> "2026-10-05". */
const MONTHS = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

function parseDate(text) {
  const match = /\b([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/.exec(text ?? "");
  if (!match) return null;
  const month = MONTHS[match[1].toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${month}-${match[2].padStart(2, "0")}`;
}

// ------------------------------------------------------------------
// Scrape
// ------------------------------------------------------------------

async function scrape() {
  const browser = await puppeteer.launch({
    browser: "firefox",
    executablePath: FIREFOX,
    protocol: "webDriverBiDi",
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1600 });

    console.log(`Membuka profil @${USERNAME}…`);
    await page.goto(`https://www.instagram.com/${USERNAME}/`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await new Promise((resolve) => setTimeout(resolve, 4000));

    const tiles = await page.evaluate(() => {
      const seen = new Set();
      const out = [];
      for (const anchor of document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')) {
        const href = anchor.getAttribute("href") ?? "";
        const match = /\/(?:p|reel)\/([^/]+)\//.exec(href);
        if (!match || seen.has(match[1])) continue;
        seen.add(match[1]);
        const img = anchor.querySelector("img");
        out.push({
          shortcode: match[1],
          permalink: `https://www.instagram.com${href}`,
          alt: img?.getAttribute("alt") ?? "",
          thumbnail: img?.getAttribute("src") ?? "",
          isReel: href.includes("/reel/"),
        });
      }
      return out;
    });

    if (tiles.length === 0) {
      throw new Error(
        "Tidak ada postingan yang ditemukan. Instagram kemungkinan mengubah tata letak " +
          "halamannya, atau sedang meminta login. Tidak ada yang ditulis ke database.",
      );
    }

    console.log(`Menemukan ${tiles.length} postingan, mengambil ${Math.min(tiles.length, LIMIT)} terbaru.`);

    const posts = [];
    for (const tile of tiles.slice(0, LIMIT)) {
      await page.goto(tile.permalink, { waitUntil: "networkidle0", timeout: 60000 });
      await new Promise((resolve) => setTimeout(resolve, 1800));

      const detail = await page.evaluate(() => {
        const meta = (property) =>
          document.querySelector(`meta[property="${property}"]`)?.getAttribute("content") ?? "";
        return {
          ogTitle: meta("og:title"),
          ogImage: meta("og:image"),
          ogDescription: meta("og:description"),
          datetime: document.querySelector("time[datetime]")?.getAttribute("datetime") ?? "",
        };
      });

      // og:title berbentuk: Nama on Instagram: "caption…"
      const quoted = /on Instagram:\s*"([\s\S]*)"\s*$/.exec(detail.ogTitle);
      const caption = (quoted?.[1] ?? "").trim();

      const publishedAt =
        (detail.datetime ? detail.datetime.slice(0, 10) : null) ??
        parseDate(tile.alt) ??
        parseDate(detail.ogDescription) ??
        new Date().toISOString().slice(0, 10);

      posts.push({
        shortcode: tile.shortcode,
        permalink: tile.permalink,
        caption,
        title: toTitle(caption),
        excerpt: toExcerpt(caption),
        slug: toSlug(caption, tile.shortcode),
        category: detectCategory(caption),
        publishedAt,
        imageUrl: detail.ogImage || tile.thumbnail,
        isReel: tile.isReel,
      });

      console.log(`  · ${publishedAt}  ${toTitle(caption).slice(0, 60)}`);
    }

    return posts;
  } finally {
    await browser.close();
  }
}

// ------------------------------------------------------------------
// Menulis ke Supabase
// ------------------------------------------------------------------

async function publish(posts) {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const email = readEnv("SUPABASE_ADMIN_EMAIL");
  const password = readEnv("SUPABASE_ADMIN_PASSWORD");

  if (!url || !anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL / ANON_KEY belum diisi di .env.local.");
  if (!email || !password) {
    throw new Error(
      "SUPABASE_ADMIN_EMAIL dan SUPABASE_ADMIN_PASSWORD belum diisi di .env.local.\n" +
        "Pakai akun admin yang sama dengan yang dipakai login ke /admin.",
    );
  }

  // Login sebagai admin biasa, bukan service role. Skrip ini hanya boleh
  // melakukan apa yang admin boleh lakukan lewat antarmuka.
  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw new Error(`Gagal login sebagai admin: ${authError.message}`);

  let uploaded = 0;
  let reused = 0;

  for (const post of posts) {
    const path = `instagram/${post.shortcode}.jpg`;
    const { data: existing } = supabase.storage.from(BUCKET).getPublicUrl(path);

    // Hanya unduh sekali. Postingan lama tidak berubah gambarnya, dan
    // mengunduh ulang tiap sinkron itu sia-sia.
    const head = await fetch(existing.publicUrl, { method: "HEAD" }).catch(() => null);
    if (head?.ok) {
      reused += 1;
    } else {
      const response = await fetch(post.imageUrl);
      if (!response.ok) {
        console.warn(`  ! gambar ${post.shortcode} gagal diunduh (HTTP ${response.status}), dilewati`);
        continue;
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
      if (error) {
        console.warn(`  ! gambar ${post.shortcode} gagal diunggah: ${error.message}`);
        continue;
      }
      uploaded += 1;
    }

    const content = {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      imageUrl: existing.publicUrl,
      postUrl: post.permalink,
      publishedAt: post.publishedAt,
      category: post.category,
    };

    const { error } = await supabase
      .from("cms_collections")
      .upsert(
        {
          collection_key: COLLECTION,
          item_key: `ig-${post.shortcode}`,
          draft: content,
          published: content,
          published_at: new Date().toISOString(),
          // Terbaru di atas. Tanggal dibalik supaya urutannya stabil.
          sort_order: -Number(post.publishedAt.replace(/-/g, "")),
          is_visible: true,
        },
        { onConflict: "collection_key,item_key" },
      );

    if (error) throw new Error(`Gagal menyimpan ${post.shortcode}: ${error.message}`);
  }

  await supabase.auth.signOut();
  return { uploaded, reused };
}

// ------------------------------------------------------------------

const posts = await scrape();

if (DRY) {
  console.log(`\n--- MODE UJI, tidak ada yang ditulis ---\n`);
  console.log(JSON.stringify(posts, null, 2));
  console.log(`\n${posts.length} postingan siap disimpan.`);
  process.exit(0);
}

const { uploaded, reused } = await publish(posts);

console.log(`\nSelesai.`);
console.log(`  ${posts.length} postingan disimpan ke halaman Update`);
console.log(`  ${uploaded} gambar baru diunggah, ${reused} dipakai ulang`);
console.log(`\nHalaman Update menyegarkan dirinya tiap jam, jadi tidak perlu deploy ulang.`);
