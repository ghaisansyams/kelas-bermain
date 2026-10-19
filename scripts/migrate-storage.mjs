/**
 * Menurunkan berkas Supabase Storage ke disk. ALAT PINDAHAN, bukan bagian aplikasi.
 *
 * Baris database pindah lewat migrate-data.mjs, tapi berkasnya tidak ikut di
 * sana: foto CMS dan bukti pembayaran tinggal di bucket, bukan tabel.
 *
 *   npm run migrate:storage -- --dry   daftar saja
 *   npm run migrate:storage            unduh
 *
 * Hanya MEMBACA dari Supabase. Memakai fetch ke REST API Storage, bukan paket
 * @supabase/supabase-js, supaya aplikasi tidak menyimpan satu pun paket
 * Supabase hanya demi skrip yang dijalankan sekali. Skrip ini boleh dihapus
 * bersama rewrite-media-urls.mjs dan migrate-data.mjs setelah Supabase
 * dikosongkan.
 *
 * Tujuan: UPLOAD_DIR/<bucket>/<path> (bawaan public/uploads), akar yang sama
 * dengan yang dibaca aplikasi. Berkas yang sudah ada dengan ukuran sama
 * dilewati, jadi aman dijalankan ulang sebelum pindah — admin di situs lama
 * masih bisa mengunggah sampai hari pindahan.
 *
 * Bucket bukti-pembayaran privat; membacanya butuh login admin
 * (SUPABASE_ADMIN_EMAIL / SUPABASE_ADMIN_PASSWORD di .env.local). Tanpa itu
 * bucket tersebut dilaporkan sebagai tidak terambil, bukan dilewati diam-diam.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const DRY = process.argv.includes("--dry");
const ROOT = process.env.UPLOAD_DIR || "public/uploads";

const BUCKETS = [
  { name: "website", private: false },
  { name: "bukti-pembayaran", private: true },
];

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync(".env.local", "utf8")
      .split("\n")
      .find((l) => l.startsWith(name + "="));
    return line ? line.split("=").slice(1).join("=").trim().replace(/^"|"$/g, "") : "";
  } catch {
    return "";
  }
}

const url = env("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
const anon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!url || !anon) throw new Error("NEXT_PUBLIC_SUPABASE_URL / ANON_KEY belum ada di .env.local");

/** Masuk sebagai admin lewat REST Auth; mengembalikan token atau null. */
async function signIn() {
  const email = env("SUPABASE_ADMIN_EMAIL");
  const password = env("SUPABASE_ADMIN_PASSWORD");
  if (!email || !password) return null;

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    console.warn(`Login admin gagal (HTTP ${response.status}) — bucket privat dilewati.`);
    return null;
  }
  return (await response.json()).access_token ?? null;
}

const token = await signIn();
const headers = { apikey: anon, Authorization: `Bearer ${token ?? anon}` };

/** Daftar berkas di satu folder; folder datang tanpa id. */
async function list(bucket, prefix) {
  const response = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

let files = 0;
let bytes = 0;
let skipped = 0;
const missed = [];

for (const bucket of BUCKETS) {
  if (bucket.private && !token) {
    missed.push(`${bucket.name} (butuh SUPABASE_ADMIN_EMAIL / PASSWORD)`);
    continue;
  }

  const found = [];
  async function walk(prefix) {
    let entries;
    try {
      entries = await list(bucket.name, prefix);
    } catch (error) {
      missed.push(`${bucket.name}/${prefix}: ${error.message}`);
      return;
    }
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) await walk(path);
      else found.push({ path, size: entry.metadata?.size ?? 0 });
    }
  }
  await walk("");

  console.log(`\nbucket ${bucket.name}: ${found.length} berkas`);

  for (const file of found) {
    const target = join(ROOT, bucket.name, file.path);

    if (!DRY && existsSync(target) && statSync(target).size === file.size) {
      skipped += 1;
      continue;
    }

    if (DRY) {
      console.log(`  ${file.path} (${(file.size / 1024).toFixed(0)} KB)`);
      files += 1;
      bytes += file.size;
      continue;
    }

    const route = bucket.private ? "authenticated" : "public";
    const response = await fetch(`${url}/storage/v1/object/${route}/${bucket.name}/${file.path}`, {
      headers,
    });
    if (!response.ok) {
      missed.push(`${bucket.name}/${file.path}: HTTP ${response.status}`);
      continue;
    }

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    files += 1;
    bytes += file.size;
    console.log(`  ${file.path} (${(file.size / 1024).toFixed(0)} KB)`);
  }
}

console.log("");
console.log(DRY ? "MODE UJI — tidak ada yang diunduh" : `${files} berkas tersimpan di ${ROOT}/`);
console.log(`  ${(bytes / 1024 / 1024).toFixed(2)} MB${skipped ? `, ${skipped} dilewati (sudah ada)` : ""}`);

if (missed.length > 0) {
  console.error("\nTIDAK TERAMBIL:");
  for (const m of missed) console.error(`  ${m}`);
  console.error("\nJangan kosongkan Supabase sebelum daftar ini kosong.");
  process.exit(1);
}

console.log("\nSemua berkas sudah ada salinannya di disk.");
