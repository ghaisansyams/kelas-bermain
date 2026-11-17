"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { requireRole } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { confirmationMatches } from "@/lib/admin/delete-records";
import { moveChildToBin, purgeExpired } from "@/lib/admin/recycle-bin";

/** Lihat catatan di customers/actions.ts — penjaga yang sama berlaku. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function back(status: string): never {
  redirect(`/admin/children?msg=${status}`);
}

export async function deleteChildAction(formData: FormData) {
  const session = await requireRole("SUPER_ADMIN");
  const id = String(formData.get("childId") ?? "");
  if (!UUID.test(id)) back("error");

  let outcome = "deleted";
  try {
    const child = await db.children.findUnique({
      where: { id },
      select: { child_number: true, full_name: true, customer_id: true },
    });
    if (!child) {
      outcome = "error";
    } else if (!confirmationMatches(formData.get("confirm"), child.child_number)) {
      outcome = "wrong-confirm";
    } else {
      const stats = await db.$transaction((tx) => moveChildToBin(tx, id, session.fullName), {
        timeout: 60_000,
      });
      await logActivity(
        "DELETE_CHILD",
        "children",
        child.child_number,
        { code: child.child_number, name: child.full_name, movedToBin: true, ...(stats ?? {}) },
        null,
      );
      await purgeExpired();
    }
  } catch {
    outcome = "error";
  }

  if (outcome === "deleted") {
    for (const path of ["/admin", "/admin/children", "/admin/customers", "/admin/registrations", "/admin/payments", "/admin/finance", "/admin/trash"]) {
      revalidatePath(path);
    }
    revalidatePath("/event", "layout");
    revalidatePath("/register", "layout");
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
