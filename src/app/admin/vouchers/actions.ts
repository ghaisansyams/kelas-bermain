"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function num(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function saveVoucherAction(formData: FormData) {
  await requireAdmin();
  const code = text(formData, "code").toUpperCase();
  const type = text(formData, "type") === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
  const value = num(formData, "value");
  const isEdit = text(formData, "isEdit") === "1";

  if (!code || !value || value <= 0) redirect("/admin/vouchers?status=invalid");
  if (type === "PERCENTAGE" && value > 100) redirect("/admin/vouchers?status=invalid");

  const payload = {
    code,
    description: text(formData, "description"),
    type,
    value,
    max_discount: type === "PERCENTAGE" ? num(formData, "maxDiscount") : null,
    max_uses: num(formData, "maxUses"),
    min_children: Math.max(1, num(formData, "minChildren") ?? 1),
    event_id: text(formData, "eventId") || null,
    valid_from: text(formData, "validFrom") || null,
    valid_until: text(formData, "validUntil") || null,
    status: text(formData, "status") === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("vouchers").upsert(payload, { onConflict: "code" });
  if (error) redirect("/admin/vouchers?status=error");

  await logActivity(isEdit ? "UPDATE_VOUCHER" : "CREATE_VOUCHER", "vouchers", code, null, payload);
  revalidatePath("/admin/vouchers");
  redirect(`/admin/vouchers?status=${isEdit ? "updated" : "created"}`);
}

export async function toggleVoucherAction(formData: FormData) {
  await requireAdmin();
  const code = text(formData, "code");
  const next = text(formData, "next") === "ACTIVE" ? "ACTIVE" : "INACTIVE";
  if (!code) redirect("/admin/vouchers?status=error");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("vouchers").update({ status: next }).eq("code", code);
  if (error) redirect("/admin/vouchers?status=error");

  await logActivity("UPDATE_VOUCHER", "vouchers", code, null, { status: next });
  revalidatePath("/admin/vouchers");
  redirect("/admin/vouchers?status=updated");
}

/**
 * Deleting is only offered while a voucher has never been used — a used
 * voucher stays on record (deactivate it instead) so the redemptions that
 * reference it keep their meaning.
 */
export async function deleteVoucherAction(formData: FormData) {
  await requireAdmin();
  const code = text(formData, "code");
  if (!code) redirect("/admin/vouchers?status=error");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("vouchers")
    .select("used_count")
    .eq("code", code)
    .maybeSingle();

  if (data && Number((data as { used_count: number }).used_count) > 0) {
    redirect("/admin/vouchers?status=used");
  }

  const { error } = await supabase.from("vouchers").delete().eq("code", code);
  if (error) redirect("/admin/vouchers?status=error");

  await logActivity("DELETE_VOUCHER", "vouchers", code, { code }, null);
  revalidatePath("/admin/vouchers");
  redirect("/admin/vouchers?status=deleted");
}
