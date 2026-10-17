import "server-only";

/**
 * Instagram lewat Apify.
 *
 * Instagram menolak permintaan HTTP polos dari server (401 "require_login")
 * dan memblokir IP datacenter, jadi tidak ada gunanya memanggil mereka
 * langsung dari Vercel. Apify menjalankan browser di sisi mereka dan
 * mengembalikan JSON — itu sebabnya pendekatan ini bisa hidup sebagai cron
 * di server, bukan hanya di laptop.
 *
 * Tidak ada login akun Instagram di sini. Yang dibaca hanya postingan publik
 * milik akun sendiri, jadi tidak ada kredensial Instagram yang bisa bocor dan
 * tidak ada sesi yang bisa diblokir.
 */

const ACTOR_ENDPOINT =
  "https://api.apify.com/v2/acts/apify~instagram-post-scraper/run-sync-get-dataset-items";

/** Apify menjalankan browser sungguhan; seratus detik itu wajar, bukan lambat. */
const TIMEOUT_MS = 120_000;

export interface ApifyPost {
  id?: string;
  shortCode?: string;
  type?: string;
  caption?: string;
  displayUrl?: string;
  url?: string;
  timestamp?: string;
  ownerFullName?: string;
  ownerUsername?: string;
}

export type ApifyResult =
  | { ok: true; posts: ApifyPost[] }
  | { ok: false; error: string };

export async function fetchApifyPosts(
  username: string,
  limit = 12,
): Promise<ApifyResult> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return { ok: false, error: "APIFY_TOKEN belum diatur." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${ACTOR_ENDPOINT}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: [username.replace(/^@/, "")],
        resultsLimit: limit,
        skipPinnedPosts: false,
        dataDetailLevel: "basicData",
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      // Token ada di URL, jadi URL-nya sendiri tidak boleh ikut tercatat.
      return {
        ok: false,
        error: `Apify HTTP ${response.status}: ${detail.slice(0, 200) || "tanpa detail"}`,
      };
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      return { ok: false, error: "Format balasan Apify tidak dikenali." };
    }

    return { ok: true, posts: payload as ApifyPost[] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: message.includes("abort")
        ? `Apify tidak menjawab dalam ${TIMEOUT_MS / 1000} detik.`
        : `Gagal menghubungi Apify: ${message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
