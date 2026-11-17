/**
 * Membaca daftar nama peserta dari berkas Excel (.xlsx) atau CSV, sepenuhnya di
 * browser. Berkasnya tidak pernah dikirim ke server.
 *
 * Berkas sekolah jarang rapi: ada beberapa tabel berdampingan (kelas 4 di kiri,
 * kelas lain di kanan), judul kelas di sela-sela, dan kolom nomor. Karena itu
 * pembaca ini tidak mengandaikan satu kolom bersih. Ia mencari judul kolom
 * "Nama …" dan mengambil isi di bawahnya; kalau tidak ada judul, tiap kolom
 * yang berisi teks ditawarkan dan orang memilih sendiri.
 */

/** Satu sheet: baris -> kolom -> isi sel (sebagai teks). Nomor mulai dari 0. */
export interface SheetGrid {
  name: string;
  cells: Map<number, Map<number, string>>;
}

export interface NameColumn {
  /** Kunci unik untuk centang di layar. */
  key: string;
  sheet: string;
  columnLetter: string;
  /** Judul kolom bila ada, mis. "Nama Peserta Didik". */
  heading: string;
  names: string[];
  /** Apakah kolom ini terdeteksi dari judul "Nama …". */
  fromHeading: boolean;
}

const MAX_NAME_LENGTH = 100;

export function columnLetter(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

function columnIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Rapikan spasi ganda dan spasi tak terlihat yang sering terbawa dari Excel. */
export function cleanName(value: string): string {
  return value
    .replace(/[ ​‌‍﻿]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "BUDI SANTOSO" / "budi santoso" -> "Budi Santoso". Tanda hubung dan apostrof dihormati. */
export function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("id-ID")
    .replace(/(^|[\s\-'’.(])(\p{L})/gu, (_, lead: string, letter: string) => lead + letter.toLocaleUpperCase("id-ID"));
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

function parseCsv(text: string): SheetGrid {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [";", "\t", ","]
    .map((d) => ({ d, n: firstLine.split(d).length }))
    .sort((a, b) => b.n - a.n)[0].d;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const cells = new Map<number, Map<number, string>>();
  rows.forEach((values, r) => {
    const line = new Map<number, string>();
    values.forEach((value, c) => {
      if (value.trim() !== "") line.set(c, value);
    });
    if (line.size > 0) cells.set(r, line);
  });
  return { name: "CSV", cells };
}

/* ------------------------------------------------------------------ */
/* XLSX                                                                */
/* ------------------------------------------------------------------ */

function xml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}

/** Semua elemen dengan nama lokal tertentu, tanpa peduli awalan namespace. */
function byLocalName(parent: Document | Element, name: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS("*", name));
}

function textOfRuns(element: Element): string {
  // <si> bisa berisi <t> langsung atau beberapa <r><t>. <rPh> adalah furigana
  // (bacaan), bukan isi sel, jadi dilewati.
  let out = "";
  for (const t of byLocalName(element, "t")) {
    if (t.parentElement?.localName === "rPh") continue;
    out += t.textContent ?? "";
  }
  return out;
}

async function parseXlsx(buffer: ArrayBuffer): Promise<SheetGrid[]> {
  const { unzipSync, strFromU8 } = await import("fflate");

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buffer), {
      filter: (file) => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(file.name),
    });
  } catch {
    throw new Error("Berkas ini tidak bisa dibuka. Pastikan formatnya .xlsx (Excel), bukan .xls lama.");
  }

  const workbookXml = files["xl/workbook.xml"];
  if (!workbookXml) throw new Error("Berkas ini bukan Excel (.xlsx) yang valid.");

  const shared: string[] = files["xl/sharedStrings.xml"]
    ? byLocalName(xml(strFromU8(files["xl/sharedStrings.xml"])), "si").map(textOfRuns)
    : [];

  const relTargets = new Map<string, string>();
  if (files["xl/_rels/workbook.xml.rels"]) {
    for (const rel of byLocalName(xml(strFromU8(files["xl/_rels/workbook.xml.rels"])), "Relationship")) {
      const id = rel.getAttribute("Id");
      const target = rel.getAttribute("Target");
      if (id && target) relTargets.set(id, target.replace(/^\/?(xl\/)?/, "xl/"));
    }
  }

  const sheets: SheetGrid[] = [];
  for (const sheet of byLocalName(xml(strFromU8(workbookXml)), "sheet")) {
    const name = sheet.getAttribute("name") ?? `Sheet${sheets.length + 1}`;
    const rid = sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const path = (rid && relTargets.get(rid)) || `xl/worksheets/sheet${sheets.length + 1}.xml`;
    const data = files[path];
    if (!data) continue;

    const cells = new Map<number, Map<number, string>>();
    for (const cell of byLocalName(xml(strFromU8(data)), "c")) {
      const ref = /^([A-Z]+)(\d+)$/.exec(cell.getAttribute("r") ?? "");
      if (!ref) continue;
      const col = columnIndex(ref[1]);
      const row = Number(ref[2]) - 1;
      const type = cell.getAttribute("t");
      let value = "";
      if (type === "inlineStr") {
        const inline = byLocalName(cell, "is")[0];
        value = inline ? textOfRuns(inline) : "";
      } else {
        const v = byLocalName(cell, "v")[0]?.textContent ?? "";
        value = type === "s" ? (shared[Number(v)] ?? "") : v;
      }
      if (value.trim() === "") continue;
      let line = cells.get(row);
      if (!line) cells.set(row, (line = new Map()));
      line.set(col, value);
    }
    sheets.push({ name, cells });
  }
  return sheets;
}

export async function readSpreadsheet(file: File): Promise<SheetGrid[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xls")) {
    throw new Error("Format .xls lama belum bisa dibaca. Buka di Excel lalu Simpan Sebagai .xlsx, kemudian unggah lagi.");
  }
  if (lower.endsWith(".csv") || lower.endsWith(".txt") || file.type === "text/csv") {
    return [parseCsv(await file.text())];
  }
  return parseXlsx(await file.arrayBuffer());
}

/* ------------------------------------------------------------------ */
/* Mencari kolom nama                                                  */
/* ------------------------------------------------------------------ */

/** Judul seperti "Nama", "Nama Peserta Didik", "Nama Siswa", "Name". */
function isNameHeading(value: string): boolean {
  return /^(nama|name)(\s|$|[:.(/])/i.test(cleanName(value));
}

/** Teks yang jelas bukan nama orang: angka murni, tanggal, tanda baca saja. */
function looksLikeName(value: string): boolean {
  const v = cleanName(value);
  if (v.length < 2 || v.length > MAX_NAME_LENGTH) return false;
  if (!/\p{L}/u.test(v)) return false;
  return true;
}

export function findNameColumns(sheets: SheetGrid[]): NameColumn[] {
  const result: NameColumn[] = [];

  for (const sheet of sheets) {
    const rows = [...sheet.cells.keys()].sort((a, b) => a - b);
    // Kolom -> baris-baris yang berisi judul "Nama …".
    const headingsByColumn = new Map<number, number[]>();
    for (const r of rows) {
      for (const [c, value] of sheet.cells.get(r) ?? []) {
        if (isNameHeading(value)) headingsByColumn.set(c, [...(headingsByColumn.get(c) ?? []), r]);
      }
    }

    if (headingsByColumn.size > 0) {
      for (const [c, headingRows] of [...headingsByColumn].sort((a, b) => a[0] - b[0])) {
        const names: string[] = [];
        for (const r of rows) {
          if (r <= headingRows[0]) continue;
          if (headingRows.includes(r)) continue;
          const value = sheet.cells.get(r)?.get(c);
          if (value !== undefined && looksLikeName(value)) names.push(cleanName(value));
        }
        if (names.length === 0) continue;
        result.push({
          key: `${sheet.name}:${c}`,
          sheet: sheet.name,
          columnLetter: columnLetter(c),
          // Judul tersingkat: kolom ini sering diawali judul tabel panjang
          // ("Nama Peserta Didik Kelas 4-6") di atas judul kolom sebenarnya.
          heading: headingRows
            .map((r) => cleanName(sheet.cells.get(r)?.get(c) ?? ""))
            .sort((a, b) => a.length - b.length)[0],
          names,
          fromHeading: true,
        });
      }
      continue;
    }

    // Tanpa judul "Nama": tawarkan kolom yang isinya mayoritas teks.
    const columns = new Map<number, string[]>();
    for (const r of rows) {
      for (const [c, value] of sheet.cells.get(r) ?? []) {
        if (looksLikeName(value)) columns.set(c, [...(columns.get(c) ?? []), cleanName(value)]);
      }
    }
    // Baris pertama yang jelas judul ("Daftar Siswa") bukan nama orang.
    const titleLike = /\b(daftar|data|list|siswa|murid|peserta|absen)\b/i;
    for (const [c, names] of columns) {
      const firstRow = rows.find((r) => sheet.cells.get(r)?.has(c));
      const first = firstRow === undefined ? undefined : sheet.cells.get(firstRow)?.get(c);
      if (first !== undefined && titleLike.test(first) && names.length > 1) names.shift();
    }
    const ranked = [...columns].sort((a, b) => b[1].length - a[1].length);
    for (const [c, names] of ranked) {
      if (names.length < 2 && ranked.length > 1) continue;
      result.push({
        key: `${sheet.name}:${c}`,
        sheet: sheet.name,
        columnLetter: columnLetter(c),
        heading: "",
        names,
        fromHeading: false,
      });
    }
  }

  return result;
}
