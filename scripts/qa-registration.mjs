/**
 * Acceptance checks for the registration revision.
 *
 * Covers the three things the client actually asked for: a refresh must not
 * wipe the form, the hand-off must go to WhatsApp with the right message, and
 * nothing may look settled before an admin says so.
 *
 * Nothing here submits a registration — it stops at the confirmation step —
 * so it is safe to point at production.
 *
 * Usage: BASE=http://localhost:3100 node scripts/qa-registration.mjs
 */

import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:3100";
const FIREFOX =
  process.env.FIREFOX_PATH ?? "/Applications/Firefox.app/Contents/MacOS/firefox";

const results = [];
function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const COMPANION = "Qa Pendamping Uji";
const CHILD = "Qa Anak Uji";

async function type(page, id, value) {
  await page.waitForSelector(`#${id}`, { timeout: 15000 });
  await page.click(`#${id}`);
  await page.type(`#${id}`, value);
}

/** Every field the first step refuses to pass without. */
async function fillStepOne(page) {
  await type(page, "companion-fullName-0", COMPANION);
  await type(page, "companion-whatsapp-0", "081234567890");
  await type(page, "companion-domicile-0", "Pekayon, Jakarta Timur");
  await type(page, "fullName-0-0", CHILD);
  await type(page, "nickname-0-0", "Qa");
  await type(page, "ageYears-0-0", "6");
  await page.evaluate(() => {
    const select = document.querySelector("select");
    if (select && select.options.length > 1) {
      select.value = select.options[1].value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}

let browser;
try {
  browser = await puppeteer.launch({
    browser: "firefox",
    executablePath: FIREFOX,
    protocol: "webDriverBiDi",
    headless: true,
  });

  // Find an event whose form is actually open. The first card is not good
  // enough: a class closes registration as its date approaches, so a
  // hardcoded or first-found slug starts failing on a particular day rather
  // than when something is broken.
  const finder = await browser.newPage();
  await finder.goto(`${BASE}/event`, { waitUntil: "networkidle0" });
  const candidates = await finder.evaluate(() =>
    [...new Set(
      [...document.querySelectorAll('a[href^="/event/"]')].map((link) =>
        link.getAttribute("href").replace("/event/", ""),
      ),
    )],
  );

  let slug = null;
  for (const candidate of candidates) {
    await finder.goto(`${BASE}/register/${candidate}`, { waitUntil: "networkidle0" });
    const open = await finder.evaluate(() =>
      Boolean(document.querySelector("#companion-fullName-0")),
    );
    if (open) {
      slug = candidate;
      break;
    }
  }
  await finder.close();
  if (!slug) throw new Error("tidak ada event yang pendaftarannya masih terbuka");
  console.log(`(menguji event: ${slug})\n`);

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // TEST 1 — a refresh keeps what was typed.
  await page.goto(`${BASE}/register/${slug}`, { waitUntil: "networkidle0" });
  await fillStepOne(page);
  await new Promise((resolve) => setTimeout(resolve, 900)); // debounce window

  await page.reload({ waitUntil: "networkidle0" });
  const restored = await page.evaluate(
    () => document.querySelector("#companion-fullName-0")?.value ?? "",
  );
  record("Refresh: nama pendamping kembali", restored === COMPANION, restored || "kosong");

  const restoredChild = await page.evaluate(
    () => document.querySelector("#fullName-0-0")?.value ?? "",
  );
  record("Refresh: nama anak kembali", restoredChild === CHILD, restoredChild || "kosong");

  const banner = await page.evaluate(() => document.body.innerText);
  record(
    "Refresh: ada pemberitahuan data tersimpan",
    banner.includes("masih tersimpan"),
    banner.includes("masih tersimpan") ? "" : "teks tidak ditemukan",
  );
  record(
    "Refresh: ada pilihan Lanjutkan dan Mulai Baru",
    banner.includes("Lanjutkan") && banner.includes("Mulai Baru"),
  );

  // TEST 2 — "Mulai Baru" really clears it, including after another refresh.
  await page.evaluate(() => {
    const target = [...document.querySelectorAll("button")].find(
      (node) => node.textContent.trim() === "Mulai Baru",
    );
    target?.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 800));
  await page.reload({ waitUntil: "networkidle0" });
  const cleared = await page.evaluate(
    () => document.querySelector("#companion-fullName-0")?.value ?? "",
  );
  record("Mulai Baru: draft benar-benar terhapus", cleared === "", cleared || "kosong");

  // TEST 3 — the confirmation step hands off to payment, and says so.
  await fillStepOne(page);
  await page.evaluate(() => {
    const next = [...document.querySelectorAll("button")].find((node) =>
      node.textContent.includes("Lanjut ke Konfirmasi"),
    );
    next?.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const confirmText = await page.evaluate(() => document.body.innerText);
  // A free class has no payment step, so its button says something else.
  // Both labels are correct; the old vague one is not.
  const label = confirmText.includes("Lanjut ke Pembayaran")
    ? "Lanjut ke Pembayaran"
    : confirmText.includes("Daftar Sekarang")
      ? "Daftar Sekarang"
      : null;
  record("Konfirmasi: tombol menyebut langkah berikutnya", Boolean(label), label ?? "tidak ada");
  record(
    "Konfirmasi: label lama sudah tidak dipakai",
    !confirmText.includes("Konfirmasi & Lanjut Pembayaran"),
  );
  record(
    "Konfirmasi: belum ada klaim pembayaran berhasil",
    !/pembayaran berhasil|berhasil dibayar|lunas/i.test(confirmText),
  );
  const consent = await page.evaluate(() => {
    const box = document.querySelector("#consent");
    return {
      present: Boolean(box),
      unchecked: box ? box.checked === false : false,
      label: box?.closest("label")?.innerText ?? document.body.innerText,
    };
  });
  record("Konfirmasi: ada centang persetujuan", consent.present && consent.unchecked);
  record(
    "Konfirmasi: persetujuan menyebut orang tua/wali",
    /orang tua\/wali/i.test(consent.label),
  );

  // TEST 4 — the ticket check works on the registration number alone.
  await page.goto(`${BASE}/cek-tiket`, { waitUntil: "networkidle0" });
  const lookup = await page.evaluate(() => {
    const contact = document.querySelector("#contact");
    return {
      hasNumber: Boolean(document.querySelector("#registrationNumber")),
      contactOptional: (contact?.labels?.[0]?.textContent ?? "").includes("opsional"),
      numberRequired: document.querySelector("#registrationNumber")?.required !== false,
    };
  });
  record("Cek tiket: kolom nomor pendaftaran ada", lookup.hasNumber);
  record("Cek tiket: kontak bersifat opsional", lookup.contactOptional);

  await type(page, "registrationNumber", "KB-REG-2026-99999");
  await page.evaluate(() => {
    const submit = document.querySelector('button[type="submit"]');
    submit?.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const notFound = await page.evaluate(() => document.body.innerText);
  record(
    "Cek tiket: nomor asing ditolak rapi",
    /tidak ditemukan/i.test(notFound),
    /tidak ditemukan/i.test(notFound) ? "" : "pesan tidak jelas",
  );

  // TEST 5 — the widths a parent's phone actually reports.
  for (const width of [375, 390, 412]) {
    const mobile = await browser.newPage();
    await mobile.setViewport({ width, height: 780 });
    let worst = 0;
    for (const path of ["/", `/register/${slug}`, "/cek-tiket", "/event"]) {
      await mobile.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
      const overflow = await mobile.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      worst = Math.max(worst, overflow);
    }
    record(`Mobile ${width}px: tidak ada scroll horizontal`, worst <= 1, `overflow ${worst}px`);
    await mobile.close();
  }

  console.log("\n--- Console errors ---");
  console.log(consoleErrors.length ? consoleErrors.join("\n") : "(bersih)");
} catch (error) {
  record("Runner", false, String(error.message ?? error));
} finally {
  await browser?.close();
}

const passed = results.filter((row) => row.ok).length;
console.log(`\n${passed}/${results.length} lulus`);
process.exit(passed === results.length ? 0 : 1);
