"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { asAdmin } from "@/lib/admin/actor";

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
  const session = await requireAdmin();
  const affiliateId = String(formData.get("affiliateId") ?? "");
  const status = String(formData.get("status") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!affiliateId || !status) back("error");

  // Hasil disimpan dulu: redirect() melempar pengecualian internal, dan di
  // dalam try/catch ia tertelan sehingga admin melihat "berhasil" yang
  // sebenarnya tidak membawa ke mana-mana.
  let failure: string | null = null;
  try {
    await asAdmin(
      session,
      (tx) =>
        tx.$executeRaw`select admin_set_affiliate_status(${affiliateId}::uuid, ${status}, ${notes || null}, ${code || null})`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const key = Object.keys(ERRORS).find((item) => message.includes(item));
    failure = key ? ERRORS[key] : "error";
  }
  if (failure) back(failure);

  revalidatePath("/admin/affiliates");
  back(status === "ACTIVE" ? "approved" : "updated");
}
