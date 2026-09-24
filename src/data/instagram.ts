import type { SocialPost } from "@/lib/types";

/**
 * Placeholder social feed.
 *
 * Deliberately static: nothing here scrapes Instagram or calls their API.
 * When an integration is approved, replace this array with the response of
 * `lib/services/social.ts#getSocialFeed` — the component contract stays the
 * same because it only consumes `SocialPost`.
 */
export const instagramPosts: SocialPost[] = [
  {
    id: "ig-01",
    image: { src: "/images/galeri-01.jpg", alt: "Peserta bersorak di penutupan kegiatan", width: 1200, height: 800 },
    caption: "Penutupan Temu Relawan Kuartal III. Sampai ketemu di kuartal berikutnya!",
    likes: 1284,
    comments: 63,
    permalink: "https://instagram.com/kelasbermain",
    postedAt: "2026-09-14",
  },
  {
    id: "ig-02",
    image: { src: "/images/galeri-10.jpg", alt: "Kelas pagi bersama murid sekolah dasar", width: 1200, height: 800 },
    caption: "Pagi ini di SDN Menteng 03. 120 murid, 3 sesi, 1 hari penuh.",
    likes: 976,
    comments: 41,
    permalink: "https://instagram.com/kelasbermain",
    postedAt: "2026-09-06",
  },
  {
    id: "ig-03",
    image: { src: "/images/galeri-08.jpg", alt: "Peserta merancang alat permainan dari barang bekas", width: 1200, height: 800 },
    caption: "Bermain tidak harus mahal. 50 alat permainan dari kardus dan botol bekas.",
    likes: 1533,
    comments: 88,
    permalink: "https://instagram.com/kelasbermain",
    postedAt: "2026-08-24",
  },
  {
    id: "ig-04",
    image: { src: "/images/galeri-13.jpg", alt: "Peserta mengangkat tangan di kegiatan luar ruang", width: 1200, height: 802 },
    caption: "Outdoor Day tahun ini: 9 pos, 210 pengunjung, 0 yang pulang tanpa main.",
    likes: 2104,
    comments: 117,
    permalink: "https://instagram.com/kelasbermain",
    postedAt: "2026-06-22",
  },
  {
    id: "ig-05",
    image: { src: "/images/galeri-17.jpg", alt: "Anak-anak di pojok baca yang baru dibuka", width: 1200, height: 953 },
    caption: "Hari pertama Pojok Baca Pesisir dibuka. 400+ buku sudah siap dibaca.",
    likes: 3218,
    comments: 204,
    permalink: "https://instagram.com/kelasbermain",
    postedAt: "2026-07-27",
  },
  {
    id: "ig-06",
    image: { src: "/images/galeri-15.jpg", alt: "Pengurus OSIS berdiskusi lintas sekolah", width: 1200, height: 800 },
    caption: "Leadership Circle: 12 sekolah, 40 pengurus OSIS, 2 program yang benar-benar jalan.",
    likes: 862,
    comments: 29,
    permalink: "https://instagram.com/kelasbermain",
    postedAt: "2026-05-31",
  },
];
