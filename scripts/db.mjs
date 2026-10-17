/**
 * Postgres lokal untuk Kelas Bermain.
 *
 * Mesin ini tidak punya Homebrew maupun Docker, dan macOS 12 di MacBook Air
 * 2015 bukan tempat yang ramah untuk memasang keduanya. Jadi Postgres-nya
 * datang lewat npm: binary asli, server sungguhan, tanpa perlu memasang
 * apa pun di luar proyek ini.
 *
 * Datanya tinggal di .postgres-data/ dan tidak ikut git.
 *
 *   npm run db:start     jalankan (biarkan terbuka di satu tab terminal)
 *   npm run db:stop      hentikan
 *   npm run db:reset     hapus total lalu buat ulang dari nol
 *
 * Encoding dipaksa UTF8. Bawaan initdb di mesin ini SQL_ASCII, dan caption
 * Instagram penuh emoji — dengan SQL_ASCII teksnya tersimpan rusak dan baru
 * ketahuan berbulan-bulan kemudian.
 */

import { existsSync, rmSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

const DATA_DIR = "./.postgres-data";
const PORT = Number(process.env.PGPORT || 54329);
const USER = "kelasbermain";
const PASSWORD = "kelasbermain";
const DATABASE = "kelasbermain";

const command = process.argv[2] ?? "start";

function create() {
  return new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--lc-collate=C", "--lc-ctype=C"],
  });
}

const url = `postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}`;

if (command === "reset") {
  if (existsSync(DATA_DIR)) {
    rmSync(DATA_DIR, { recursive: true, force: true });
    console.log("Data lama dihapus.");
  }
}

if (command === "stop") {
  const pg = create();
  await pg.stop().catch(() => {});
  console.log("Postgres dihentikan.");
  process.exit(0);
}

const pg = create();

if (!existsSync(DATA_DIR)) {
  console.log("Menyiapkan cluster baru (sekali saja, agak lama)…");
  await pg.initialise();
}

await pg.start();

// createDatabase melempar kalau sudah ada — itu kondisi normal pada start
// kedua dan seterusnya, bukan kegagalan.
await pg.createDatabase(DATABASE).catch(() => {});

const client = pg.getPgClient();
await client.connect();
const { rows } = await client.query("show server_encoding");
await client.end();

console.log(`\nPostgres siap.`);
console.log(`  versi encoding : ${rows[0].server_encoding}`);
console.log(`  DATABASE_URL   : ${url}`);
console.log(`\nSalin baris DATABASE_URL di atas ke .env.local.`);
console.log(`Biarkan tab ini terbuka. Ctrl+C untuk berhenti.\n`);

// Berhenti rapi supaya Ctrl+C tidak meninggalkan cluster dalam keadaan
// setengah mati yang harus di-repair saat start berikutnya.
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    if (stopping) return;
    stopping = true;
    console.log("\nMenghentikan Postgres…");
    await pg.stop().catch(() => {});
    process.exit(0);
  });
}

// Tahan prosesnya tetap hidup.
await new Promise(() => {});
