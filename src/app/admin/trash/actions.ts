"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { requireRole } from "@/lib/admin/auth";
import { confirmationMatches } from "@/lib/admin/delete-records";
import { purgeEntry, restoreFromBin, purgeExpired } from "@/lib/admin/recycle-bin";
import { db } from "@/lib/db";

/**
 * Memulihkan atau membuang entri di Terhapus. Hanya SUPER_ADMIN, sama seperti
 * penghapusannya.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function back(params: Record<string, string>): never {
  redirect(`/admin/trash?${new URLSearchParams(params).toString()}`);
}

/** Semua halaman yang menampilkan data yang baru dipulihkan. */
function revalidateAfterRestore() {
  for (const path of [
    "/admin",
    "/admin/trash",
    "/admin/events",
    "/admin/customers",
    "/admin/children",
    "/admin/registrations",
    "/admin/payments",
    "/admin/attendance",
    "/admin/finance",
  ]) {
    revalidatePath(path);
  }
  revalidatePath("/");
  revalidatePath("/event", "layout");
  revalidatePath("/register", "layout");
}

export async function restoreBinEntryAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) back({ msg: "error" });

  const entry = await db.recycle_bin.findUnique({ where: { id }, select: { kind: true, label: true, code: true } });
  const result = await restoreFromBin(id);
  if (!result.ok) back({ msg: "restore-failed", note: result.error });

  await logActivity("RESTORE_" + (entry?.kind ?? "ITEM"), "recycle_bin", entry?.code || id, null, {
    name: entry?.label ?? "",
    note: result.message,
  });
  revalidateAfterRestore();
  back({ msg: "restored", note: result.message });
}

export async function purgeBinEntryAction(formData: FormData) {
  await requireRole("SUPER_ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) back({ msg: "error" });

  const entry = await db.recycle_bin.findUnique({ where: { id }, select: { kind: true, label: true, code: true } });
  if (!entry) back({ msg: "error" });
  if (!confirmationMatches(formData.get("confirm"), "HAPUS")) back({ msg: "wrong-confirm" });

  await purgeEntry(id);
  await logActivity("PURGE_" + entry.kind, "recycle_bin", entry.code || id, { name: entry.label }, null);
  await purgeExpired();
  revalidatePath("/admin/trash");
  back({ msg: "purged" });
}
