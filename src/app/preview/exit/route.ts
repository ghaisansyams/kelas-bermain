import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

/** Leaves draft preview and returns to the published site. */
export async function GET(request: Request) {
  (await draftMode()).disable();
  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "/";
  const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return NextResponse.redirect(new URL(safePath, url.origin));
}
