"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, ImageOff, PackageOpen } from "lucide-react";
import {
  AdminPageHeader, DataTable, FilterBar, FilterSearch, FilterSelect,
  Panel, ResultCount, StatusBadge, type Column,
} from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/empty-state";
import { activities } from "@/data/activities";
import { galleryDrive, galleryItems } from "@/data/gallery";
import type { ActivityRecord, GalleryItem } from "@/lib/types";
import { formatDateShort } from "@/lib/utils/date";

/* ------------------------------ Activities ------------------------------ */

export function ActivitiesView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => [...new Set(activities.map((a) => a.category))].sort(),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activities.filter(
      (a) =>
        (!q || [a.title, a.slug, a.location.city].some((v) => v.toLowerCase().includes(q))) &&
        (category === "all" || a.category === category),
    );
  }, [query, category]);

  const columns: Column<ActivityRecord>[] = [
    {
      key: "title",
      header: "Kegiatan",
      render: (a) => (
        <div className="min-w-0">
          <p className="max-w-[16rem] truncate font-semibold text-ink">{a.title}</p>
          <p className="truncate font-mono text-[0.6875rem] text-muted">{a.slug}</p>
        </div>
      ),
    },
    { key: "category", header: "Kategori", render: (a) => <span className="text-xs">{a.category}</span> },
    { key: "date", header: "Tanggal", render: (a) => <span className="whitespace-nowrap text-xs text-muted">{formatDateShort(a.date)}</span> },
    { key: "city", header: "Lokasi", hideBelow: "md", render: (a) => <span className="text-xs text-muted">{a.location.city}</span> },
    { key: "participants", header: "Peserta", className: "text-center", render: (a) => <span className="tabular-nums">{a.participants}</span> },
    { key: "photos", header: "Foto", className: "text-center", hideBelow: "md", render: (a) => <span className="tabular-nums">{a.galleryIds.length}</span> },
    { key: "published", header: "Publikasi", render: (a) => <StatusBadge status={a.published ? "active" : "inactive"} /> },
    {
      key: "actions",
      header: "",
      render: (a) => (
        <a
          href={`/kegiatan/${a.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Buka halaman publik ${a.title}`}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-brand/40 hover:text-brand"
        >
          <ExternalLink className="size-4" aria-hidden />
        </a>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Kegiatan"
        description="Dokumentasi kegiatan yang tampil di halaman publik /kegiatan."
      />
      <FilterBar>
        <FilterSearch value={query} onChange={setQuery} placeholder="Judul, slug, kota…" />
        <FilterSelect
          label="Kategori"
          value={category}
          onChange={setCategory}
          options={[{ value: "all", label: "Semua" }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
      </FilterBar>
      <ResultCount shown={filtered.length} total={activities.length} noun="kegiatan" />
      <Panel>
        <DataTable
          rows={filtered}
          columns={columns}
          getKey={(a) => a.id}
          caption="Daftar kegiatan"
          empty={
            <EmptyState
              icon={<PackageOpen className="size-6" aria-hidden />}
              title="Tidak ada kegiatan"
              description="Coba ubah kata kunci atau kategori."
              className="border-none bg-transparent"
            />
          }
        />
      </Panel>
      <p className="mt-4 rounded-xl bg-canvas-deep/60 p-4 text-xs leading-relaxed text-muted">
        Versi ini menampilkan data kegiatan sebagai bacaan. Form tambah/ubah/hapus menyusul
        bersama backend — datanya sudah dinormalisasi di <code>src/data/activities.ts</code>{" "}
        dan dibaca lewat <code>lib/services/content.ts</code>.
      </p>
    </>
  );
}

/* -------------------------------- Gallery -------------------------------- */

export function GalleryView() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => [...new Set(galleryItems.map((g) => g.category))].sort(),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return galleryItems.filter(
      (g) =>
        (!q || [g.title, g.caption, g.id].some((v) => v.toLowerCase().includes(q))) &&
        (category === "all" || g.category === category),
    );
  }, [query, category]);

  const columns: Column<GalleryItem>[] = [
    {
      key: "image",
      header: "Foto",
      render: (g) => (
        <div className="relative size-12 overflow-hidden rounded-lg bg-canvas-deep">
          <Image src={g.image.src} alt={g.image.alt} fill sizes="48px" className="object-cover" />
        </div>
      ),
    },
    {
      key: "title",
      header: "Judul",
      render: (g) => (
        <div className="min-w-0">
          <p className="max-w-[14rem] truncate font-semibold text-ink">{g.title}</p>
          <p className="max-w-[14rem] truncate text-xs text-muted">{g.caption}</p>
        </div>
      ),
    },
    { key: "category", header: "Kategori", render: (g) => <span className="text-xs">{g.category}</span> },
    { key: "date", header: "Tanggal", hideBelow: "md", render: (g) => <span className="whitespace-nowrap text-xs text-muted">{formatDateShort(g.date)}</span> },
    {
      key: "relation",
      header: "Terkait",
      hideBelow: "lg",
      render: (g) =>
        g.eventSlug ? (
          <span className="text-xs text-muted">Event · {g.eventSlug}</span>
        ) : g.activitySlug ? (
          <Link href={`/kegiatan/${g.activitySlug}`} className="text-xs text-brand hover:underline">
            Kegiatan · {g.activitySlug}
          </Link>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    { key: "id", header: "ID", hideBelow: "lg", render: (g) => <span className="font-mono text-[0.6875rem] text-muted">{g.id}</span> },
  ];

  return (
    <>
      <AdminPageHeader
        title="Galeri"
        description="Foto yang dipakai halaman detail kegiatan. Halaman /galeri publik menautkan folder Google Drive."
      />

      <Panel className="mb-4" title="Folder Google Drive">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{galleryDrive.title}</p>
            <p className="mt-0.5 break-all font-mono text-xs text-muted">
              {galleryDrive.url || "Belum diatur"}
            </p>
          </div>
          {galleryDrive.url ? (
            <a
              href={galleryDrive.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-pill border border-line px-3.5 text-xs font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Buka Drive
            </a>
          ) : null}
        </div>
      </Panel>

      <FilterBar>
        <FilterSearch value={query} onChange={setQuery} placeholder="Judul, keterangan, id…" />
        <FilterSelect
          label="Kategori"
          value={category}
          onChange={setCategory}
          options={[{ value: "all", label: "Semua" }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
      </FilterBar>
      <ResultCount shown={filtered.length} total={galleryItems.length} noun="foto" />
      <Panel>
        <DataTable
          rows={filtered}
          columns={columns}
          getKey={(g) => g.id}
          caption="Daftar foto galeri"
          empty={
            <EmptyState
              icon={<ImageOff className="size-6" aria-hidden />}
              title="Tidak ada foto"
              description="Coba ubah kata kunci atau kategori."
              className="border-none bg-transparent"
            />
          }
        />
      </Panel>
      <p className="mt-4 rounded-xl bg-canvas-deep/60 p-4 text-xs leading-relaxed text-muted">
        Unggah dan hapus foto memerlukan penyimpanan objek (Supabase Storage / S3) yang belum
        terpasang. Struktur datanya sudah siap di <code>src/data/gallery.ts</code>.
      </p>
    </>
  );
}
