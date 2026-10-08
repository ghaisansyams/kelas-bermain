/**
 * Smoke test for the public site.
 *
 * Drives a real Firefox through the paths a parent actually takes, and fails
 * the run if any of them break. Firefox rather than Chromium because this
 * machine's macOS is too old for a current Chrome build.
 *
 * Usage:
 *   npm run qa                                  # against http://localhost:3100
 *   BASE=https://kelas-bermain.vercel.app npm run qa
 *
 * Start the server first: `npm run build && PORT=3100 npm start`.
 *
 * It only reads — nothing here submits a registration, so it is safe to point
 * at production.
 */

import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3100";
const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const FIREFOX =
  process.env.FIREFOX_PATH ?? "/Applications/Firefox.app/Contents/MacOS/firefox";

let browser;
try {
  browser = await puppeteer.launch({
    browser: "firefox",
    executablePath: FIREFOX,
    headless: true,
    protocol: "webDriverBiDi",
  });
} catch (error) {
  console.error(`Tidak bisa menjalankan Firefox di ${FIREFOX}.`);
  console.error("Set FIREFOX_PATH kalau Firefox terpasang di tempat lain.");
  console.error(String(error.message ?? error));
  process.exit(2);
}

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

async function go(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0", timeout: 45000 });
}

// 1. Home renders its hero and the carousel actually has slides.
await go("/");
const heroSlides = await page.$$eval("[class*='aspect'] img, img", (els) => els.length);
record("Home: gambar termuat", heroSlides > 0, `${heroSlides} img`);
const navLinks = await page.$$eval("header a", (els) => els.map((e) => e.textContent.trim()));
record("Home: navbar punya item", navLinks.length > 3, navLinks.slice(0, 8).join(" | "));

// 2. Event list + category filter.
await go("/event");
const eventCards = await page.$$eval("article", (els) => els.length);
record("Event: kartu tampil", eventCards > 0, `${eventCards} kartu`);

// 3. Event detail.
await go("/event/pemadam-cilik-oktober-2026");
const h1 = await page.$eval("h1", (el) => el.textContent.trim()).catch(() => "");
record("Event detail: judul ada", h1.length > 0, h1);

// 4. Registration wizard loads and step 1 validates.
await go("/register/decorate-mini-cake-oktober-2026");
const hasForm = await page.$("#companion-fullName-0");
record("Registrasi: form pendamping ada", Boolean(hasForm));
if (hasForm) {
  const buttons = await page.$$eval("button", (els) =>
    els.map((e) => e.textContent.trim()).filter(Boolean),
  );
  const next = buttons.find((b) => /lanjut/i.test(b));
  record("Registrasi: tombol lanjut ada", Boolean(next), next ?? "(tidak ada)");

  // Submitting an empty form must be stopped by validation, not by a crash.
  const nextBtn = await page.$$("button").then((els) =>
    Promise.all(els.map(async (el) => [el, await el.evaluate((e) => e.textContent.trim())])),
  );
  const target = nextBtn.find(([, label]) => /lanjut/i.test(label));
  if (target) {
    await target[0].click();
    await new Promise((r) => setTimeout(r, 1200));
    const alerts = await page.$$eval("[role='alert']", (els) => els.length);
    record("Registrasi: form kosong ditolak validasi", alerts > 0, `${alerts} pesan`);
  }

  // Personal / Group mode switch must exist (client asked for it explicitly).
  const body = await page.$eval("body", (el) => el.innerText);
  record("Registrasi: pilihan Personal/Group ada", /group/i.test(body) && /personal/i.test(body));
}

// 5. Certificate checker is reachable and rejects a bogus number cleanly.
await go("/sertifikat");
const certInput = await page.$("input");
record("Sertifikat: halaman aktif", Boolean(certInput));
if (certInput) {
  await certInput.type("KB-2026-99999");
  const handles = await page.$$("button");
  const pairs = await Promise.all(
    handles.map(async (el) => [el, await el.evaluate((e) => e.textContent.trim())]),
  );
  const btn = (pairs.find(([, t]) => /cek|cari|verifik/i.test(t)) ?? [])[0];
  if (btn) {
    await btn.click();
    await new Promise((r) => setTimeout(r, 2500));
    const text = await page.$eval("body", (el) => el.innerText);
    const handled = /tidak ditemukan|tidak valid|periksa/i.test(text);
    record("Sertifikat: nomor palsu ditolak rapi", handled);
  }
}

// 5c. Draft preview must be refused to anyone who is not a signed-in admin.
const previewRes = await page.goto(`${BASE}/preview?path=/`, { waitUntil: "networkidle0" });
record(
  "Pratinjau: ditolak tanpa login admin",
  page.url().includes("/admin/login") || previewRes.status() >= 400,
  page.url(),
);

// 5d. Gallery is now a Drive link, so check the link is actually there.
await go("/galeri");
const galleryBody = await page.$eval("body", (el) => el.innerText);
const driveHref = await page.$$eval("a", (els) =>
  els.some((e) => e.href.includes("drive.google.com")),
);
record("Galeri: tautan Google Drive ada", driveHref, /galeri/i.test(galleryBody) ? "" : "teks galeri tidak ditemukan");

// 6. Ticket checker.
await go("/tiket");
record("Tiket: halaman termuat", Boolean(await page.$("input")));

// 7. Affiliate page.
await go("/affiliate");
const affText = await page.$eval("body", (el) => el.innerText);
record("Affiliate: form pendaftaran ada", /affiliate|affiliator/i.test(affText));

// 8. Admin redirects to login when signed out.
await go("/admin");
record("Admin: diarahkan ke login", page.url().includes("/admin/login"), page.url());

// 9. 404.
const res = await page.goto(`${BASE}/halaman-tidak-ada`, { waitUntil: "networkidle0" });
record("404: status benar", res.status() === 404, String(res.status()));

// 10. Mobile layout: no horizontal scroll on home.
await page.setViewport({ width: 390, height: 844 });
await go("/");
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
record("Mobile: tidak ada scroll horizontal", overflow <= 1, `overflow ${overflow}px`);

await browser.close();

console.log("\n--- Console errors ---");
const noise = consoleErrors.filter((e) => !/favicon|404 \(Not Found\)/i.test(e));
if (noise.length === 0) console.log("(bersih)");
else noise.slice(0, 15).forEach((e) => console.log("  " + e));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} lulus`);
process.exit(failed.length > 0 ? 1 : 0);
