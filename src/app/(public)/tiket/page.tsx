import { redirect } from "next/navigation";

/**
 * The page moved to /cek-tiket. Kept as a redirect because the old path was
 * already handed out in WhatsApp messages and bookmarks.
 */
export default function TiketRedirectPage() {
  redirect("/cek-tiket");
}
