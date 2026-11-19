import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HOME_PAGE } from "@/lib/cms/schema";

/**
 * Isi awal bagian Halaman Depan: teks yang sama dengan yang selama ini tampil
 * di website, supaya editornya langsung terisi dan hasil publiknya tidak berubah.
 */
const HOME_DEFAULTS: Record<string, Prisma.InputJsonValue> = {
  hero: {
    eyebrow: "Play • Learn • Grow",
    title: "Tempat anak belajar, bertumbuh, dan bermain bersama.",
    highlight: "bermain",
    description:
      "Aktivitas kreatif dan edukatif untuk anak usia 3–15 tahun di Jabodetabek. Satu hari penuh pengalaman baru — dari jadi pemadam cilik sampai membuat cokelat sendiri.",
    primaryCtaLabel: "Lihat Event",
    primaryCtaHref: "/event",
    secondaryCtaLabel: "Daftar Kelas",
    secondaryCtaHref: "/event",
    statValue: "Jabodetabek",
    statLabel: "Area kegiatan",
  },
  hero_slides: { mode: "auto", slides: [] },
  pillars: {
    eyebrow: "Yang diasah",
    title: "Empat kemampuan yang kami bangun",
    description:
      "Setiap kegiatan dirancang untuk melatih keempat hal ini sekaligus, tanpa terasa seperti pelajaran.",
  },
  events_teaser: {
    eyebrow: "Jadwal kegiatan",
    title: "Kelas yang bisa diikuti si kecil",
    description:
      "Pilih yang paling sesuai usia dan minat anak. Detail agenda, biaya, dan fasilitas ada di setiap halaman kelas.",
  },
  join_steps: {
    eyebrow: "Cara ikut",
    title: "Empat langkah sampai anak ikut kelas",
    description: "Pendaftaran dibuat sesederhana mungkin supaya orang tua tidak perlu bolak-balik bertanya.",
  },
  activities: {
    eyebrow: "Yang sudah kami jalankan",
    title: "Kegiatan yang sudah berjalan",
    description: "Dokumentasi kelas yang sudah kami selenggarakan bersama anak-anak dan mitra.",
    limit: 3,
  },
  gallery: {
    eyebrow: "Galeri",
    title: "Sekilas keseruan di kelas",
    description: "Momen yang sempat kami abadikan di beberapa kegiatan terakhir.",
    limit: 6,
  },
  testimonials: {
    eyebrow: "Cerita orang tua",
    title: "Cerita dari Ayah & Bunda",
    description: "Cerita langsung dari orang tua yang anaknya sudah ikut kelas bersama kami.",
  },
  social_feed: {
    eyebrow: "Update terbaru",
    title: "Ikuti keseruan Kelas Bermain",
    description: "Kabar kegiatan, pengumuman, dan dokumentasi kelas terbaru kami.",
    buttonLabel: "Lihat Semua Update",
    buttonHref: "/update",
    instagramUrl: "https://instagram.com/kelasbermain.id",
    limit: 6,
  },
  cta: {
    title: "Siap mencoba kelas pertama?",
    description: "Pilih kegiatan yang paling sesuai untuk si kecil, lalu daftar langsung dari halaman kelasnya.",
    buttonLabel: "Lihat Semua Event",
    buttonHref: "/event",
  },
};

/**
 * Database baru (misalnya di server hosting) hanya berisi tabel kosong, jadi
 * tab Halaman Depan di CMS tidak punya bagian untuk dipilih dan banner tidak
 * bisa diedit. Dibuat sekali kalau halaman ini belum punya satu bagian pun;
 * kalau sudah ada, tidak ada yang disentuh. Tidak perlu menyegarkan beranda:
 * tanpa baris pun, website sudah memakai isi bawaan yang sama.
 */
export async function ensureHomeSections(userId: string): Promise<void> {
  try {
    if ((await db.cms_sections.count({ where: { page_key: "home" } })) > 0) return;
    const now = new Date();
    await db.cms_sections.createMany({
      data: HOME_PAGE.sections.map((section, index) => ({
        page_key: "home",
        section_key: section.key,
        section_type: section.key,
        label: section.label,
        draft: HOME_DEFAULTS[section.key] ?? {},
        published: HOME_DEFAULTS[section.key] ?? {},
        published_at: now,
        sort_order: (index + 1) * 10,
        is_visible: true,
        updated_by: userId,
      })),
      skipDuplicates: true,
    });
  } catch {
    // Gagal di sini tidak boleh merusak halaman CMS; daftar bagian akan kosong seperti sebelumnya.
  }
}
