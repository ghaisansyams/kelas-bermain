"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireRole } from "@/lib/admin/auth";
import { asAdmin } from "@/lib/admin/actor";

/**
 * Aksi yang memindahkan uang. Semuanya memanggil fungsi database yang
 * memperbarui pembayaran, pendaftaran, dan buku keuangan dalam satu transaksi,
 * jadi ketiganya tidak pernah bisa berselisih.
 *
 * redirect() melempar pengecualian internal Next untuk berpindah halaman, jadi
 * tidak boleh dipanggil di dalam try/catch — pengecualiannya akan tertelan dan
 * pengguna melihat "berhasil" padahal tidak berpindah ke mana-mana. Karena itu
 * hasil disimpan dulu, redirect-nya belakangan.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function confirmPaymentAction(formData: FormData) {
  const session = await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  const method = String(formData.get("method") ?? "");
  if (!UUID.test(paymentId)) redirect("/admin/payments?status=error");

  let failed = false;
  try {
    await asAdmin(session, (tx) =>
      tx.$executeRaw`select admin_confirm_payment(${paymentId}::uuid, ${method || null}, ${null})`,
    );
  } catch {
    failed = true;
  }

  if (failed) redirect("/admin/payments?status=error");

  revalidatePath("/admin/payments");
  revalidatePath("/admin/finance");
  revalidatePath("/admin");
  redirect("/admin/payments?status=confirmed");
}

/** Membalik pembayaran yang sudah lunas hanya untuk SUPER_ADMIN, dan selalu butuh alasan. */
export async function refundPaymentAction(formData: FormData) {
  const session = await requireRole("SUPER_ADMIN");
  const paymentId = String(formData.get("paymentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!UUID.test(paymentId) || !reason) redirect("/admin/payments?status=error");

  let failed = false;
  try {
    await asAdmin(session, (tx) =>
      tx.$executeRaw`select admin_refund_payment(${paymentId}::uuid, ${reason})`,
    );
  } catch {
    failed = true;
  }

  if (failed) redirect("/admin/payments?status=error");

  revalidatePath("/admin/payments");
  revalidatePath("/admin/finance");
  revalidatePath("/admin");
  redirect("/admin/payments?status=refunded");
}

/**
 * Rejects a proof of transfer. Never a silent revert to PENDING: the reason is
 * required so the registrant is told what to fix, and it shows up on
 * /cek-tiket.
 */
export async function rejectPaymentAction(formData: FormData) {
  const session = await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!UUID.test(paymentId) || !reason) redirect("/admin/payments?status=error");

  let failed = false;
  try {
    await asAdmin(session, (tx) =>
      tx.$executeRaw`select admin_reject_payment(${paymentId}::uuid, ${reason})`,
    );
  } catch {
    failed = true;
  }

  if (failed) redirect("/admin/payments?status=error");

  revalidatePath("/admin/payments");
  redirect("/admin/payments?status=rejected");
}
