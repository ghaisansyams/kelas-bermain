import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth/session";

/**
 * Gate for the ERP.
 *
 * Everything under /admin needs a valid session except the login screen. The
 * public site is untouched — parents never see an auth prompt.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifyToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/admin/login") {
    if (session) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
