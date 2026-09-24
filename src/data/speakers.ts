import type { Speaker } from "@/lib/types";

/** Kakak pembina yang mendampingi anak di lapangan. */
export const speakers: Speaker[] = [
  {
    id: "fs-rangga",
    name: "Kak Rangga",
    role: "Lead Facilitator",
    organization: "Kelas Bermain",
    bio: "Memimpin kelas profesi dan kegiatan luar ruang. Terbiasa menangani kelompok besar dan menjaga agar setiap anak kebagian giliran.",
    avatar: { src: "/images/fasilitator-01.jpg", alt: "Potret Kak Rangga", width: 640, height: 640 },
  },
  {
    id: "fs-dinda",
    name: "Kak Dinda",
    role: "Fasilitator Kelompok Usia Dini",
    organization: "Kelas Bermain",
    bio: "Fokus mendampingi peserta usia 3–6 tahun. Menyiapkan instruksi sederhana agar anak yang belum lancar membaca tetap bisa mengikuti.",
    avatar: { src: "/images/fasilitator-02.jpg", alt: "Potret Kak Dinda", width: 640, height: 640 },
  },
  {
    id: "fs-alya",
    name: "Kak Alya",
    role: "Fasilitator Kelas Kuliner & Kreatif",
    organization: "Kelas Bermain",
    bio: "Merancang kelas memasak dan prakarya, dari Decorate Mini Cake sampai Pottery Class. Memastikan semua bahan aman untuk anak.",
    avatar: { src: "/images/fasilitator-03.jpg", alt: "Potret Kak Alya", width: 640, height: 640 },
  },
  {
    id: "fs-bimo",
    name: "Kak Bimo",
    role: "Koordinator Lapangan",
    organization: "Kelas Bermain",
    bio: "Mengurus perizinan lokasi, alur kedatangan, dan keselamatan peserta selama kegiatan berlangsung.",
    avatar: { src: "/images/fasilitator-04.jpg", alt: "Potret Kak Bimo", width: 640, height: 640 },
  },
];
