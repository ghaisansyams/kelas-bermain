/**
 * Teks yang tampil di website kalau CMS belum mengisi apa pun. Dipakai dua
 * tempat: komponen publik sebagai cadangan, dan pembuatan isi awal CMS di
 * server baru. Karena sumbernya satu, isi awal CMS selalu sama persis dengan
 * yang sudah dilihat pengunjung.
 */

export interface HeadingDefaults {
  eyebrow: string;
  title: string;
  description: string;
}

export const PILLARS_HEADING: HeadingDefaults = {
  eyebrow: "Yang diasah",
  title: "Empat keterampilan yang diasah di setiap kegiatan",
  description:
    "Temanya berganti setiap pekan — memasak, bertani, mengenal profesi. Tapi empat hal ini selalu jadi tujuannya.",
};

export const EVENTS_TEASER_HEADING: HeadingDefaults = {
  eyebrow: "Jadwal kegiatan",
  title: "Kelas yang bisa diikuti si kecil",
  description:
    "Pilih yang paling sesuai usia dan minat anak. Detail agenda, biaya, dan fasilitas ada di setiap halaman kelas.",
};

export const JOIN_STEPS_HEADING: HeadingDefaults = {
  eyebrow: "Cara ikut",
  title: "Empat langkah, selesai dalam lima menit",
  description:
    "Pendaftaran dibuat sesederhana mungkin untuk Ayah dan Bunda. Tidak perlu membuat akun, tidak perlu mengunduh aplikasi.",
};

export const ACTIVITIES_HEADING: HeadingDefaults = {
  eyebrow: "Kegiatan terbaru",
  title: "Yang sudah kami jalankan",
  description:
    "Dokumentasi kelas yang sudah berlangsung — dari kebun di Tangerang Selatan sampai hangar pesawat di Jakarta.",
};

export const GALLERY_HEADING: HeadingDefaults = {
  eyebrow: "Galeri",
  title: "Sekilas keseruan di kelas",
  description: "Momen yang sempat kami abadikan di beberapa kegiatan terakhir.",
};

export const TESTIMONIALS_HEADING: HeadingDefaults = {
  eyebrow: "Kata orang tua",
  title: "Cerita dari Ayah & Bunda",
  description: "Video singkat dari orang tua peserta, direkam setelah kelas selesai.",
};

export const SOCIAL_FEED_DEFAULTS = {
  eyebrow: "Update terbaru",
  title: "Ikuti keseruan Kelas Bermain",
  description: "Kabar kegiatan, pengumuman, dan dokumentasi kelas terbaru kami.",
  buttonLabel: "Lihat Semua Update",
  buttonHref: "/update",
  instagramUrl: "https://instagram.com/kelasbermain.id",
  instagramLabel: "Lihat di Instagram",
};

export const CTA_DEFAULTS = {
  eyebrow: "Kuota terbatas",
  title: "Siap ikut kelas berikutnya?",
  description:
    "Pilih kelas yang sesuai usia anak, isi formulir singkat, selesaikan pembayaran, dan sampai jumpa di lokasi.",
  buttonLabel: "Daftar Kelas",
  buttonHref: "/event",
  secondaryLabel: "Lihat Galeri",
  secondaryHref: "/galeri",
};

/** Judul halaman-halaman lain (tab "Judul Halaman" di CMS). */
export const PAGE_HEADINGS: Record<string, HeadingDefaults> = {
  event: {
    eyebrow: "Agenda",
    title: "Jadwal Kelas Bermain",
    description: "Kelas satu hari untuk anak usia 3–15 tahun di Jabodetabek.",
  },
  kegiatan: {
    eyebrow: "Jejak kami",
    title: "Kegiatan Kelas Bermain",
    description: "Kelas yang sudah berlangsung.",
  },
  update: {
    eyebrow: "Update",
    title: "Update Kelas Bermain",
    description:
      "Postingan terbaru langsung dari Instagram Kelas Bermain — kegiatan, cerita, dan pengumuman kelas.",
  },
  sertifikat: {
    eyebrow: "Sertifikat",
    title: "Unduh sertifikat anak",
    description:
      "Masukkan nomor WhatsApp yang dipakai saat mendaftar, lalu nomor pendaftaran atau nama anak. Sertifikat yang sudah terbit bisa langsung diunduh sebagai PDF atau gambar.",
  },
  affiliate: {
    eyebrow: "Affiliate",
    title: "Dapat penghasilan tambahan, modal HP",
    description:
      "Bagikan kelas Kelas Bermain ke jaringanmu dengan kode pribadi. Setiap peserta yang mendaftar dan membayar memakai kodemu, kamu dapat komisi.",
  },
  cek_tiket: {
    eyebrow: "Cek Tiket",
    title: "Cek Status Pendaftaran",
    description:
      "Masukkan nomor pendaftaran dan kontak yang kamu pakai saat mendaftar untuk melihat apakah pembayarannya sudah berhasil atau masih menunggu.",
  },
};
