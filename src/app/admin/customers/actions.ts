"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { requireRole } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Deleting people records.
 *
 * Three guards, because this removes real data:
 *   1. Only a SUPER_ADMIN may do it.
 *   2. The action re-counts registrations here — the UI's own check is never
 *      trusted, since a stale page could offer delete on a row that has since
 *      been registered.
 *   3. The database has ON DELETE RESTRICT on registrations and payments, so
 *      even if both checks above were wrong, Postgres refuses.
 *
 * Deactivating is offered instead whenever a record cannot be removed: the
 * history stays intact and the row stops appearing in active lists.
 */

function back(path: string, status: string): never {
  redirect(`${path}?msg=${status}`);
}

export async function deleteCustomerAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = String(formData.get("customerId") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!id) back("/admin/customers", "error");

  const supabase = await createSupabaseServerClient();

  // Re-check here rather than trusting what the page rendered.
  const { count } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id);

  if ((count ?? 0) > 0) back("/admin/customers", "has-registrations");

  // Children cascade with the parent, so say how many went with them.
  const { count: childCount } = await supabase
    .from("children")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", id);

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) back("/admin/customers", "error");

  await logActivity(
    "DELETE_CUSTOMER",
    "customers",
    code || id,
    { code, childrenDeleted: childCount ?? 0 },
    null,
  );

  revalidatePath("/admin/customers");
  revalidatePath("/admin/children");
  back("/admin/customers", "deleted");
}

export async function setCustomerStatusAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = String(formData.get("customerId") ?? "");
  const next = String(formData.get("next")) === "active" ? "active" : "inactive";
  if (!id) back("/admin/customers", "error");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("customers").update({ status: next }).eq("id", id);
  if (error) back("/admin/customers", "error");

  await logActivity("UPDATE_CUSTOMER", "customers", id, null, { status: next });
  revalidatePath("/admin/customers");
  back("/admin/customers", next === "active" ? "activated" : "deactivated");
}
