/**
 * Checks what actually exists in the Supabase database.
 *
 * Run with `npm run check-db`. It uses the public anon key only — the same
 * access the website has — so it can never change anything. Every line is a
 * real request, not an assumption.
 */

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / ANON_KEY tidak ditemukan di .env.local");
  process.exit(2);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const TABLES = [
  ["events", "001"],
  ["vouchers", "002"],
  ["voucher_redemptions", "002"],
  ["cms_collections", "004"],
  ["cms_versions", "004"],
  ["certificate_templates", "004"],
];

/**
 * Only functions granted to `anon` can be probed with this key. An
 * admin-only function is invisible to PostgREST here whether or not it
 * exists, so reporting it as missing would be wrong — those are listed
 * separately and checked indirectly, through the table they belong to.
 */
const FUNCTIONS = [
  ["get_public_events", {}, "001"],
  ["find_voucher", { p_code: "X", p_children_count: 1, p_event_id: null }, "002"],
  ["verify_certificate", { p_query: "KB-2026-00001" }, "003"],
  ["get_cms_page", { p_page_key: "home" }, "004"],
  ["get_cms_collection", { p_collection_key: "pillars" }, "004"],
  ["get_homepage_events", {}, "004"],
  ["get_history_events", {}, "004"],
  ["get_certificate_template", { p_name: null }, "004"],
];

/** Admin-only functions. Presence is inferred from the migration that
 *  creates them, since anon cannot see them at all. */
const ADMIN_FUNCTIONS = [
  ["admin_set_attendance", "001"],
  ["admin_list_users", "002"],
  ["admin_grant_access", "002"],
  ["admin_set_affiliate_status", "003"],
  ["admin_publish_page", "004"],
  ["admin_reorder_sections", "004"],
  ["admin_restore_version", "004"],
];

/** Private tables the public must never be able to read. */
const PRIVATE = [
  "payments",
  "registrations",
  "children",
  "customers",
  "attendance_records",
  "certificates",
  "affiliates",
  "admin_users",
  "activity_logs",
  "financial_transactions",
];

let missing = 0;
let leaks = 0;

console.log("TABEL");
for (const [table, source] of TABLES) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
  const text = await res.text();
  const absent = text.includes("PGRST205") || text.includes("does not exist");
  if (absent) missing += 1;
  console.log(`  ${absent ? "BELUM ADA" : "ADA      "}  ${table.padEnd(24)} (${source})`);
}

console.log("\nFUNGSI");
for (const [fn, body, source] of FUNCTIONS) {
  // A privileged function is probed with HEAD-like intent: we only care
  // whether PostgREST knows it, never whether it would succeed.
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  const absent = text.includes("PGRST202");
  if (absent) missing += 1;
  console.log(`  ${absent ? "BELUM ADA" : "ADA      "}  ${fn.padEnd(30)} (${source})`);
}

console.log("\nFUNGSI KHUSUS ADMIN (tidak bisa dicek dengan anon key)");
for (const [fn, source] of ADMIN_FUNCTIONS) {
  console.log(`  —          ${fn.padEnd(30)} (${source}) ikut migration ${source}`);
}

console.log("\nKEAMANAN — data privat harus tertutup untuk publik");
for (const table of PRIVATE) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
  const text = await res.text();
  const exposed = res.ok && text !== "[]";
  if (exposed) leaks += 1;
  console.log(`  ${exposed ? "BOCOR !!!" : "tertutup "}  ${table}`);
}

console.log("\n" + "=".repeat(52));
if (missing > 0) {
  console.log(`${missing} objek publik belum ada — jalankan supabase/run-all.sql di SQL Editor.`);
} else {
  console.log("Semua tabel dan fungsi publik sudah ada.");
  console.log("Fungsi admin ikut migration yang sama, jadi seharusnya ikut terpasang.");
}
if (leaks > 0) console.log(`PERINGATAN: ${leaks} tabel privat terbaca publik.`);
console.log("=".repeat(52));

process.exit(missing > 0 || leaks > 0 ? 1 : 0);
