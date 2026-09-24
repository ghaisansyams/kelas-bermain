import type { Testimonial } from "@/lib/types";

export const testimonials: Testimonial[] = [
  {
    id: "tst-001",
    name: "Sekar Ayu",
    role: "Pelajar SMA, Jakarta",
    quote:
      "Saya datang karena disuruh guru, pulang dengan rencana bikin klub baca di sekolah. Sesi refleksinya yang bikin beda — kami tidak cuma main, tapi disuruh menjelaskan apa yang baru saja terjadi.",
    avatar: { src: "/images/testi-sekar.jpg", alt: "Potret Sekar Ayu", width: 320, height: 320 },
    eventTitle: "Leadership Playground 2026",
  },
  {
    id: "tst-002",
    name: "Fajar Ramadhan",
    role: "Mahasiswa, Bandung",
    quote:
      "Dulu saya menghindari presentasi sampai titik terakhir. Setelah workshop ini saya masih gugup, tapi sekarang tahu harus apa dengan gugupnya. Itu sudah perubahan besar buat saya.",
    avatar: { src: "/images/testi-fajar.jpg", alt: "Potret Fajar Ramadhan", width: 320, height: 320 },
    eventTitle: "Workshop Public Speaking",
  },
  {
    id: "tst-003",
    name: "Nabila Syifa",
    role: "Relawan Kelas Bermain",
    quote:
      "Tiga tahun jadi relawan dan belum bosan. Yang menahan saya di sini bukan programnya, tapi orang-orangnya — semua diperlakukan sebagai orang yang masih belajar, termasuk fasilitatornya.",
    avatar: { src: "/images/testi-nabila.jpg", alt: "Potret Nabila Syifa", width: 320, height: 320 },
    eventTitle: "Community Gathering",
  },
  {
    id: "tst-004",
    name: "Yoga Pratama",
    role: "Guru Pendamping, Depok",
    quote:
      "Sebagai guru, saya perhatikan siswa yang biasanya diam justru paling aktif di kegiatan ini. Formatnya memberi ruang untuk anak yang tidak nyaman dengan kelas konvensional.",
    avatar: { src: "/images/testi-yoga.jpg", alt: "Potret Yoga Pratama", width: 320, height: 320 },
    eventTitle: "Pekan Kolaborasi Sekolah",
  },
];
