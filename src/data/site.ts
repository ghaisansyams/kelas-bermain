/**
 * Global site configuration: identity, navigation, contact, and the numbers
 * shown on the landing page. An admin panel would edit this as "Site settings".
 *
 * Sourced from the @kelasbermain.id Instagram profile.
 *
 * Contact policy (PRD v2.0, KONF-01): the director's meeting notes asked for
 * NO phone number on the public site, but the team later asked for the
 * WhatsApp number in the contact box — the affiliate programme runs on it.
 * Until that is settled, the number ships behind `NEXT_PUBLIC_SHOW_WHATSAPP`
 * so either decision is a config change, not a code change.
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
  email: "kelasbermain.id@gmail.com",
  /** Shown only when NEXT_PUBLIC_SHOW_WHATSAPP is on — see KONF-01. */
  whatsapp: "081774918611",
  whatsappE164: "6281774918611",
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
      { href: "/affiliate", label: "Jadi Affiliator" },
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
  /** Empty when the channel has no usable URL yet. */
  href: string;
  icon: "instagram" | "whatsapp" | "mail" | "threads" | "tiktok" | "facebook";
  /** Gated behind NEXT_PUBLIC_SHOW_WHATSAPP — see KONF-01. */
  gated?: boolean;
}

const allSocialLinks: SocialLink[] = [
  {
    label: "Instagram",
    handle: "@kelasbermain.id",
    href: "https://instagram.com/kelasbermain.id",
    icon: "instagram",
  },
  {
    label: "WhatsApp",
    handle: siteConfig.whatsapp,
    href: `https://wa.me/${siteConfig.whatsappE164}`,
    icon: "whatsapp",
    gated: true,
  },
  {
    label: "Email",
    handle: siteConfig.email,
    href: `mailto:${siteConfig.email}`,
    icon: "mail",
  },
  {
    label: "Threads",
    handle: "@kelasbermain.id",
    href: "https://www.threads.net/@kelasbermain.id",
    icon: "threads",
  },
  {
    label: "TikTok",
    handle: "@kelasbermain.id",
    href: "https://www.tiktok.com/@kelasbermain.id",
    icon: "tiktok",
  },
  {
    // The team gave the page name but not its URL, and guessing one risks
    // linking to somebody else's page. Rendered as plain text until asked.
    label: "Facebook",
    handle: "Kelas Bermain",
    href: "",
    icon: "facebook",
  },
];

/** True only when the deployment has opted in to showing the phone number. */
export const showWhatsapp = process.env.NEXT_PUBLIC_SHOW_WHATSAPP === "true";

export const socialLinks: SocialLink[] = allSocialLinks.filter(
  (link) => !link.gated || showWhatsapp,
);

/*
 * The landing-page statistics block was removed in PRD v2.0 (R-05 / K-08).
 * The numbers that shipped here — "20+ kegiatan", "8 lokasi mitra",
 * "1.200+ anak" — were demo placeholders far above the real figures
 * (5 kegiatan since 2026), and the team asked for these not to be
 * published at all. Do not reintroduce without written approval.
 */

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
    title: "Datang & ikut kelasnya",
    description:
      "Hadir di lokasi, isi kehadiran lewat halaman event, lalu anak tinggal menikmati kegiatannya.",
  },
];
