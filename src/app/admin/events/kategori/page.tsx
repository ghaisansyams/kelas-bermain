import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  createCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
  updateCategoryAction,
} from "@/app/admin/events/kategori/actions";
import { Notice, PageHeader } from "@/components/admin/admin-ui";
import { CategoryManager, type CategoryRow } from "@/components/admin/category-manager";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { getEventCategories } from "@/lib/services/event-categories";
import { CATEGORY_NAME_MAX } from "@/lib/utils/event-categories";

export const dynamic = "force-dynamic";

export default async function AdminEventCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; note?: string }>;
}) {
  await requireAdmin();
  const { status, note } = await searchParams;

  const categories = await getEventCategories();
  let counts = new Map<string, number>();
  try {
    const grouped = await db.events.groupBy({ by: ["category"], _count: { _all: true } });
    counts = new Map(grouped.map((row) => [row.category, row._count._all]));
  } catch {
    /* hitungan kosong; tombol Hapus tetap diperiksa lagi di server */
  }

  const rows: CategoryRow[] = categories.map((item) => ({
    name: item.name,
    tone: item.tone,
    imageUrl: item.imageUrl,
    imageAlt: item.imageAlt,
    used: counts.get(item.name) ?? 0,
  }));

  const notices: Record<string, { tone: "success" | "error"; text: string }> = {
    created: { tone: "success", text: `Kategori "${note}" ditambahkan. Sekarang bisa dipilih di form event.` },
    updated: { tone: "success", text: `Kategori "${note}" disimpan. Event yang memakainya ikut diperbarui.` },
    deleted: { tone: "success", text: `Kategori "${note}" dihapus.` },
    moved: { tone: "success", text: "Urutan diperbarui. Ini juga urutan tombol filter di halaman Event." },
    duplicate: { tone: "error", text: `Sudah ada kategori bernama "${note}".` },
    "in-use": { tone: "error", text: `Kategori "${note}" masih dipakai event, jadi tidak dihapus. Pindahkan event itu ke kategori lain dulu.` },
    last: { tone: "error", text: "Kategori terakhir tidak bisa dihapus. Form event butuh minimal satu pilihan." },
    invalid: { tone: "error", text: "Nama kategori minimal 2 huruf." },
    "too-long": { tone: "error", text: `Nama kategori maksimal ${CATEGORY_NAME_MAX} huruf.` },
    error: { tone: "error", text: "Aksi gagal. Coba lagi." },
  };
  const notice = status ? notices[status] : undefined;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke daftar event
      </Link>

      <PageHeader
        title="Kategori Event"
        description="Kategori muncul di form event, lencana pada kartu event, dan tombol filter di halaman Event. Kategori baru langsung bisa dipakai."
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <CategoryManager
        rows={rows}
        createAction={createCategoryAction}
        updateAction={updateCategoryAction}
        moveAction={moveCategoryAction}
        deleteAction={deleteCategoryAction}
      />
    </div>
  );
}
