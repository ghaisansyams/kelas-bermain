import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { MEDIA_DIR } from "@/lib/config/storage";

/**
 * Melayani media CMS dari disk.
 *
 * Terbuka untuk publik — ini foto dan video yang memang tampil di situs. Yang
 * dijaga di sini bukan siapa yang boleh membaca, melainkan APA yang bisa
 * dibaca: hanya berkas di dalam folder media, hanya dengan ekstensi gambar dan
 * video yang dikenal. Rute ini tidak akan pernah menyajikan .env atau berkas
 * lain di server, apa pun yang diketik di URL.
 */

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
};

// Satu segmen: tanpa titik di awal, tanpa garis miring, tanpa karakter aneh.
const SEGMENT = /^[a-z0-9][a-z0-9._-]*$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const segments = path.map((part) => decodeURIComponent(part));

  if (segments.length < 2 || segments.some((part) => !SEGMENT.test(part) || part.includes(".."))) {
    return new Response("Not found", { status: 404 });
  }

  const extension = segments[segments.length - 1].split(".").pop()?.toLowerCase() ?? "";
  const type = TYPES[extension];
  if (!type) return new Response("Not found", { status: 404 });

  // Pertahanan kedua: setelah segmen disaring, jalur akhir tetap harus berada
  // di bawah folder media. Dua lapis supaya satu kekeliruan pola tidak cukup.
  const root = resolve(MEDIA_DIR);
  const file = resolve(join(root, ...segments));
  if (!file.startsWith(root + sep)) return new Response("Not found", { status: 404 });

  let size: number;
  try {
    const info = await stat(file);
    if (!info.isFile()) return new Response("Not found", { status: 404 });
    size = info.size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    // Nama berkas memuat penanda waktu unggah, jadi isinya tidak pernah
    // berubah di alamat yang sama.
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };

  // Safari menolak memutar video dari server yang tidak mendukung Range, dan
  // browser lain memakainya untuk melompat di tengah video.
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(size - 1, end);

    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }

    return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: { ...headers, "Content-Length": String(size) },
  });
}
