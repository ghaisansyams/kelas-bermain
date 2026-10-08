import { draftMode } from "next/headers";

/**
 * True when this request is in draft preview.
 *
 * Uses Next's own draft mode rather than a hand-rolled cookie, for one
 * specific reason: reading it does not force a statically generated page to
 * become dynamic. A plain `cookies()` read does, which silently turned every
 * prerendered public page into a runtime render and broke them.
 *
 * Security comes from where draft mode is switched on: `/preview` calls
 * `requireAdmin()` first, and the draft-mode cookie is server-set, httpOnly
 * and signed, so a visitor cannot enable it for themselves.
 */
export async function isPreviewRequest(): Promise<boolean> {
  try {
    return (await draftMode()).isEnabled;
  } catch {
    return false;
  }
}
