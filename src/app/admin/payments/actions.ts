"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireRole } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Money-moving actions. Both call SQL functions that update the payment, the
 * registration and the finance ledger in one transaction — see
 * supabase/erp-schema.sql — so the three can never drift apart.
 */

export async function confirmPaymentAction(formData: FormData) {
  await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  const method = String(formData.get("method") ?? "");
  if (!paymentId) redirect("/admin/payments?status=error");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_confirm_payment", {
    p_payment_id: paymentId,
    p_method: method || null,
    p_notes: null,
  });

  if (error) redirect("/admin/payments?status=error");

  revalidatePath("/admin/payments");
  revalidatePath("/admin/finance");
  revalidatePath("/admin");
  redirect("/admin/payments?status=confirmed");
}

/** Reversing a settled payment is SUPER_ADMIN only and always needs a reason. */
export async function refundPaymentAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const paymentId = String(formData.get("paymentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!paymentId || !reason) redirect("/admin/payments?status=error");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_refund_payment", {
    p_payment_id: paymentId,
    p_reason: reason,
  });

  if (error) redirect("/admin/payments?status=error");

  revalidatePath("/admin/payments");
  revalidatePath("/admin/finance");
  revalidatePath("/admin");
  redirect("/admin/payments?status=refunded");
}
