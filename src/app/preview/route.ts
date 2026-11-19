import { draftMode } from "next/headers";
import { requireAdmin } from "@/lib/admin/auth";
import { relativeRedirect, safeSitePath } from "@/lib/utils/relative-redirect";

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

  // Same-site paths only, so this can never become an open redirect.
  const safePath = safeSitePath(new URL(request.url).searchParams.get("path"));

  (await draftMode()).enable();

  // Relatif: di hosting request.url berisi alamat dalam proxy (localhost:3001).
  return relativeRedirect(safePath);
}
