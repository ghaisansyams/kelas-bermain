/**
 * Memperpanjang token Instagram.
 *
 * Token Instagram berlaku 60 hari dan TIDAK diperpanjang otomatis. Kalau
 * lewat, halaman Update diam-diam kembali ke konten contoh. Jalankan skrip
 * ini sebulan sekali:
 *
 *   npm run instagram:refresh
 *
 * Skrip ini hanya membaca token dari .env.local, menukarnya dengan yang
 * baru, lalu mencetaknya. Tidak ada yang ditulis otomatis ke mana pun —
 * token barunya kamu tempel sendiri ke Vercel dan .env.local, supaya tidak
 * ada rahasia yang berpindah tanpa kamu lihat.
 */

import { readFileSync } from "node:fs";

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
    // .env.local tidak ada — biarkan, pesan di bawah yang menjelaskan.
  }
  return "";
}

const token = readEnv("INSTAGRAM_ACCESS_TOKEN");

if (!token) {
  console.error("INSTAGRAM_ACCESS_TOKEN tidak ditemukan di .env.local.");
  console.error("Isi dulu tokennya, baru jalankan skrip ini lagi.");
  process.exit(1);
}

const url =
  "https://graph.instagram.com/refresh_access_token" +
  `?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;

const res = await fetch(url);
const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error(`Gagal (HTTP ${res.status}).`);
  console.error(JSON.stringify(body, null, 2));
  console.error("\nKalau pesannya soal token kedaluwarsa, token lama sudah tidak bisa");
  console.error("diperpanjang. Buat token baru lewat Meta for Developers.");
  process.exit(1);
}

const days = Math.round((body.expires_in ?? 0) / 86400);

console.log("Token baru berhasil dibuat.\n");
console.log(body.access_token);
console.log(`\nBerlaku ${days} hari lagi.\n`);
console.log("Langkah berikutnya:");
console.log("  1. Ganti INSTAGRAM_ACCESS_TOKEN di .env.local dengan token di atas");
console.log("  2. Ganti juga di Vercel:");
console.log("     npx vercel env rm INSTAGRAM_ACCESS_TOKEN production");
console.log("     npx vercel env add INSTAGRAM_ACCESS_TOKEN production");
console.log("  3. Deploy ulang: npx vercel --prod");
