import type { GalleryItem } from "@/lib/types";

/**
 * Gallery items.
 *
 * Shape mirrors what an upload form would produce: image, title, category,
 * date, caption, plus optional links back to the event or activity the photo
 * belongs to. Swap this array for a storage bucket listing later.
 */
export const galleryItems: GalleryItem[] = [
  {
    id: "gal-01",
    image: { src: "/images/galeri-01.jpg", alt: "Sekelompok anak muda bersorak di ruang terbuka", width: 1200, height: 800 },
    title: "Sorak penutup Temu Relawan",
    category: "Community",
    date: "2026-09-13",
    caption: "Momen penutupan setelah sesi rencana kuartal selesai disusun.",
    activitySlug: "temu-komunitas-relawan",
  },
  {
    id: "gal-02",
    image: { src: "/images/galeri-02.jpg", alt: "Relawan berangkulan menghadap matahari terbenam", width: 1200, height: 675 },
    title: "Lima kota, satu barisan",
    category: "Community",
    date: "2026-09-13",
    caption: "Relawan dari lima kota bertemu langsung untuk pertama kalinya tahun ini.",
    activitySlug: "temu-komunitas-relawan",
  },
  {
    id: "gal-03",
    image: { src: "/images/galeri-03.jpg", alt: "Peserta berdiri bersama menikmati pemandangan sore", width: 1200, height: 800 },
    title: "Jeda sore di Taman Kota",
    category: "Kegiatan",
    date: "2026-06-21",
    caption: "Sesi istirahat sebelum permainan kelompok babak terakhir.",
    activitySlug: "outdoor-day-bermain-di-taman",
  },
  {
    id: "gal-04",
    image: { src: "/images/galeri-04.jpg", alt: "Pembicara membawakan presentasi di depan audiens", width: 1200, height: 857 },
    title: "Kabar dari lapangan",
    category: "Event",
    date: "2026-08-09",
    caption: "Setiap tim membawakan satu cerita keberhasilan dan satu catatan perbaikan.",
    eventSlug: "community-gathering-temu-relawan",
  },
  {
    id: "gal-05",
    image: { src: "/images/galeri-05.jpg", alt: "Aula besar dengan peserta menyimak pemaparan", width: 1200, height: 800 },
    title: "Pembukaan Pekan Kolaborasi",
    category: "Event",
    date: "2026-09-22",
    caption: "Sesi pembuka bersama perwakilan enam sekolah mitra.",
    eventSlug: "pekan-kolaborasi-sekolah-2026",
  },
  {
    id: "gal-06",
    image: { src: "/images/galeri-06.jpg", alt: "Sesi berbagi cerita di ruang komunitas berdinding bata", width: 1200, height: 800 },
    title: "Meja panjang, cerita panjang",
    category: "Event",
    date: "2026-08-09",
    caption: "Diskusi terbuka yang berlangsung sampai lewat jam penutupan.",
    eventSlug: "community-gathering-temu-relawan",
  },
  {
    id: "gal-07",
    image: { src: "/images/galeri-07.jpg", alt: "Dua peserta berdiskusi sambil menunjuk layar laptop", width: 1200, height: 800 },
    title: "Klinik karya poster",
    category: "Workshop",
    date: "2026-07-12",
    caption: "Mentor memberi catatan revisi langsung di layar peserta.",
    eventSlug: "workshop-desain-poster-sosial",
  },
  {
    id: "gal-08",
    image: { src: "/images/galeri-08.jpg", alt: "Peserta menulis catatan di meja kerja bersama", width: 1200, height: 800 },
    title: "Merancang ulang barang bekas",
    category: "Workshop",
    date: "2026-08-23",
    caption: "Tahap perencanaan sebelum peserta mulai memotong dan merakit.",
    activitySlug: "workshop-kreatif-daur-ulang",
  },
  {
    id: "gal-09",
    image: { src: "/images/galeri-09.jpg", alt: "Meja kerja dengan laptop dan buku catatan terbuka", width: 1200, height: 801 },
    title: "Ruang kerja peserta",
    category: "Workshop",
    date: "2026-07-12",
    caption: "Setiap peserta membawa satu poster dari nol sampai siap cetak.",
    eventSlug: "workshop-desain-poster-sosial",
  },
  {
    id: "gal-10",
    image: { src: "/images/galeri-10.jpg", alt: "Fasilitator mengajar di depan kelas berisi murid sekolah dasar", width: 1200, height: 800 },
    title: "Kelas pagi di SDN Menteng 03",
    category: "Kegiatan",
    date: "2026-09-05",
    caption: "Sesi pembuka sebelum murid dibagi ke dalam kelompok permainan.",
    activitySlug: "sahabat-bermain-sdn-menteng",
  },
  {
    id: "gal-11",
    image: { src: "/images/galeri-11.jpg", alt: "Seorang murid tersenyum sambil menulis di mejanya", width: 1200, height: 801 },
    title: "Lembar refleksi murid",
    category: "Kegiatan",
    date: "2026-09-05",
    caption: "Menulis satu hal baru yang dipelajari hari itu.",
    activitySlug: "sahabat-bermain-sdn-menteng",
  },
  {
    id: "gal-12",
    image: { src: "/images/galeri-12.jpg", alt: "Dua relawan berangkulan dari belakang", width: 1200, height: 800 },
    title: "Reuni relawan angkatan pertama",
    category: "Community",
    date: "2026-09-13",
    caption: "Beberapa relawan sudah bersama sejak gelaran pertama pada 2022.",
    activitySlug: "temu-komunitas-relawan",
  },
  {
    id: "gal-13",
    image: { src: "/images/galeri-13.jpg", alt: "Peserta mengangkat tangan menghadap langit sore", width: 1200, height: 802 },
    title: "Permainan penutup",
    category: "Kegiatan",
    date: "2026-06-21",
    caption: "Babak terakhir Outdoor Day sebelum sesi refleksi kelompok.",
    activitySlug: "outdoor-day-bermain-di-taman",
  },
  {
    id: "gal-14",
    image: { src: "/images/galeri-14.jpg", alt: "Barisan sepatu bot anak-anak berjajar di tanah", width: 1200, height: 800 },
    title: "Siap main di luar",
    category: "Kegiatan",
    date: "2026-06-21",
    caption: "Perlengkapan peserta sebelum masuk ke area permainan lumpur.",
    activitySlug: "outdoor-day-bermain-di-taman",
  },
  {
    id: "gal-15",
    image: { src: "/images/galeri-15.jpg", alt: "Tiga peserta berdiskusi di meja kerja bersama", width: 1200, height: 800 },
    title: "Leadership Circle OSIS",
    category: "Workshop",
    date: "2026-05-30",
    caption: "Perwakilan OSIS menyusun program kerja lintas sekolah.",
    activitySlug: "leadership-circle-osis",
  },
  {
    id: "gal-16",
    image: { src: "/images/galeri-16.jpg", alt: "Sekelompok mahasiswa berdiskusi di sekitar laptop", width: 1200, height: 800 },
    title: "Sesi kampus Yogyakarta",
    category: "Workshop",
    date: "2026-05-10",
    caption: "Diskusi kelompok kecil setelah sesi pemaparan utama.",
    activitySlug: "kelas-bermain-goes-to-campus",
  },
  {
    id: "gal-17",
    image: { src: "/images/galeri-17.jpg", alt: "Sekelompok anak tersenyum ke arah kamera", width: 1200, height: 953 },
    title: "Pembaca baru di Pojok Baca",
    category: "Community",
    date: "2026-07-26",
    caption: "Hari pertama pojok baca dibuka untuk anak-anak sekitar.",
    activitySlug: "aksi-relawan-pojok-baca",
  },
  {
    id: "gal-18",
    image: { src: "/images/galeri-18.jpg", alt: "Peserta bekerja dengan laptop di ruang belajar bersama", width: 1200, height: 1799 },
    title: "Persiapan materi kampus",
    category: "Workshop",
    date: "2026-05-10",
    caption: "Tim fasilitator menyiapkan modul semalam sebelum keberangkatan.",
    activitySlug: "kelas-bermain-goes-to-campus",
  },
  {
    id: "gal-19",
    image: { src: "/images/galeri-19.jpg", alt: "Relawan menata koleksi buku di rak", width: 1200, height: 800 },
    title: "Menata rak pertama",
    category: "Kegiatan",
    date: "2026-07-26",
    caption: "Sekitar 400 buku donasi disortir dan ditata dalam satu hari.",
    activitySlug: "aksi-relawan-pojok-baca",
  },
  {
    id: "gal-20",
    image: { src: "/images/galeri-20.jpg", alt: "Kerumunan besar pengunjung memadati area festival", width: 1200, height: 800 },
    title: "Festival Belajar & Bermain 2026",
    category: "Event",
    date: "2026-02-22",
    caption: "Gelaran tahun lalu dihadiri lebih dari 3.000 pengunjung.",
  },
  {
    id: "gal-21",
    image: { src: "/images/galeri-21.jpg", alt: "Tumpukan buku berwarna-warni", width: 1200, height: 798 },
    title: "Donasi buku terkumpul",
    category: "Kegiatan",
    date: "2026-07-26",
    caption: "Buku dikumpulkan dari tiga kota selama dua minggu.",
    activitySlug: "aksi-relawan-pojok-baca",
  },
  {
    id: "gal-22",
    image: { src: "/images/galeri-22.jpg", alt: "Lorong rak buku di sebuah perpustakaan", width: 1200, height: 800 },
    title: "Perpustakaan mitra",
    category: "Kegiatan",
    date: "2026-07-26",
    caption: "Perpustakaan daerah yang meminjamkan koleksi awal untuk pojok baca.",
    activitySlug: "aksi-relawan-pojok-baca",
  },
  {
    id: "gal-23",
    image: { src: "/images/galeri-23.jpg", alt: "Auditorium dengan layar besar dan audiens menyimak", width: 1200, height: 675 },
    title: "Sesi penutup Pekan Kolaborasi",
    category: "Event",
    date: "2026-09-27",
    caption: "Enam sekolah mitra berkumpul dalam satu ruang di hari terakhir.",
    eventSlug: "pekan-kolaborasi-sekolah-2026",
  },
  {
    id: "gal-24",
    image: { src: "/images/galeri-24.jpg", alt: "Mural bertuliskan ajakan untuk mencintai proses belajar", width: 1200, height: 800 },
    title: "Mural di koridor sekolah",
    category: "Kegiatan",
    date: "2026-09-05",
    caption: "Mural yang dikerjakan bersama murid pada kunjungan sebelumnya.",
    activitySlug: "sahabat-bermain-sdn-menteng",
  },
];

/**
 * Google Drive folder that holds the full documentation.
 *
 * Per the director's note, the gallery page shows this link under the banner
 * instead of a photo grid — the photos themselves live in Drive.
 *
 * Set the real folder URL either here, or without touching code by adding
 * `NEXT_PUBLIC_GALLERY_DRIVE_URL` to the environment. While it is empty the
 * page renders a clearly-marked "belum diatur" state rather than a dead link.
 */
export const galleryDrive = {
  title: "Folder Dokumentasi Kelas Bermain",
  description:
    "Seluruh foto kegiatan dan event Kelas Bermain kami kumpulkan dalam satu folder Google Drive. Folder ini terbuka untuk umum — tidak perlu masuk akun untuk melihat maupun mengunduh.",
  url: process.env.NEXT_PUBLIC_GALLERY_DRIVE_URL ?? "",
  /** Shown as the last-updated hint under the link. */
  updatedAt: "2026-09-20",
  contents: [
    "Dokumentasi event dan kegiatan, dikelompokkan per folder tahun",
    "Foto resolusi penuh siap diunduh",
    "Diperbarui setiap selesai kegiatan",
  ],
} as const;

/** Image shown as the large banner at the top of the gallery page. */
export const galleryFeatured = {
  src: "/images/galeri-banner.jpg",
  alt: "Anak-anak bersorak gembira bersama di kegiatan Kelas Bermain",
  width: 2000,
  height: 1100,
  title: "Setahun Kelas Bermain dalam gambar",
  caption:
    "Lebih dari 40 kegiatan, 12 kota, dan ribuan peserta yang datang untuk belajar sambil bermain.",
};
