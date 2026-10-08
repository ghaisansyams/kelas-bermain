"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { requireRole } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** See the note in customers/actions.ts — same three guards apply. */

function back(status: string): never {
  redirect(`/admin/children?msg=${status}`);
}

export async function deleteChildAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = String(formData.get("childId") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!id) back("error");

  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("child_id", id);

  if ((count ?? 0) > 0) back("has-registrations");

  const { error } = await supabase.from("children").delete().eq("id", id);
  if (error) back("error");

  await logActivity("DELETE_CHILD", "children", code || id, { code }, null);
  revalidatePath("/admin/children");
  revalidatePath("/admin/customers");
  back("deleted");
}

export async function setChildStatusAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = String(formData.get("childId") ?? "");
  const next = String(formData.get("next")) === "active" ? "active" : "inactive";
  if (!id) back("error");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("children").update({ status: next }).eq("id", id);
  if (error) back("error");

  await logActivity("UPDATE_CHILD", "children", id, null, { status: next });
  revalidatePath("/admin/children");
  back(next === "active" ? "activated" : "deactivated");
}
