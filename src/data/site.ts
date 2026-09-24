/**
 * Global site configuration: identity, navigation, contact, and the numbers
 * shown on the landing page. An admin panel would edit this as "Site settings".
 *
 * Sourced from the @kelasbermain.id Instagram profile.
 *
 * Note: the organisation deliberately publishes no phone number on this site —
 * a requirement from the meeting notes. Contact runs through email and social
 * media only, even though the Instagram bio lists a WhatsApp number.
 */

export const siteConfig = {
  name: "Kelas Bermain",
  shortName: "Kelas Bermain",
  legalName: "Kelas Bermain Anak | Jabodetabek",
  motto: "Play • Learn • Grow",
  tagline: "Tempat anak bermain, belajar, dan bertumbuh.",
  description:
    "Kelas Bermain menghadirkan aktivitas kreatif dan edukatif untuk anak usia 3–15 tahun di Jabodetabek — dari jadi pemadam cilik sampai membuat cokelat sendiri.",
  /** Overridden per-environment; falls back to the production domain. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://kelas-bermain.vercel.app",
  locale: "id-ID",
  /** Placeholder — replace with the organisation's real inbox. */
  email: "halo@kelasbermain.id",
  serviceArea: "Jabodetabek",
  ageRangeLabel: "3–15 tahun",
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
    title: "Jadwal",
    links: [
      { href: "/event?filter=upcoming", label: "Akan Datang" },
      { href: "/event?filter=ongoing", label: "Sedang Berlangsung" },
      { href: "/event?filter=past", label: "Sudah Selesai" },
      { href: "/kegiatan", label: "Dokumentasi Kegiatan" },
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
    handle: "@kelasbermain.id",
    href: "https://instagram.com/kelasbermain.id",
    icon: "instagram",
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
  { value: "20+", label: "Kegiatan terselenggara", detail: "Sepanjang 2026" },
  { value: "8", label: "Lokasi mitra", detail: "Tersebar di Jabodetabek" },
  { value: "1.200+", label: "Anak sudah ikut", detail: "Dari berbagai sekolah" },
  { value: "3–15", label: "Rentang usia peserta", detail: "Dibagi per kelompok umur" },
];

export interface Pillar {
  title: string;
  description: string;
  icon: "compass" | "sparkles" | "footprints" | "message";
  accent: "brand" | "pine" | "sun" | "grape" | "leaf" | "sky";
}

/** The four skills Kelas Bermain builds every activity around. */
export const pillars: Pillar[] = [
  {
    title: "Kemandirian",
    description:
      "Anak belajar memulai dan menyelesaikan aktivitasnya sendiri — dari memakai apron sampai merapikan alat setelah selesai.",
    icon: "compass",
    accent: "sky",
  },
  {
    title: "Keberanian",
    description:
      "Mencoba hal baru dan mengeksplorasi lingkungan yang belum pernah didatangi, dengan pendampingan yang membuat anak merasa aman.",
    icon: "sparkles",
    accent: "brand",
  },
  {
    title: "Motorik",
    description:
      "Bergerak, memanen, mengaduk, dan merakit. Aktivitas fisik yang melatih koordinasi tangan dan tubuh tanpa terasa seperti latihan.",
    icon: "footprints",
    accent: "leaf",
  },
  {
    title: "Komunikasi",
    description:
      "Kegiatan selalu dikerjakan berkelompok, sehingga anak terbiasa berbicara, bergantian, dan bekerja sama dengan teman baru.",
    icon: "message",
    accent: "grape",
  },
];

export interface ProcessStep {
  title: string;
  description: string;
}

export const joinSteps: ProcessStep[] = [
  {
    title: "Pilih kegiatan",
    description:
      "Lihat jadwal dan pilih aktivitas yang sesuai usia si kecil. Setiap halaman memuat agenda, lokasi, dan fasilitas.",
  },
  {
    title: "Isi formulir pendaftaran",
    description:
      "Lengkapi data anak dan orang tua. Kuota tiap kelas terbatas agar pendampingan tetap maksimal.",
  },
  {
    title: "Selesaikan pembayaran",
    description:
      "Transfer sesuai instruksi yang muncul setelah mendaftar, lalu tunggu konfirmasi dari tim kami.",
  },
  {
    title: "Datang & ambil sertifikat",
    description:
      "Hadir di lokasi, isi kehadiran lewat halaman event, dan e-sertifikat anak bisa langsung dilihat.",
  },
];
