"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { requireRole } from "@/lib/admin/auth";
import { db } from "@/lib/db";

/**
 * Menghapus data orang.
 *
 * Tiga penjaga, karena ini menghapus data sungguhan:
 *   1. Hanya SUPER_ADMIN.
 *   2. Aksi ini menghitung ulang pendaftaran di sini — pemeriksaan di tampilan
 *      tidak pernah dipercaya, sebab halaman yang basi bisa menawarkan hapus
 *      pada baris yang barusan mendaftar.
 *   3. Database memakai ON DELETE RESTRICT pada pendaftaran dan pembayaran,
 *      jadi kalau dua pemeriksaan di atas keliru pun, Postgres menolak.
 *      Diperiksa langsung: aturan itu sama persis dengan database asal.
 *
 * Kalau sebuah data tidak bisa dihapus, yang ditawarkan menonaktifkannya:
 * riwayat tetap utuh dan barisnya berhenti muncul di daftar aktif.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function back(path: string, status: string): never {
  redirect(`${path}?msg=${status}`);
}

export async function deleteCustomerAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = String(formData.get("customerId") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!UUID.test(id)) back("/admin/customers", "error");

  let outcome = "deleted";
  try {
    const registrations = await db.registrations.count({ where: { customer_id: id } });
    if (registrations > 0) {
      outcome = "has-registrations";
    } else {
      // Anak ikut terhapus bersama induknya (CASCADE), jadi catat berapa
      // banyak yang ikut hilang.
      const childCount = await db.children.count({ where: { customer_id: id } });
      await db.customers.delete({ where: { id } });
      await logActivity(
        "DELETE_CUSTOMER",
        "customers",
        code || id,
        { code, childrenDeleted: childCount },
        null,
      );
    }
  } catch {
    outcome = "error";
  }

  if (outcome === "deleted") {
    revalidatePath("/admin/customers");
    revalidatePath("/admin/children");
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
