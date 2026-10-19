/**
 * Menarik postingan Instagram @kelasbermain.id ke halaman Update.
 *
 * Kenapa browser, bukan HTTP biasa: Instagram menolak permintaan HTTP polos
 * dari skrip (401 "require_login"), tapi tetap melayani halaman profil ke
 * browser sungguhan tanpa login. Jadi skrip ini menjalankan Firefox headless
 * — Firefox, bukan Chromium, karena macOS di mesin ini terlalu tua untuk
 * build Chrome yang sekarang.
 *
 * Kenapa harus dijalankan dari laptop, bukan dari server: Instagram memblokir
 * permintaan dari IP datacenter, dan menjalankan browser di produksi bukan
 * ide yang sehat. Jadi alurnya: skrip ini menulis langsung ke Postgres, lalu
 * situs membacanya dari sana. Tidak perlu deploy ulang — halaman Update
 * menyegarkan dirinya tiap jam.
 *
 * Kenapa gambarnya diunduh ulang: URL CDN Instagram ditandatangani dan mati
 * dalam hitungan minggu. Kalau yang disimpan URL-nya, halaman Update akan
 * penuh gambar rusak bulan depan. Jadi gambarnya dipindahkan ke UPLOAD_DIR
 * (bawaan public/uploads) dan yang disimpan alamat /uploads/... milik sendiri.
 *
 * Postingan masuk sebagai DRAF, sama seperti jalur Apify produksi
 * (lib/services/instagram-sync.ts) — admin menekan Terbitkan di CMS sebelum
 * tampil ke publik. Skrip ini cadangan gratis kalau kuota Apify habis; kalau
 * Apify masih berjalan, biarkan cron yang bekerja dan jangan jalankan ini.
 *
 * Pemakaian:
 *   npm run instagram:scrape -- --dry    # lihat hasilnya, tidak menulis
 *   npm run instagram:scrape             # tulis ke Postgres
 *
 * Butuh DATABASE_URL di .env (dibaca Prisma CLI dan skrip migrasi lain).
 *
 * Catatan: ini mengambil konten dari akun Instagram milik sendiri. Instagram
 * tidak mengizinkan pengambilan data otomatis di ketentuan layanannya, dan
 * tata letak halamannya bisa berubah sewaktu-waktu. Kalau suatu hari skrip
 * ini berhenti menemukan postingan, dia berhenti dengan error dan TIDAK
 * menghapus apa pun yang sudah ada.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import puppeteer from "puppeteer-core";
import pg from "pg";

const USERNAME = process.env.INSTAGRAM_USERNAME?.replace(/^@/, "") || "kelasbermain.id";
const LIMIT = Number(process.env.INSTAGRAM_LIMIT || 12);
const BUCKET = "website";
const COLLECTION = "updates";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "public/uploads";
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
// Menulis ke Postgres
// ------------------------------------------------------------------

async function publish(posts) {
  const databaseUrl = readEnv("DATABASE_URL");
  if (!databaseUrl) throw new Error("DATABASE_URL belum diisi di .env.");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  let uploaded = 0;
  let reused = 0;

  try {
    for (const post of posts) {
      const relative = `${BUCKET}/instagram/${post.shortcode}.jpg`;
      const filePath = join(UPLOAD_DIR, relative);
      const publicUrl = `/uploads/${relative}`;

      // Hanya unduh sekali. Postingan lama tidak berubah gambarnya, dan
      // mengunduh ulang tiap sinkron itu sia-sia.
      if (existsSync(filePath)) {
        reused += 1;
      } else {
        const response = await fetch(post.imageUrl);
        if (!response.ok) {
          console.warn(`  ! gambar ${post.shortcode} gagal diunduh (HTTP ${response.status}), dilewati`);
          continue;
        }
        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(filePath, Buffer.from(await response.arrayBuffer()));
        uploaded += 1;
      }

      const content = {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        imageUrl: publicUrl,
        postUrl: post.permalink,
        publishedAt: post.publishedAt,
        category: post.category,
      };

      // Draf saja — sama seperti jalur Apify produksi. Admin yang menekan
      // Terbitkan di CMS, supaya satu salah unggah di Instagram tidak
      // langsung jadi halaman di situs tanpa ada yang memeriksa.
      await client.query(
        `insert into cms_collections (collection_key, item_key, draft, sort_order, is_visible)
         values ($1, $2, $3, $4, true)
         on conflict (collection_key, item_key) do update
           set draft = excluded.draft, sort_order = excluded.sort_order`,
        [
          COLLECTION,
          `ig-${post.shortcode}`,
          JSON.stringify(content),
          // Terbaru di atas. Tanggal dibalik supaya urutannya stabil.
          -Number(post.publishedAt.replace(/-/g, "")),
        ],
      );
    }
  } finally {
    await client.end();
  }

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
console.log(`  ${posts.length} postingan disimpan sebagai draf — buka /admin/cms untuk menerbitkannya`);
console.log(`  ${uploaded} gambar baru diunggah, ${reused} dipakai ulang`);
console.log(`\nHalaman Update menyegarkan dirinya tiap jam, jadi tidak perlu deploy ulang.`);
