import type { SocialPost } from "@/lib/types";

/**
 * Placeholder social feed for @kelasbermain.id.
 *
 * Deliberately static: nothing here scrapes Instagram or calls their API.
 * When an official integration is approved, replace this array with the
 * response of a social service — the component contract stays the same
 * because it only consumes `SocialPost`.
 */
export const instagramPosts: SocialPost[] = [
  {
    id: "ig-01",
    image: { src: "/images/galeri-14.jpg", alt: "Kue kecil yang sudah dihias peserta", width: 1200, height: 800 },
    caption: "SATU HARI, SATU CAKE, BANYAK KESERUAN! Si kecil siap jadi mini chef.",
    likes: 412,
    comments: 37,
    permalink: "https://instagram.com/kelasbermain.id",
    postedAt: "2026-09-22",
  },
  {
    id: "ig-02",
    image: { src: "/images/galeri-13.jpg", alt: "Aneka sayuran hasil panen peserta", width: 1200, height: 800 },
    caption: "Biar anak nggak cuma tahu sayuran dari piring. Little Farmer, panen sendiri!",
    likes: 538,
    comments: 44,
    permalink: "https://instagram.com/kelasbermain.id",
    postedAt: "2026-09-14",
  },
  {
    id: "ig-03",
    image: { src: "/images/galeri-18.jpg", alt: "Potongan cokelat batang di atas meja", width: 1200, height: 800 },
    caption: "Kiddos tahu nggak? Cokelat ternyata berasal dari buah kakao lho!",
    likes: 366,
    comments: 29,
    permalink: "https://instagram.com/kelasbermain.id",
    postedAt: "2026-09-07",
  },
  {
    id: "ig-04",
    image: { src: "/images/galeri-20.jpg", alt: "Sayap pesawat terlihat dari jendela", width: 1200, height: 800 },
    caption: "Momen seru Hangar Explore — lihat pesawat dari jarak paling dekat.",
    likes: 604,
    comments: 51,
    permalink: "https://instagram.com/kelasbermain.id",
    postedAt: "2026-09-15",
  },
  {
    id: "ig-05",
    image: { src: "/images/galeri-04.jpg", alt: "Anak-anak berkarya di meja prakarya", width: 1200, height: 800 },
    caption: "Tangan kotor, hasil dibawa pulang. Pottery Class edisi perdana!",
    likes: 288,
    comments: 22,
    permalink: "https://instagram.com/kelasbermain.id",
    postedAt: "2026-08-24",
  },
  {
    id: "ig-06",
    image: { src: "/images/galeri-09.jpg", alt: "Menara balok kayu yang disusun anak-anak", width: 1200, height: 800 },
    caption: "Memeriahkan HUT RI — lomba 17 Agustusan bersama Kelas Bermain.",
    likes: 451,
    comments: 33,
    permalink: "https://instagram.com/kelasbermain.id",
    postedAt: "2026-08-18",
  },
];
