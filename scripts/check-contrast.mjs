/**
 * Checks every theme preset against WCAG AA.
 *
 * Run with `node scripts/check-contrast.mjs`. It exits non-zero if any pair
 * that carries text falls below 4.5:1, so a palette can never be added by
 * eye — the numbers decide.
 */

import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/lib/cms/theme-presets.ts", import.meta.url), "utf8");

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Pull each preset's values out of the source rather than importing TypeScript.
const presets = [...source.matchAll(/id: "([a-z]+)",[\s\S]*?values: \{([\s\S]*?)\n    \},/g)].map(
  ([, id, body]) => {
    const values = Object.fromEntries(
      [...body.matchAll(/(\w+): "([^"]*)"/g)].map(([, key, value]) => [key, value]),
    );
    return { id, values };
  },
);

const PAIRS = [
  ["ink", "canvas", "Teks utama di latar halaman"],
  ["ink", "surface", "Teks utama di kartu"],
  ["muted", "surface", "Teks samar di kartu"],
  ["brand", "surface", "Warna utama di kartu"],
  ["brandInk", "surface", "Warna utama gelap di kartu"],
];

let failed = 0;
for (const preset of presets) {
  const hasColours = Object.values(preset.values).some((value) => value.startsWith("#"));
  if (!hasColours) {
    console.log(`${preset.id.padEnd(10)} (memakai warna bawaan stylesheet — dilewati)`);
    continue;
  }
  console.log(`\n${preset.id}`);
  for (const [fg, bg, label] of PAIRS) {
    const a = preset.values[fg];
    const b = preset.values[bg];
    if (!a?.startsWith("#") || !b?.startsWith("#")) continue;
    const value = ratio(a, b);
    const ok = value >= 4.5;
    if (!ok) failed += 1;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(32)} ${value.toFixed(2)}:1`);
  }
}

console.log(failed === 0 ? "\nSemua pasangan lolos AA (>= 4.5:1)." : `\n${failed} pasangan GAGAL.`);
process.exit(failed > 0 ? 1 : 0);
