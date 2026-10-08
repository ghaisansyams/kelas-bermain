import { redirect } from "next/navigation";

/** Navigation now lives inside CMS Website → Website. */
export default function CmsNavigationRedirect() {
  redirect("/admin/cms?tab=global");
}
