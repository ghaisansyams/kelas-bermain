import "server-only";

import { cache } from "react";
import { db } from "@/lib/db";
import {
  BUILTIN_CATEGORIES,
  isCategoryTone,
  type CategoryDef,
} from "@/lib/utils/event-categories";

/**
 * Daftar kategori event, berurutan seperti yang diatur admin.
 *
 * Tabel kosong atau database tidak terjangkau memakai enam kategori awal,
 * sama seperti event yang punya katalog cadangan: halaman publik tidak boleh
 * kosong hanya karena satu tabel tidak terbaca.
 */
export const getEventCategories = cache(async (): Promise<CategoryDef[]> => {
  try {
    const rows = await db.event_categories.findMany({
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    });
    if (rows.length === 0) return BUILTIN_CATEGORIES;
    return rows.map((row) => ({
      name: row.name,
      tone: isCategoryTone(row.tone) ? row.tone : "neutral",
      imageUrl: row.image_url,
      imageAlt: row.image_alt,
    }));
  } catch {
    return BUILTIN_CATEGORIES;
  }
});
