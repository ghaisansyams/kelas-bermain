import { NextResponse, type NextRequest } from "next/server";

/**
 * Menjaga pengunjung yang belum masuk keluar dari /admin.
 *
 * Yang diperiksa di sini hanya ADA tidaknya cookie sesi, bukan sahnya.
 * Middleware Next berjalan di runtime edge yang tidak bisa memanggil Prisma,
 * jadi tidak ada cara memeriksa sesi ke database dari sini — dan itu tidak
 * masalah, karena ini memang bukan gerbangnya.
 *
 * Gerbang sesungguhnya ada di requireAdmin(), yang membaca sesi dari database
 * dan dipanggil ulang di setiap halaman admin dan setiap server action. Cookie
 * palsu lolos dari sini, lalu ditolak di sana.
 *
 * Satu arah saja, dengan sengaja: middleware ini hanya mengirim orang KE
 * halaman login, tidak pernah menjauh darinya. Mengirim "yang punya cookie" ke
 * luar dari login terdengar ramah, tapi cookie yang ada belum tentu sah —
 * sesi yang dihapus karena kata sandi diganti, aksesnya dicabut, atau sudah
 * kedaluwarsa tetap meninggalkan cookie. requireAdmin menolak cookie itu dan
 * mengirimnya ke login, middleware mengirimnya balik, dan begitu seterusnya
 * tanpa akhir: admin terkunci dari halaman login sampai cookienya habis.
 * Halaman login yang memutuskan, karena ia bisa membaca database.
 */
const COOKIE = "kb_session";

export function middleware(request: NextRequest) {
  const hasCookie = Boolean(request.cookies.get(COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (!hasCookie && pathname !== "/admin/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
