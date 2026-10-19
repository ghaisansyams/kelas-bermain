/**
 * Menurunkan berkas Supabase Storage ke disk.
 *
 * Baris database sudah pindah lewat migrate-data.mjs, tapi berkasnya tidak
 * ikut di sana. Selama ini belum dijalankan, foto CMS dan bukti pembayaran
 * hanya ada di Supabase — dan dashboard menulis "No backups".
 *
 *   npm run migrate:storage -- --dry   daftar saja
 *   npm run migrate:storage            unduh
 *
 * Tujuannya public/uploads/<bucket>/<path>, mengikuti bentuk yang nanti
 * dilayani nginx di VPS. Berkas yang sudah ada dan ukurannya sama dilewati,
 * jadi skrip ini aman dijalankan berulang.
 *
 * Hanya MEMBACA dari Supabase.
 */

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync, existsSync, statSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const DRY = process.argv.includes("--dry");
const ROOT = "public/uploads";

/** Bucket privat butuh login admin; yang publik cukup anon. */
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
    return line ? line.split("=", 2)[1].trim().replace(/^"|"$/g, "") : "";
  } catch {
    return "";
  }
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const anon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!url || !anon) throw new Error("Konfigurasi Supabase belum lengkap di .env.local");

const supabase = createClient(url, anon, { auth: { persistSession: false } });

// Bucket bukti pembayaran tertutup untuk publik — itu memang disengaja, dan
// untuk membacanya skrip ini harus login sebagai admin seperti manusia.
const email = env("SUPABASE_ADMIN_EMAIL");
const password = env("SUPABASE_ADMIN_PASSWORD");
let signedIn = false;
if (email && password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  signedIn = !error;
  if (error) console.warn(`Login admin gagal (${error.message}) — bucket privat dilewati.`);
}

let files = 0;
let bytes = 0;
let skipped = 0;
const missed = [];

for (const bucket of BUCKETS) {
  if (bucket.private && !signedIn) {
    missed.push(`${bucket.name} (butuh SUPABASE_ADMIN_EMAIL / PASSWORD)`);
    continue;
  }

  const found = [];
  async function walk(prefix) {
    const { data, error } = await supabase.storage.from(bucket.name).list(prefix, { limit: 1000 });
    if (error) {
      missed.push(`${bucket.name}/${prefix}: ${error.message}`);
      return;
    }
    for (const entry of data ?? []) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folder datang tanpa id; berkas selalu punya.
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

    const { data, error } = await supabase.storage.from(bucket.name).download(file.path);
    if (error || !data) {
      missed.push(`${bucket.name}/${file.path}: ${error?.message ?? "kosong"}`);
      continue;
    }

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(await data.arrayBuffer()));
    files += 1;
    bytes += file.size;
    console.log(`  ${file.path} (${(file.size / 1024).toFixed(0)} KB)`);
  }
}

if (signedIn) await supabase.auth.signOut();

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
