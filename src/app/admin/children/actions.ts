"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { requireRole } from "@/lib/admin/auth";
import { db } from "@/lib/db";

/** Lihat catatan di customers/actions.ts — tiga penjaga yang sama berlaku. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function back(status: string): never {
  redirect(`/admin/children?msg=${status}`);
}

export async function deleteChildAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = String(formData.get("childId") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!UUID.test(id)) back("error");

  // Hitung ulang di sini, jangan percaya apa yang dirender halaman: halaman
  // yang basi bisa menawarkan hapus pada anak yang barusan didaftarkan.
  let outcome = "deleted";
  try {
    const registrations = await db.registrations.count({ where: { child_id: id } });
    if (registrations > 0) {
      outcome = "has-registrations";
    } else {
      await db.children.delete({ where: { id } });
      await logActivity("DELETE_CHILD", "children", code || id, { code }, null);
    }
  } catch {
    // Termasuk penolakan foreign key dari Postgres: penjaga ketiga bekerja.
    outcome = "error";
  }

  if (outcome === "deleted") {
    revalidatePath("/admin/children");
    revalidatePath("/admin/customers");
  }
  back(outcome);
}

export async function setChildStatusAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = String(formData.get("childId") ?? "");
  const next = String(formData.get("next")) === "active" ? "active" : "inactive";
  if (!UUID.test(id)) back("error");

  let failed = false;
  try {
    await db.children.update({ where: { id }, data: { status: next } });
    await logActivity("UPDATE_CHILD", "children", id, null, { status: next });
  } catch {
    failed = true;
  }
  if (failed) back("error");

  revalidatePath("/admin/children");
  back(next === "active" ? "activated" : "deactivated");
}
