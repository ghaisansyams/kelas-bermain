"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { requireRole } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { confirmationMatches } from "@/lib/admin/delete-records";
import { moveCustomerToBin, purgeExpired } from "@/lib/admin/recycle-bin";

/**
 * Menghapus data orang.
 *
 * Penjaga, karena ini menghapus data sungguhan:
 *   1. Hanya SUPER_ADMIN.
 *   2. Teks yang diketik admin dicocokkan lagi di server dengan kode aslinya.
 *   3. Satu transaksi: pendaftaran beserta pembayaran, bukti transfer,
 *      kehadiran, sertifikat, voucher, dan catatan keuangannya dipindahkan
 *      ke Terhapus semuanya atau tidak sama sekali. Salinannya bisa
 *      dipulihkan selama 30 hari (lihat lib/admin/recycle-bin.ts).
 *   4. Setiap penghapusan dicatat di Activity Log beserta jumlah yang hilang.
 *
 * Dulu data yang punya pendaftaran ditolak dan hanya bisa dinonaktifkan.
 * Atas permintaan klien, sekarang boleh dihapus dengan konfirmasi ketik kode;
 * menonaktifkan tetap tersedia di halaman Detail.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Hitungan di dashboard, daftar, dan halaman publik ikut berubah. */
function revalidateAfterDelete() {
  for (const path of ["/admin", "/admin/customers", "/admin/children", "/admin/registrations", "/admin/payments", "/admin/finance"]) {
    revalidatePath(path);
  }
  revalidatePath("/event", "layout");
  revalidatePath("/register", "layout");
}

function back(path: string, status: string): never {
  redirect(`${path}?msg=${status}`);
}

export async function deleteCustomerAction(formData: FormData) {
  const session = await requireRole("SUPER_ADMIN");
  const id = String(formData.get("customerId") ?? "");
  if (!UUID.test(id)) back("/admin/customers", "error");

  let outcome = "deleted";
  try {
    const customer = await db.customers.findUnique({
      where: { id },
      select: { customer_number: true, full_name: true, whatsapp: true },
    });
    if (!customer) {
      outcome = "error";
    } else if (!confirmationMatches(formData.get("confirm"), customer.customer_number)) {
      // Pemeriksaan kedua di server: teks yang diketik harus sama dengan kode
      // aslinya, bukan dengan yang dikirim halaman.
      outcome = "wrong-confirm";
    } else {
      // Pendamping, anak-anaknya, dan seluruh pendaftarannya dipindahkan ke Terhapus.
      const details = await db.$transaction((tx) => moveCustomerToBin(tx, id, session.fullName), {
        timeout: 60_000,
      });
      await logActivity(
        "DELETE_CUSTOMER",
        "customers",
        customer.customer_number,
        {
          code: customer.customer_number,
          name: customer.full_name,
          whatsapp: customer.whatsapp,
          movedToBin: true,
          ...(details ?? {}),
        },
        null,
      );
      await purgeExpired();
    }
  } catch {
    outcome = "error";
  }

  if (outcome === "deleted") {
    revalidateAfterDelete();
    revalidatePath("/admin/trash");
  }
  back("/admin/customers", outcome);
}

export async function setCustomerStatusAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = String(formData.get("customerId") ?? "");
  const next = String(formData.get("next")) === "active" ? "active" : "inactive";
  if (!UUID.test(id)) back("/admin/customers", "error");

  let failed = false;
  try {
    await db.customers.update({ where: { id }, data: { status: next } });
    await logActivity("UPDATE_CUSTOMER", "customers", id, null, { status: next });
  } catch {
    failed = true;
  }
  if (failed) back("/admin/customers", "error");

  revalidatePath("/admin/customers");
  back("/admin/customers", next === "active" ? "activated" : "deactivated");
}
