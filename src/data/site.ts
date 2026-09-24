/**
 * Global site configuration: identity, navigation, contact, and the numbers
 * shown on the landing page. An admin panel would edit this as "Site settings".
 *
 * Note: the organisation deliberately publishes no phone number. Contact runs
 * through email and social media only.
 */

export const siteConfig = {
  name: "Kelas Bermain",
  shortName: "Kelas Bermain",
  tagline: "Ruang untuk belajar, bertumbuh, dan bermain bersama.",
  description:
    "Kelas Bermain menghadirkan event, kegiatan, dan pengalaman seru yang dirancang untuk membangun kreativitas, keberanian, kolaborasi, dan koneksi.",
  /** Overridden per-environment; falls back to the production domain. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://kelas-bermain.vercel.app",
  locale: "id-ID",
  email: "halo@kelasbermain.id",
  address: {
    line1: "Rumah Komunitas Kemang",
    line2: "Jl. Kemang Selatan VIII No. 21",
    city: "Jakarta Selatan, 12730",
  },
  officeHours: "Senin – Jumat, 09.00 – 17.00 WIB",
} as const;

export interface NavLink {
  href: string;
  label: string;
}

export const mainNav: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/event", label: "Event" },
  { href: "/kegiatan", label: "Kegiatan" },
  { href: "/galeri", label: "Galeri" },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Jelajahi",
    links: [
      { href: "/event", label: "Semua Event" },
      { href: "/kegiatan", label: "Kegiatan" },
      { href: "/galeri", label: "Galeri" },
      { href: "/sertifikat", label: "Cek Sertifikat" },
    ],
  },
  {
    title: "Program",
    links: [
      { href: "/event?filter=upcoming", label: "Event Akan Datang" },
      { href: "/event?filter=ongoing", label: "Sedang Berlangsung" },
      { href: "/event?filter=past", label: "Event Selesai" },
      { href: "/kegiatan", label: "Program Komunitas" },
    ],
  },
];

export interface SocialLink {
  label: string;
  handle: string;
  href: string;
  icon: "instagram" | "youtube" | "mail" | "music";
}

export const socialLinks: SocialLink[] = [
  {
    label: "Instagram",
    handle: "@kelasbermain",
    href: "https://instagram.com/kelasbermain",
    icon: "instagram",
  },
  {
    label: "TikTok",
    handle: "@kelasbermain",
    href: "https://tiktok.com/@kelasbermain",
    icon: "music",
  },
  {
    label: "YouTube",
    handle: "Kelas Bermain",
    href: "https://youtube.com/@kelasbermain",
    icon: "youtube",
  },
  {
    label: "Email",
    handle: "halo@kelasbermain.id",
    href: "mailto:halo@kelasbermain.id",
    icon: "mail",
  },
];

export interface SiteStat {
  value: string;
  label: string;
  detail: string;
}

export const siteStats: SiteStat[] = [
  { value: "40+", label: "Kegiatan terselenggara", detail: "Sejak 2022" },
  { value: "12", label: "Kota terjangkau", detail: "Jawa & sekitarnya" },
  { value: "5.200", label: "Peserta terlibat", detail: "Pelajar, mahasiswa, komunitas" },
  { value: "68", label: "Relawan aktif", detail: "Tersebar di 5 kota" },
];

export interface Pillar {
  title: string;
  description: string;
  icon: "sparkles" | "shield" | "users" | "heart";
  accent: "brand" | "pine" | "sun" | "grape";
}

export const pillars: Pillar[] = [
  {
    title: "Kreativitas",
    description:
      "Ruang untuk mencoba ide sendiri, termasuk yang belum tentu berhasil. Gagal di sini tidak dihitung sebagai nilai merah.",
    icon: "sparkles",
    accent: "sun",
  },
  {
    title: "Keberanian",
    description:
      "Latihan kecil yang berulang: angkat tangan, ajukan pendapat, tampil di depan kelompok. Dimulai dari yang paling menakutkan.",
    icon: "shield",
    accent: "brand",
  },
  {
    title: "Kolaborasi",
    description:
      "Hampir semua kegiatan kami hanya bisa selesai kalau dikerjakan bersama. Itu bukan kebetulan — memang dirancang begitu.",
    icon: "users",
    accent: "pine",
  },
  {
    title: "Koneksi",
    description:
      "Peserta pulang membawa lebih dari materi. Banyak yang lanjut jadi relawan dan bertemu lagi di kegiatan berikutnya.",
    icon: "heart",
    accent: "grape",
  },
];

export interface ProcessStep {
  title: string;
  description: string;
}

export const joinSteps: ProcessStep[] = [
  {
    title: "Pilih event",
    description: "Telusuri daftar event dan buka detailnya untuk melihat agenda, lokasi, dan biaya.",
  },
  {
    title: "Isi pendaftaran",
    description: "Lengkapi formulir singkat. Untuk event gratis, pendaftaran langsung tercatat.",
  },
  {
    title: "Datang & isi kehadiran",
    description: "Tunjukkan ID pendaftaran saat hari-H, lalu isi kehadiran lewat halaman event.",
  },
  {
    title: "Ambil sertifikat",
    description: "Setelah kehadiran tercatat, sertifikat dengan nomor unik bisa langsung dilihat.",
  },
];
