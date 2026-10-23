import { NextResponse } from "next/server";
import { syncInstagramPosts } from "@/lib/services/instagram-sync";

/**
 * Sinkron Instagram tengah malam.
 *
 * Dipanggil crontab di server tiap 00.00 WIB. Bisa juga dipanggil tangan
 * untuk memaksa sinkron:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        http://localhost:3000/api/cron/instagram
 *
 * Rute ini tertutup. Tanpa CRON_SECRET yang cocok jawabannya 401 — kalau
 * terbuka, siapa pun bisa memaksa pemanggilan Apify berulang kali dan
 * menghabiskan kuota berbayar.
 */

export const dynamic = "force-dynamic";
// Apify menjalankan browser di sisi mereka, jadi satu panggilan bisa makan waktu menit.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET belum diatur, rute ini dinonaktifkan." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const report = await syncInstagramPosts();

  // Dicatat supaya kegagalan tengah malam masih bisa ditelusuri paginya di
  // log server, bukan hilang tanpa jejak.
  if (report.ok) {
    console.log(
      `[instagram] ${report.saved} tersimpan, ${report.skipped} dilewati, ` +
        `${report.uploaded} gambar baru, ${report.reused} dipakai ulang`,
    );
  } else {
    console.error(`[instagram] sinkron gagal: ${report.error}`);
  }

  return NextResponse.json(report, { status: report.ok ? 200 : 500 });
}
