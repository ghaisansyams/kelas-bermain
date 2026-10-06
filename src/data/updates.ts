import type { ImageAsset, UpdateCategory, UpdateStatus } from "@/lib/types";

/**
 * Raw media as the Instagram source hands it over — the field names follow
 * the Instagram Graph API media object (`media_url`, `permalink`, `timestamp`,
 * `caption`) so a real adapter can return the same shape. `category` and
 * `status` are not Instagram fields; they're curated on our side, and will
 * come from an admin tool later.
 *
 * Mock only. `permalink` points at the account's profile, not at a specific
 * post, because these posts don't exist on Instagram — pointing at a made-up
 * post ID would send visitors to the wrong page.
 */
export interface RawInstagramMedia {
  id: string;
  slug: string;
  username: string;
  permalink: string;
  media_url: ImageAsset;
  caption: string;
  excerpt: string;
  title: string;
  /** YYYY-MM-DD */
  timestamp: string;
  category: UpdateCategory;
  status: UpdateStatus;
}

const PROFILE_URL = "https://www.instagram.com/kelasbermain.id/";

export const mockInstagramMedia: RawInstagramMedia[] = [
  {
    id: "update-001",
    slug: "keseruan-decorate-mini-cake",
    username: "@kelasbermain.id",
    permalink: PROFILE_URL,
    media_url: {
      src: "/images/galeri-14.jpg",
      alt: "Kue bundar yang sudah dihias krim dan topping oleh peserta",
      width: 1200,
      height: 800,
    },
    title: "Keseruan Decorate Mini Cake hari ini",
    caption:
      "Hari ini si kecil jadi mini chef! Dari pasang apron sampai menaburkan topping, semua cake dihias sendiri dari awal. Pulangnya bawa cake masing-masing. Terima kasih para mini chef!",
    excerpt:
      "Hari ini si kecil jadi mini chef! Semua cake dihias sendiri dari awal dan dibawa pulang.",
    timestamp: "2026-10-05",
    category: "Kegiatan",
    status: "PUBLISHED",
  },
  {
    id: "update-002",
    slug: "open-house-18-oktober",
    username: "@kelasbermain.id",
    permalink: PROFILE_URL,
    media_url: {
      src: "/images/galeri-01.jpg",
      alt: "Tiga anak tertawa bersama di sesi perkenalan Open House",
      width: 1200,
      height: 800,
    },
    title: "Open House 18 Oktober, gratis!",
    caption:
      "Belum yakin mau ikut kelas yang mana? Coba dulu di Open House gratis, 90 menit di Depok. Anak cobain dua pos aktivitas, orang tua bisa ngobrol langsung sama kakak pembina. Kuota terbatas, maksimal dua anak per keluarga.",
    excerpt:
      "Coba dulu kelas kami gratis selama 90 menit di Depok. Kuota terbatas, daftar sekarang.",
    timestamp: "2026-10-02",
    category: "Event",
    status: "PUBLISHED",
  },
  {
    id: "update-003",
    slug: "pemadam-cilik-oktober-recap",
    username: "@kelasbermain.id",
    permalink: PROFILE_URL,
    media_url: {
      src: "/images/event-pemadam-cilik.jpg",
      alt: "Poster kelas Pemadam Cilik dengan ilustrasi mobil damkar",
      width: 1600,
      height: 1000,
    },
    title: "Recap Pemadam Cilik: naik mobil damkar!",
    caption:
      "Keliling naik mobil damkar, pegang selang, dan belajar cara Om Damkar bekerja. Sesi yang paling ditunggu semua anak. Terima kasih Pos Damkar Cinere sudah menyambut kami.",
    excerpt:
      "Keliling naik mobil damkar dan pegang selang, sesi yang paling ditunggu anak-anak.",
    timestamp: "2026-09-28",
    category: "Dokumentasi",
    status: "PUBLISHED",
  },
  {
    id: "update-004",
    slug: "little-farmer-panen-pertama",
    username: "@kelasbermain.id",
    permalink: PROFILE_URL,
    media_url: {
      src: "/images/galeri-13.jpg",
      alt: "Aneka sayuran hasil panen peserta Little Farmer",
      width: 1200,
      height: 800,
    },
    title: "Panen pertama Little Farmer",
    caption:
      "Biar anak nggak cuma tahu sayuran dari piring. Mereka menanam, menyiram, lalu memanen sendiri. Ada yang langsung minta dimasakkan sayur hasil panennya sendiri.",
    excerpt:
      "Anak menanam, menyiram, lalu memanen sendiri. Sayurnya langsung habis dimasak bersama.",
    timestamp: "2026-09-22",
    category: "Kegiatan",
    status: "PUBLISHED",
  },
  {
    id: "update-005",
    slug: "cocoa-maker-november-dibuka",
    username: "@kelasbermain.id",
    permalink: PROFILE_URL,
    media_url: {
      src: "/images/galeri-18.jpg",
      alt: "Potongan cokelat batang di atas meja kayu",
      width: 1200,
      height: 800,
    },
    title: "Pendaftaran Cocoa Maker November dibuka",
    caption:
      "Kiddos tahu nggak? Cokelat ternyata berasal dari buah kakao lho! Di Cocoa Maker, anak belajar dari biji kakao sampai jadi cokelat sendiri. Kuota 35 anak, daftar sebelum penuh.",
    excerpt:
      "Dari biji kakao sampai jadi cokelat sendiri. Kuota 35 anak, pendaftaran sudah dibuka.",
    timestamp: "2026-09-18",
    category: "Pengumuman",
    status: "PUBLISHED",
  },
  {
    id: "update-006",
    slug: "hangar-explore-jakarta",
    username: "@kelasbermain.id",
    permalink: PROFILE_URL,
    media_url: {
      src: "/images/galeri-20.jpg",
      alt: "Sayap pesawat terlihat dari jendela saat terbang",
      width: 1200,
      height: 800,
    },
    title: "Momen seru Hangar Explore",
    caption:
      "Lihat pesawat dari jarak paling dekat, masuk ke kabin, dan kenalan sama dunia penerbangan. Terima kasih mitra hangar yang sudah mengajak kami keliling.",
    excerpt: "Lihat pesawat dari jarak paling dekat dan masuk ke kabin pesawat.",
    timestamp: "2026-09-15",
    category: "Dokumentasi",
    status: "PUBLISHED",
  },
  {
    id: "update-007",
    slug: "behind-the-scenes-persiapan-kelas",
    username: "@kelasbermain.id",
    permalink: PROFILE_URL,
    media_url: {
      src: "/images/galeri-09.jpg",
      alt: "Tangan menyusun menara dari balok kayu berwarna",
      width: 1200,
      height: 800,
    },
    title: "Behind the scenes: sebelum kelas dimulai",
    caption:
      "Sebelum anak datang, tim sudah menyiapkan bahan, mengecek alat, dan membagi kelompok sesuai usia. Hal-hal kecil ini yang bikin hari kelas berjalan lancar.",
    excerpt:
      "Menyiapkan bahan, mengecek alat, dan membagi kelompok sesuai usia sebelum kelas dimulai.",
    timestamp: "2026-09-10",
    category: "Dokumentasi",
    status: "PUBLISHED",
  },
  {
    id: "update-008",
    slug: "pottery-class-karya-pertama",
    username: "@kelasbermain.id",
    permalink: PROFILE_URL,
    media_url: {
      src: "/images/galeri-04.jpg",
      alt: "Anak-anak berkarya di meja prakarya",
      width: 1200,
      height: 800,
    },
    title: "Karya pertama dari Pottery Class",
    caption:
      "Tangan kotor, hasil dibawa pulang. Pottery Class edisi perdana bikin anak-anak bangga sama karyanya sendiri. Mulai dari pinch pot sampai bentuk bebas.",
    excerpt:
      "Tangan kotor, hasil dibawa pulang. Pottery Class edisi perdana berjalan seru.",
    timestamp: "2026-08-24",
    category: "Kegiatan",
    status: "PUBLISHED",
  },
];
