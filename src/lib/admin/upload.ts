"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getAdminSession } from "@/lib/auth/session";
import { MEDIA_DIR, MEDIA_URL_PREFIX } from "@/lib/config/storage";
import { db } from "@/lib/db";
import {
  ALLOWED_MIME,
  formatFileSize,
  maxBytesFor,
  MEDIA_BUCKET,
  MEDIA_FOLDERS,
  type MediaItem,
} from "@/lib/admin/media";

/**
 * Mengunggah satu berkas ke disk dan mencatatnya di `media`.
 *
 * Dipakai Pustaka Media dan setiap kolom gambar di CMS, jadi validasi, jalur
 * penyimpanan, dan baris metadatanya identik di mana pun unggahan dimulai.
 *
 * Ini server action, jadi setiap argumennya adalah masukan dari internet. Dulu
 * kebijakan Supabase Storage yang memutuskan siapa boleh menulis; sekarang
 * tidak ada kebijakan, jadi sesi admin diperiksa di sini.
 */

export type UploadResult =
  | { ok: true; url: string; fileName: string }
  | { ok: false; error: string };

type Kind = { mime: string; ext: string };

/**
 * Jenis berkas dari ISINYA. Tipe yang dikirim browser dan ekstensi nama berkas
 * keduanya diisi pengunggah, jadi tidak ada yang boleh dipercaya: berkas HTML
 * yang dinamai foto.jpg dan diberi tipe image/jpeg akan dilayani dari alamat
 * kita sendiri dan berjalan sebagai halaman di situs ini.
 */
function sniff(bytes: Uint8Array): Kind | null {
  const at = (i: number) => bytes[i];
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.slice(from, to));

  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") return { mime: "image/png", ext: "png" };
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return { mime: "image/gif", ext: "gif" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (brand === "avif" || brand === "avis") return { mime: "image/avif", ext: "avif" };
    // Merek lain di bawah ftyp adalah keluarga MP4 (isom, mp42, avc1, ...).
    return { mime: "video/mp4", ext: "mp4" };
  }
  if (at(0) === 0x1a && at(1) === 0x45 && at(2) === 0xdf && at(3) === 0xa3) {
    return { mime: "video/webm", ext: "webm" };
  }
  return null;
}

/** Bagian nama yang aman dipakai sebagai nama berkas. Ekstensi dari isi, bukan dari nama. */
function safeBase(name: string): string {
  const dot = name.lastIndexOf(".");
  return (
    (dot === -1 ? name : name.slice(0, dot))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file"
  );
}

export async function uploadMediaFile(formData: FormData): Promise<UploadResult> {
  const session = await getAdminSession();
  if (!session) return { ok: false, error: "Sesi berakhir. Masuk lagi untuk mengunggah." };

  const file = formData.get("file");
  const requested = String(formData.get("folder") ?? "general");
  // Folder dari daftar tertutup: tanpa ini, nilai karangan sendiri bisa
  // membuat folder di mana saja di bawah direktori media.
  const folder = (MEDIA_FOLDERS as readonly string[]).includes(requested) ? requested : "general";

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pilih berkas dulu." };
  }

  // Batas kasar sebelum membaca isinya ke memori.
  const hardLimit = maxBytesFor("video/mp4");
  if (file.size > hardLimit) {
    return {
      ok: false,
      error: `"${file.name}" terlalu besar (${formatFileSize(file.size)}). Maksimal ${formatFileSize(hardLimit)}.`,
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);

  if (!kind || !ALLOWED_MIME.includes(kind.mime)) {
    return {
      ok: false,
      error: `"${file.name}" formatnya tidak didukung. Pakai JPG, PNG, WEBP, AVIF, GIF, MP4, atau WEBM.`,
    };
  }

  // Batas per jenis dihitung dari jenis SEBENARNYA. Video yang menyamar sebagai
  // gambar tidak boleh lolos dengan batas gambar.
  const limit = maxBytesFor(kind.mime);
  if (bytes.byteLength > limit) {
    return {
      ok: false,
      error: `"${file.name}" terlalu besar (${formatFileSize(bytes.byteLength)}). Maksimal ${formatFileSize(limit)}.`,
    };
  }

  // Penanda waktu mencegah dua berkas bernama sama saling menimpa, dan
  // membuat alamatnya tidak pernah berubah isinya — itu yang membolehkan
  // cache seumur hidup di rute /uploads.
  const stored = `${folder}/${Date.now().toString(36)}-${safeBase(file.name)}.${kind.ext}`;
  const target = join(MEDIA_DIR, MEDIA_BUCKET, ...stored.split("/"));
  const url = `${MEDIA_URL_PREFIX}/${MEDIA_BUCKET}/${stored}`;

  try {
    await mkdir(join(MEDIA_DIR, MEDIA_BUCKET, folder), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  } catch {
    return { ok: false, error: "Berkas gagal disimpan. Coba lagi." };
  }

  try {
    await db.media.create({
      data: {
        file_name: file.name,
        storage_path: stored,
        public_url: url,
        mime_type: kind.mime,
        file_size: bytes.byteLength,
        folder,
        created_by: session.userId,
      },
    });
  } catch {
    // Berkasnya sudah di disk; hanya pencatatannya yang gagal. URL tetap
    // dikembalikan supaya kerja admin tidak hilang — berkas itu hanya tidak
    // muncul di daftar Pustaka Media sampai diunggah ulang.
  }

  return { ok: true, url, fileName: file.name };
}

/** Daftar media untuk pemilih gambar di CMS. */
export async function listMedia(): Promise<MediaItem[] | null> {
  const session = await getAdminSession();
  if (!session) return null;

  try {
    const rows = await db.media.findMany({
      orderBy: { created_at: "desc" },
      take: 60,
    });
    return rows.map((row) => ({
      id: row.id,
      file_name: row.file_name,
      storage_path: row.storage_path,
      public_url: row.public_url,
      alt_text: row.alt_text,
      mime_type: row.mime_type,
      file_size: Number(row.file_size),
      folder: row.folder,
      created_at: row.created_at.toISOString(),
    }));
  } catch {
    return null;
  }
}
