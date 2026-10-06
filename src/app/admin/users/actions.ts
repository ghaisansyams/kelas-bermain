"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ERRORS: Record<string, string> = {
  USER_NOT_FOUND: "not-found",
  FORBIDDEN: "forbidden",
  INVALID_ROLE: "invalid",
  INVALID_STATUS: "invalid",
  CANNOT_DEMOTE_SELF: "self",
  CANNOT_REVOKE_SELF: "self",
  LAST_SUPER_ADMIN: "last-super",
};

function back(status: string): never {
  redirect(`/admin/users?status=${status}`);
}

function mapError(message: string): string {
  const key = Object.keys(ERRORS).find((code) => message.includes(code));
  return key ? ERRORS[key] : "error";
}

/**
 * Grants admin rights to an account that already exists in Supabase Auth.
 * Creating the login itself needs a service-role key, which this app
 * deliberately never holds — so that step stays in the Supabase dashboard.
 */
export async function grantAccessAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "STAFF");
  if (!email) back("invalid");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_grant_access", {
    p_email: email,
    p_full_name: fullName,
    p_role: role,
  });

  if (error) back(mapError(error.message));

  revalidatePath("/admin/users");
  back("granted");
}

export async function updateUserAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  const status = String(formData.get("status") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!userId) back("error");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_update_user", {
    p_user_id: userId,
    p_role: role,
    p_status: status,
    p_full_name: fullName || null,
  });

  if (error) back(mapError(error.message));

  revalidatePath("/admin/users");
  back("updated");
}

export async function revokeAccessAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) back("error");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_revoke_access", { p_user_id: userId });

  if (error) back(mapError(error.message));

  revalidatePath("/admin/users");
  back("revoked");
}
