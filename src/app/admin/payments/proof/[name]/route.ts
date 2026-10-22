import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getAdminSession } from "@/lib/auth/session";
import { PAYMENT_PROOF_DIR } from "@/lib/config/storage";

/**
 * Melayani bukti transfer, hanya untuk admin.
 *
 * Berkasnya di luar public/, jadi rute ini satu-satunya jalan ke sana — dan
 * sesinya diperiksa di SETIAP permintaan, bukan sekali lalu tautannya boleh
 * dibagikan. Tautan bertanda tangan sementara membolehkan siapa pun yang
 * menerima tautan itu melihat tangkapan layar bank orang lain; di
 * sini tautan yang diteruskan ke orang lain hanya membawa mereka ke halaman
 * masuk.
 */

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

// Nama yang dibuat server adalah uuid + ekstensi. Pola ketat inilah yang
// mencegah "../../.env" dibaca lewat URL — jalur dari pengguna tidak pernah
// sampai ke sistem berkas.
const SAFE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const session = await getAdminSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { name: raw } = await params;
  const name = decodeURIComponent(raw);
  if (!SAFE_NAME.test(name)) return new Response("Not found", { status: 404 });

  try {
    const bytes = await readFile(join(PAYMENT_PROOF_DIR, name));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": TYPES[name.split(".").pop() ?? ""] ?? "application/octet-stream",
        // Berkas dari pengguna: jangan biarkan browser menebak jenisnya.
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
