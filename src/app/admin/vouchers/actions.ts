"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";

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
    valid_from: text(formData, "validFrom") ? new Date(text(formData, "validFrom")) : null,
    valid_until: text(formData, "validUntil") ? new Date(text(formData, "validUntil")) : null,
    status: text(formData, "status") === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  };

  let failed = false;
  try {
    // used_count tidak ada di payload: menyimpan ulang voucher yang sedang
    // dipakai tidak boleh mengembalikan hitungannya ke nol dan membuka kuota
    // yang sudah habis.
    await db.vouchers.upsert({ where: { code }, create: payload, update: payload });
    await logActivity(
      isEdit ? "UPDATE_VOUCHER" : "CREATE_VOUCHER",
      "vouchers",
      code,
      null,
      payload,
    );
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/vouchers?status=error");

  revalidatePath("/admin/vouchers");
  redirect(`/admin/vouchers?status=${isEdit ? "updated" : "created"}`);
}

export async function toggleVoucherAction(formData: FormData) {
  await requireAdmin();
  const code = text(formData, "code");
  const next = text(formData, "next") === "ACTIVE" ? "ACTIVE" : "INACTIVE";
  if (!code) redirect("/admin/vouchers?status=error");

  let failed = false;
  try {
    await db.vouchers.update({ where: { code }, data: { status: next } });
    await logActivity("UPDATE_VOUCHER", "vouchers", code, null, { status: next });
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/vouchers?status=error");

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

  let outcome = "deleted";
  try {
    const voucher = await db.vouchers.findUnique({ where: { code }, select: { used_count: true } });
    if (voucher && voucher.used_count > 0) {
      outcome = "used";
    } else {
      await db.vouchers.delete({ where: { code } });
      await logActivity("DELETE_VOUCHER", "vouchers", code, { code }, null);
    }
  } catch {
    // Termasuk penolakan foreign key kalau penebusan masih merujuk kode ini.
    outcome = "error";
  }
  if (outcome !== "deleted") redirect(`/admin/vouchers?status=${outcome}`);

  revalidatePath("/admin/vouchers");
  redirect("/admin/vouchers?status=deleted");
}
