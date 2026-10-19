/**
 * Mengganti alamat gambar Supabase Storage di isi CMS menjadi /uploads/...
 *
 * Berkasnya sudah diunduh (npm run migrate:storage), tapi isi CMS masih
 * menyimpan alamat lamanya:
 *   https://<ref>.supabase.co/storage/v1/object/public/website/<path>
 * Begitu Supabase dikosongkan, setiap alamat itu jadi gambar rusak. Skrip ini
 * menggantinya dengan /uploads/website/<path>, yang dilayani aplikasi sendiri.
 *
 *   npm run migrate:media-urls -- --dry     hitung dan periksa saja
 *   npm run migrate:media-urls              tulis
 *
 * Pengaman, karena ini mengubah isi CMS yang sedang dipakai:
 *   1. Tidak menulis apa pun kalau ada berkas yang dirujuk, MASIH hidup di
 *      Supabase, tapi belum ada di disk. Itu berarti unduhannya gagal, dan
 *      menulis ulang alamatnya mengubah gambar yang masih bisa dibuka menjadi
 *      gambar rusak. Berkas yang hilang di kedua tempat sudah rusak sebelum
 *      migrasi ini; itu dilaporkan, tapi tidak menghalangi.
 *   2. Baris yang akan diubah dicadangkan ke backups/ lebih dulu.
 *   3. Semuanya satu transaksi: seluruhnya berubah atau tidak sama sekali.
 *   4. Sesudahnya dihitung lagi; skrip gagal kalau masih ada alamat Supabase.
 *
 * Bisa dibalik: cadangannya memuat nilai asli tiap kolom.
 * activity_logs sengaja tidak disentuh — itu catatan sejarah, bukan konten.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const DRY = process.argv.includes("--dry");
const UPLOAD_DIR = process.env.UPLOAD_DIR || "public/uploads";
const SKIP = new Set(["activity_logs", "_prisma_migrations"]);

// Pola alamat penyimpanan publik Supabase untuk bucket "website".
const PATTERN = /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/website\/([A-Za-z0-9._/-]+)/g;
const REPLACE_PREFIX = /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/website\//g;

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  for (const file of [".env", ".env.local"]) {
    try {
      const line = readFileSync(file, "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
      if (line) return line.split("=").slice(1).join("=").trim().replace(/^"|"$/g, "");
    } catch {
      /* berkas tidak ada */
    }
  }
  return "";
}

const client = new pg.Client({ connectionString: readEnv("DATABASE_URL") });
await client.connect();

try {
  const columns = (
    await client.query(`
      select table_name t, column_name c, data_type d from information_schema.columns
       where table_schema = 'public'
         and data_type in ('jsonb','json','text','character varying')
       order by 1, 2`)
  ).rows.filter((row) => !SKIP.has(row.t));

  const cast = (row) => (row.d.startsWith("json") ? `"${row.c}"::text` : `"${row.c}"`);

  // 1. Cari baris yang menunjuk Supabase.
  const targets = [];
  for (const row of columns) {
    const found = (
      await client.query(
        `select ctid::text as tid, ${cast(row)} as body from "${row.t}" where ${cast(row)} like '%supabase.co/storage%'`,
      )
    ).rows;
    if (found.length) targets.push({ ...row, rows: found });
  }

  // path -> alamat Supabase aslinya, untuk menguji apakah masih hidup di sana.
  const paths = new Map();
  let total = 0;
  for (const target of targets) {
    total += target.rows.length;
    for (const row of target.rows) {
      for (const match of row.body.matchAll(PATTERN)) {
        if (!paths.has(match[1])) paths.set(match[1], match[0]);
      }
    }
  }

  console.log(`${total} baris di ${targets.length} kolom menunjuk Supabase:`);
  for (const target of targets) console.log(`  ${target.t}.${target.c}: ${target.rows.length}`);
  console.log(`\n${paths.size} berkas berbeda dirujuk.`);

  // 2. Berkas yang hilang di disk: masih hidup di Supabase, atau sudah mati?
  const absent = [...paths.keys()].filter((path) => !existsSync(join(UPLOAD_DIR, "website", path)));
  const failedDownloads = [];
  const alreadyDead = [];

  for (const path of absent) {
    const probe = await fetch(paths.get(path), { method: "HEAD" }).catch(() => null);
    // Hanya HTTP 200 yang berarti berkasnya masih ada. Gagal terhubung
    // diperlakukan sama: lebih baik berhenti daripada menebak.
    if (!probe || probe.ok) failedDownloads.push(path);
    else alreadyDead.push({ path, status: probe.status });
  }

  if (failedDownloads.length) {
    console.error(`\nBERKAS MASIH HIDUP DI SUPABASE tapi belum ada di ${UPLOAD_DIR}/website/ — tidak ada yang ditulis:`);
    for (const path of failedDownloads) console.error(`  ${path}`);
    console.error("\nJalankan `npm run migrate:storage` dulu, lalu ulangi.");
    process.exit(1);
  }

  console.log(`${paths.size - absent.length} berkas ada di ${UPLOAD_DIR}/website/.`);
  if (alreadyDead.length) {
    console.log(`\n${alreadyDead.length} rujukan sudah rusak SEBELUM migrasi (di Supabase pun tidak ada):`);
    for (const { path, status } of alreadyDead) console.log(`  ${path}  (HTTP ${status})`);
    console.log("Tetap ditulis ulang; tidak ada yang hilang karena memang sudah tidak ada.");
  }

  if (DRY) {
    console.log("\nMODE UJI — tidak ada yang ditulis.");
    process.exit(0);
  }

  if (total === 0) {
    console.log("\nTidak ada yang perlu diganti.");
    process.exit(0);
  }

  // 3. Cadangan nilai asli.
  mkdirSync("backups", { recursive: true });
  const backupPath = join("backups", `media-urls-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(
    backupPath,
    JSON.stringify(
      targets.map((t) => ({ table: t.t, column: t.c, type: t.d, rows: t.rows })),
      null,
      2,
    ),
  );
  console.log(`\nCadangan: ${backupPath}`);

  // 4. Tulis dalam satu transaksi.
  await client.query("begin");
  try {
    for (const target of targets) {
      const isJson = target.d.startsWith("json");
      const column = `"${target.c}"`;
      const replaced = `regexp_replace(${isJson ? `${column}::text` : column}, $1, $2, 'g')`;
      await client.query(
        `update "${target.t}" set ${column} = ${replaced}${isJson ? `::${target.d}` : ""}
          where ${isJson ? `${column}::text` : column} like '%supabase.co/storage%'`,
        [REPLACE_PREFIX.source, "/uploads/website/"],
      );
    }

    // 5. Hitung ulang sebelum mengesahkan.
    let remaining = 0;
    for (const target of targets) {
      const isJson = target.d.startsWith("json");
      const col = isJson ? `"${target.c}"::text` : `"${target.c}"`;
      remaining += (
        await client.query(
          `select count(*)::int n from "${target.t}" where ${col} like '%supabase.co/storage%'`,
        )
      ).rows[0].n;
    }
    if (remaining > 0) throw new Error(`${remaining} baris masih menunjuk Supabase`);

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    console.error(`\nDIBATALKAN, tidak ada yang berubah: ${error.message}`);
    process.exit(1);
  }

  console.log(`\n${total} baris diperbarui. Tidak ada lagi alamat Supabase Storage di isi CMS.`);
} finally {
  await client.end();
}
