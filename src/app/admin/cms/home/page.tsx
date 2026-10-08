import { redirect } from "next/navigation";

/** Merged into the single CMS Website page; kept so old links still work. */
export default function CmsHomeRedirect() {
  redirect("/admin/cms?tab=home");
}
