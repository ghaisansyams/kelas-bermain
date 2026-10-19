import { NextResponse, type NextRequest } from "next/server";

/**
 * Menjaga pengunjung yang belum masuk keluar dari /admin.
 *
 * Yang diperiksa di sini hanya ADA tidaknya cookie sesi, bukan sahnya.
 * Middleware Next berjalan di runtime edge yang tidak bisa memanggil
 * Prisma, jadi tidak ada cara memeriksa sesi ke database dari sini — dan
 * itu tidak masalah, karena ini memang bukan gerbangnya.
 *
 * Gerbang sesungguhnya ada di requireAdmin(), yang membaca sesi dari
 * database dan dipanggil ulang di setiap halaman admin dan setiap server
 * action. Cookie palsu lolos dari sini, lalu ditolak di sana.
 */
const COOKIE = "kb_session";

export function middleware(request: NextRequest) {
  const hasCookie = Boolean(request.cookies.get(COOKIE)?.value);
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/admin/login";

  if (!hasCookie && !isLoginRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (hasCookie && isLoginRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
