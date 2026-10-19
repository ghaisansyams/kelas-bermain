"use server";

import { unlink } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin/auth";
import { MEDIA_BUCKET } from "@/lib/admin/media";
import { MEDIA_DIR } from "@/lib/config/storage";
import { db } from "@/lib/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deleteMediaAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) redirect("/admin/media?status=error");

  let failed = false;
  try {
    // Jalur berkas dibaca dari BARIS di database, bukan dari isian formulir.
    // Formulir bisa diisi apa saja; kalau jalurnya dipercaya, "../../.env"
    // adalah cara menghapus berkas apa pun di server.
    const row = await db.media.findUnique({ where: { id }, select: { storage_path: true } });
    if (!row) throw new Error("not found");

    const root = resolve(MEDIA_DIR, MEDIA_BUCKET);
    const file = resolve(join(root, row.storage_path));
    if (!file.startsWith(root + sep)) throw new Error("path");

    // Baris dihapus lebih dulu. Kalau berkasnya yang gagal dihapus, yang tersisa
    // hanya berkas yatim di disk — bukan baris di Pustaka yang menunjuk ke
    // gambar yang sudah tidak ada.
    await db.media.delete({ where: { id } });
    await unlink(file).catch(() => {});

    await db.activity_logs.create({
      data: {
        user_id: session.userId,
        action: "DELETE",
        entity: "media",
        entity_id: id,
        old_value: { storagePath: row.storage_path },
        new_value: Prisma.DbNull,
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/media?status=error");

  revalidatePath("/admin/media");
  redirect("/admin/media?status=deleted");
}

export async function updateAltTextAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const altText = String(formData.get("altText") ?? "").trim();
  if (!UUID.test(id)) redirect("/admin/media?status=error");

  let failed = false;
  try {
    await db.media.update({ where: { id }, data: { alt_text: altText } });
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/media?status=error");

  revalidatePath("/admin/media");
  redirect("/admin/media?status=saved");
}
