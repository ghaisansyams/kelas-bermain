import { draftMode } from "next/headers";
import { relativeRedirect, safeSitePath } from "@/lib/utils/relative-redirect";

/** Leaves draft preview and returns to the published site. */
export async function GET(request: Request) {
  (await draftMode()).disable();
  return relativeRedirect(safeSitePath(new URL(request.url).searchParams.get("path")));
}
