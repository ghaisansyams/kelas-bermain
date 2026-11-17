"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { CATEGORY_NAME_MAX, isCategoryTone } from "@/lib/utils/event-categories";

/**
 * Mengelola kategori event. Nama kategori disalin ke tiap event
 * (`events.category`), jadi mengganti nama ikut memperbarui event-nya, dan
 * kategori yang masih dipakai tidak boleh dihapus.
 */

function back(status: string, note?: string): never {
  const params = new URLSearchParams({ status });
  if (note) params.set("note", note);
  redirect(`/admin/events/kategori?${params.toString()}`);
}

/** Halaman publik dan admin yang menampilkan kategori. */
function revalidateCategories() {
  revalidatePath("/");
  revalidatePath("/event", "layout");
  revalidatePath("/register", "layout");
  revalidatePath("/admin/events", "layout");
}

function cleanName(value: FormDataEntryValue | null): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function cleanImage(value: FormDataEntryValue | null): string {
  const url = String(value ?? "").trim();
  // Hanya berkas dari media website atau gambar bawaan, bukan alamat sembarang.
  return url.startsWith("/") && !url.startsWith("//") ? url : "";
}

export async function createCategoryAction(formData: FormData) {
  await requireAdmin();
  const name = cleanName(formData.get("name"));
  const tone = String(formData.get("tone") ?? "neutral");
  if (name.length < 2) back("invalid");
  if (name.length > CATEGORY_NAME_MAX) back("too-long");

  let outcome = "created";
  try {
    const existing = await db.event_categories.findMany({ select: { name: true, sort_order: true } });
    if (existing.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
      outcome = "duplicate";
    } else {
      await db.event_categories.create({
        data: {
          name,
          tone: isCategoryTone(tone) ? tone : "neutral",
          image_url: cleanImage(formData.get("imageUrl")),
          image_alt: cleanName(formData.get("imageAlt")),
          sort_order: Math.max(0, ...existing.map((row) => row.sort_order)) + 1,
        },
      });
      await logActivity("CREATE_EVENT_CATEGORY", "event_categories", name, null, { name, tone });
    }
  } catch {
    outcome = "error";
  }
  if (outcome === "created") revalidateCategories();
  back(outcome, name);
}

export async function updateCategoryAction(formData: FormData) {
  await requireAdmin();
  const original = cleanName(formData.get("original"));
  const name = cleanName(formData.get("name"));
  const tone = String(formData.get("tone") ?? "neutral");
  if (!original) back("error");
  if (name.length < 2) back("invalid");
  if (name.length > CATEGORY_NAME_MAX) back("too-long");

  let outcome = "updated";
  try {
    const all = await db.event_categories.findMany({ select: { name: true } });
    if (!all.some((row) => row.name === original)) {
      outcome = "error";
    } else if (name !== original && all.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
      outcome = "duplicate";
    } else {
      await db.$transaction(async (tx) => {
        await tx.event_categories.update({
          where: { name: original },
          data: {
            // Nama adalah kunci utama, jadi pergantian nama dilakukan lewat
            // pembaruan kunci, lalu event yang memakainya ikut disesuaikan.
            name,
            tone: isCategoryTone(tone) ? tone : "neutral",
            image_url: cleanImage(formData.get("imageUrl")),
            image_alt: cleanName(formData.get("imageAlt")),
          },
        });
        if (name !== original) {
          await tx.events.updateMany({ where: { category: original }, data: { category: name } });
        }
      });
      await logActivity("UPDATE_EVENT_CATEGORY", "event_categories", original, { name: original }, { name, tone });
    }
  } catch {
    outcome = "error";
  }
  if (outcome === "updated") revalidateCategories();
  back(outcome, name);
}

export async function moveCategoryAction(formData: FormData) {
  await requireAdmin();
  const name = cleanName(formData.get("name"));
  const direction = String(formData.get("direction")) === "up" ? -1 : 1;

  try {
    const rows = await db.event_categories.findMany({ orderBy: [{ sort_order: "asc" }, { name: "asc" }] });
    const index = rows.findIndex((row) => row.name === name);
    const swap = index + direction;
    if (index === -1 || swap < 0 || swap >= rows.length) back("moved");

    // Urutan dituliskan ulang 1..n supaya nomor yang kembar tidak membuat
    // tombol naik-turun tampak tidak bekerja.
    const order = rows.map((row) => row.name);
    [order[index], order[swap]] = [order[swap], order[index]];
    await db.$transaction(
      order.map((categoryName, position) =>
        db.event_categories.update({ where: { name: categoryName }, data: { sort_order: position + 1 } }),
      ),
    );
  } catch (error) {
    // redirect() melempar; biarkan lewat.
    if (error && typeof error === "object" && "digest" in error) throw error;
    back("error");
  }
  revalidateCategories();
  back("moved");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();
  const name = cleanName(formData.get("name"));
  if (!name) back("error");

  let outcome = "deleted";
  try {
    const used = await db.events.count({ where: { category: name } });
    if ((await db.event_categories.count()) <= 1) {
      // Form event butuh minimal satu pilihan.
      outcome = "last";
    } else if (used > 0) {
      // Server memeriksa ulang; tombol yang dinonaktifkan di halaman bukan pengaman.
      outcome = "in-use";
    } else {
      await db.event_categories.delete({ where: { name } });
      await logActivity("DELETE_EVENT_CATEGORY", "event_categories", name, { name }, null);
    }
  } catch {
    outcome = "error";
  }
  if (outcome === "deleted") revalidateCategories();
  back(outcome, name);
}
