import type { Testimonial } from "@/lib/types";

/** Umpan balik orang tua setelah kegiatan. */
export const testimonials: Testimonial[] = [
  {
    id: "tst-001",
    name: "Bunda Sekar",
    role: "Orang tua peserta, Depok",
    quote:
      "Anak saya biasanya nempel terus kalau ketemu orang baru. Di Pemadam Cilik dia malah paling depan waktu disuruh pegang selang. Pulang-pulang cerita terus sampai malam.",
    avatar: { src: "/images/orangtua-01.jpg", alt: "Potret Bunda Sekar", width: 320, height: 320 },
    eventTitle: "Pemadam Cilik",
  },
  {
    id: "tst-002",
    name: "Ayah Fajar",
    role: "Orang tua peserta, Jakarta",
    quote:
      "Yang saya suka, kakak-kakak pendampingnya sabar dan kelompoknya kecil. Jadi anak benar-benar dapat giliran, bukan cuma nonton.",
    avatar: { src: "/images/orangtua-02.jpg", alt: "Potret Ayah Fajar", width: 320, height: 320 },
    eventTitle: "Tentara Cilik",
  },
  {
    id: "tst-003",
    name: "Bunda Nabila",
    role: "Orang tua peserta, Tangerang Selatan",
    quote:
      "Little Farmer bikin anak saya akhirnya mau makan sayur. Katanya karena dia sendiri yang metik. Sederhana, tapi buat saya itu hasil besar.",
    avatar: { src: "/images/orangtua-03.jpg", alt: "Potret Bunda Nabila", width: 320, height: 320 },
    eventTitle: "Little Farmer",
  },
  {
    id: "tst-004",
    name: "Bunda Rani",
    role: "Orang tua peserta, Depok",
    quote:
      "Sudah ikut tiga kelas dan belum pernah kecewa. Infonya jelas, datang tepat waktu, dan dokumentasinya dikirim lengkap setelah acara.",
    avatar: { src: "/images/orangtua-04.jpg", alt: "Potret Bunda Rani", width: 320, height: 320 },
    eventTitle: "Decorate Mini Cake",
  },
];
