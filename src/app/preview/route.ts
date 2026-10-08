import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

/**
 * Turns draft preview on for this browser.
 *
 * `requireAdmin()` runs first, so only a signed-in admin can ever enable it;
 * the draft-mode cookie Next sets is httpOnly and server-signed, which is why
 * the pages themselves can trust it without re-checking the session (and
 * without reading cookies directly, which would break static rendering).
 */
export async function GET(request: Request) {
  await requireAdmin();

  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "/";
  // Same-site paths only, so this can never become an open redirect.
  const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/";

  (await draftMode()).enable();

  return NextResponse.redirect(new URL(safePath, url.origin));
}
