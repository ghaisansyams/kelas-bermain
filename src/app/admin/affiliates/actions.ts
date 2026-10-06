"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ERRORS: Record<string, string> = {
  CODE_TAKEN: "code-taken",
  AFFILIATE_NOT_FOUND: "not-found",
  INVALID_STATUS: "invalid",
  FORBIDDEN: "forbidden",
};

function back(status: string): never {
  redirect(`/admin/affiliates?status=${status}`);
}

/**
 * Approve / reject / deactivate one affiliate. Approving mints the referral
 * code if they do not have one yet — until this runs, an applicant has no
 * code at all, so the affiliate discount can never apply to anyone.
 */
export async function setAffiliateStatusAction(formData: FormData) {
  await requireAdmin();
  const affiliateId = String(formData.get("affiliateId") ?? "");
  const status = String(formData.get("status") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!affiliateId || !status) back("error");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_affiliate_status", {
    p_affiliate_id: affiliateId,
    p_status: status,
    p_notes: notes || null,
    p_code: code || null,
  });

  if (error) {
    const key = Object.keys(ERRORS).find((item) => error.message.includes(item));
    back(key ? ERRORS[key] : "error");
  }

  revalidatePath("/admin/affiliates");
  back(status === "ACTIVE" ? "approved" : "updated");
}
