/**
 * Menyalin data Supabase ke Postgres sendiri.
 *
 * Hanya MEMBACA dari Supabase. Tidak ada satu pun perintah tulis ke sana —
 * produksi tetap melayani orang selama ini berjalan.
 *
 *   npm run migrate:data -- --dry    hitung saja, tidak menulis
 *   npm run migrate:data             salin
 *
 * Tiga hal yang membuat skrip ini bisa dipercaya:
 *
 * 1. Foreign key dimatikan sementara (session_replication_role = replica),
 *    jadi urutan tabel tidak perlu ditebak-tebak. Urutan yang salah akan
 *    menolak baris yang sebenarnya sah hanya karena induknya belum masuk.
 *
 * 2. Setelah menyalin, jumlah baris dihitung di KEDUA sisi dan dibandingkan.
 *    Skrip berakhir dengan kode gagal kalau ada satu tabel pun yang timpang.
 *    "Selesai tanpa error" bukan bukti; angka yang sama di dua sisi baru bukti.
 *
 * 3. Sequence dan number_counters ikut diselaraskan. Kalau tidak, pendaftar
 *    berikutnya di Postgres akan mendapat nomor yang sudah dipakai orang lain
 *    di Supabase.
 *
 * auth.users ikut pindah ke public.users, hanya kolom yang kita perlukan.
 * Hash passwordnya ikut terbawa apa adanya — formatnya bcrypt, dan itu yang
 * nanti dibaca lapisan auth baru.
 */

import { readFileSync } from "node:fs";
import pg from "pg";

const DRY = process.argv.includes("--dry");
const REPLACE = process.argv.includes("--replace");

/** Urutan tidak penting untuk penyisipan, tapi memudahkan membaca laporannya. */
const TABLES = [
  "users",
  "admin_users",
  "events",
  "customers",
  "children",
  "registrations",
  "payments",
  "attendance_records",
  "certificate_templates",
  "certificates",
  "financial_transactions",
  "vouchers",
  "voucher_redemptions",
  "affiliates",
  "cms_sections",
  "cms_collections",
  "cms_versions",
  "media",
  "navigation_items",
  "site_settings",
  "number_counters",
  "activity_logs",
];

/** Kolom auth.users yang dibawa; sisanya milik mesin Supabase. */
const USER_COLUMNS = ["id", "email", "encrypted_password", "created_at", "updated_at"];

const SEQUENCES = ["customer_number_seq", "child_number_seq", "affiliate_number_seq"];

function readEnv(name, file) {
  if (process.env[name]) return process.env[name];
  try {
    for (const line of readFileSync(new URL(`../${file}`, import.meta.url), "utf8").split("\n")) {
      if (line.trim().startsWith("#") || !line.includes("=")) continue;
      const key = line.slice(0, line.indexOf("=")).trim();
      if (key === name) return line.slice(line.indexOf("=") + 1).trim().replace(/^"|"$/g, "");
    }
  } catch {
    /* berkasnya tidak ada; pesan di bawah yang menjelaskan */
  }
  return "";
}

const SOURCE = readEnv("SUPABASE_DATABASE_URL", ".env.local");
const TARGET = readEnv("DATABASE_URL", ".env");

if (!SOURCE) throw new Error("SUPABASE_DATABASE_URL belum ada di .env.local");
if (!TARGET) throw new Error("DATABASE_URL belum ada di .env");

const source = new pg.Client({ connectionString: SOURCE });
const target = new pg.Client({ connectionString: TARGET });

/** Nama tabel sumber: users tinggal di skema auth milik Supabase. */
const sourceName = (table) => (table === "users" ? "auth.users" : `public."${table}"`);

async function countRows(client, table, qualified) {
  const { rows } = await client.query(`select count(*)::int as n from ${qualified}`);
  return rows[0].n;
}

await source.connect();
await target.connect();

try {
  // Kolom apa saja yang benar-benar ada di kedua sisi. Memotong di irisan ini
  // berarti kolom bawaan Supabase yang tidak kita bawa tidak bikin gagal, dan
  // kolom baru di sisi kita tidak dicari-cari di sumbernya.
  const targetColumns = new Map();
  for (const table of TABLES) {
    const { rows } = await target.query(
      `select column_name, udt_name from information_schema.columns
        where table_schema='public' and table_name=$1`,
      [table],
    );
    targetColumns.set(table, rows);
  }

  const plan = [];
  for (const table of TABLES) {
    const { rows } = await source.query(
      `select column_name from information_schema.columns
        where table_schema=$1 and table_name=$2`,
      [table === "users" ? "auth" : "public", table],
    );
    const available = new Set(rows.map((r) => r.column_name));
    const wanted = targetColumns
      .get(table)
      .filter((c) => available.has(c.column_name))
      .filter((c) => (table === "users" ? USER_COLUMNS.includes(c.column_name) : true));
    plan.push({ table, columns: wanted });
  }

  // Skrip ini mengosongkan tabel tujuan sebelum menyalin. Itu aman di database
  // baru dan menghancurkan di database yang sudah dipakai: data yang ditulis
  // setelah migrasi pertama (postingan Instagram, pendaftaran baru) tidak ada
  // di Supabase, jadi tidak bisa dipulihkan dari sana. Karena itu menolak
  // jalan di atas data, kecuali diminta dengan --replace.
  if (!DRY && !REPLACE) {
    let existing = 0;
    for (const { table } of plan) existing += await countRows(target, table, `public."${table}"`);
    if (existing > 0) {
      console.error(`Database tujuan sudah berisi ${existing} baris.`);
      console.error("Skrip ini MENGOSONGKAN tabel tujuan sebelum menyalin, jadi data yang ada akan hilang.");
      console.error("Kalau memang itu yang diinginkan, jalankan ulang dengan --replace.");
      process.exit(2);
    }
  }

  console.log(DRY ? "MODE UJI — tidak ada yang ditulis\n" : "Menyalin…\n");

  const report = [];

  if (!DRY) {
    // Mematikan pemicu foreign key selama penyalinan.
    await target.query("set session_replication_role = replica");
  }

  for (const { table, columns } of plan) {
    const from = await countRows(source, table, sourceName(table));

    if (DRY || from === 0) {
      report.push({ table, from, to: DRY ? null : await countRows(target, table, `public."${table}"`) });
      if (DRY) console.log(`  ${table.padEnd(24)} ${String(from).padStart(5)} baris`);
      continue;
    }

    const names = columns.map((c) => c.column_name);
    const { rows } = await source.query(
      `select ${names.map((n) => `"${n}"`).join(", ")} from ${sourceName(table)}`,
    );

    // Dikosongkan dulu supaya skrip ini bisa dijalankan berulang tanpa
    // menumpuk duplikat — menjalankan ulang migrasi adalah hal normal.
    await target.query(`truncate table public."${table}" cascade`);

    const placeholders = names.map((n, i) => {
      const type = columns[i].udt_name;
      return type === "jsonb" || type === "json" ? `$${i + 1}::${type}` : `$${i + 1}`;
    });
    const sql =
      `insert into public."${table}" (${names.map((n) => `"${n}"`).join(", ")}) ` +
      `values (${placeholders.join(", ")})`;

    for (const row of rows) {
      await target.query(
        sql,
        names.map((n) => {
          const value = row[n];
          // node-postgres mengirim objek sebagai string; jsonb perlu teks JSON.
          return value !== null && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)
            ? JSON.stringify(value)
            : value;
        }),
      );
    }

    const to = await countRows(target, table, `public."${table}"`);
    report.push({ table, from, to });
    console.log(`  ${table.padEnd(24)} ${String(from).padStart(5)} → ${String(to).padStart(5)}`);
  }

  if (!DRY) {
    await target.query("set session_replication_role = default");

    // Sequence penomoran: tanpa ini pendaftar berikutnya mendapat nomor yang
    // sudah dipakai orang lain.
    for (const seq of SEQUENCES) {
      const { rows } = await source.query(`select last_value, is_called from pg_sequences
        where schemaname='public' and sequencename=$1`, [seq]).catch(() => ({ rows: [] }));
      const last = rows[0]?.last_value;
      if (last != null) {
        await target.query(`select setval($1, $2, true)`, [seq, String(last)]);
        console.log(`  sequence ${seq} → ${last}`);
      }
    }
  }

  console.log("");

  if (DRY) {
    const total = report.reduce((sum, r) => sum + r.from, 0);
    console.log(`${total} baris siap disalin dari ${report.length} tabel.`);
    process.exit(0);
  }

  // Pembuktian: angka harus sama persis di kedua sisi.
  const mismatched = report.filter((r) => r.from !== r.to);
  if (mismatched.length > 0) {
    console.error("TIDAK COCOK — jangan dipakai:");
    for (const r of mismatched) console.error(`  ${r.table}: Supabase ${r.from}, lokal ${r.to}`);
    process.exit(1);
  }

  const total = report.reduce((sum, r) => sum + r.to, 0);
  console.log(`Cocok semua: ${total} baris di ${report.length} tabel, sama persis dengan Supabase.`);
  console.log("Supabase tidak diubah sama sekali — hanya dibaca.");
} finally {
  await source.end().catch(() => {});
  await target.end().catch(() => {});
}
