import type { GalleryItem } from "@/lib/types";

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
    "Seluruh foto kegiatan Kelas Bermain kami kumpulkan dalam satu folder Google Drive. Folder ini terbuka untuk umum — orang tua bisa melihat dan mengunduh dokumentasi tanpa perlu masuk akun.",
  url: process.env.NEXT_PUBLIC_GALLERY_DRIVE_URL ?? "",
  /** Shown as the last-updated hint under the link. */
  updatedAt: "2026-09-20",
  contents: [
    "Dokumentasi tiap kelas, dikelompokkan per tanggal kegiatan",
    "Foto resolusi penuh siap diunduh",
    "Diperbarui maksimal 3 hari setelah kegiatan selesai",
  ],
} as const;

/** Image shown as the large banner at the top of the gallery page. */
export const galleryFeatured = {
  src: "/images/galeri-banner.jpg",
  alt: "Anak-anak duduk bersama mengangkat tangan saat mengikuti kegiatan Kelas Bermain",
  width: 2000,
  height: 1100,
  title: "Keseruan Kelas Bermain dalam gambar",
  caption:
    "Lebih dari 20 kegiatan sepanjang 2026, dari kelas memasak sampai kunjungan ke hangar pesawat.",
};

/**
 * Gallery items used by the activity detail pages.
 *
 * Shape mirrors what an upload form would produce: image, title, category,
 * date, caption, plus optional links back to the event or activity the photo
 * belongs to.
 */
export const galleryItems: GalleryItem[] = [
  {
    id: "gal-01",
    image: { src: "/images/galeri-01.jpg", alt: "Tiga anak kecil berpelukan sambil tertawa", width: 1200, height: 800 },
    title: "Teman baru dalam satu kelompok",
    category: "Kegiatan",
    date: "2026-09-13",
    caption: "Peserta dibagi ke kelompok kecil agar semua kebagian giliran.",
    activitySlug: "little-farmer-kampung-rimbun",
  },
  {
    id: "gal-02",
    image: { src: "/images/galeri-02.jpg", alt: "Anak perempuan tertawa dengan wajah penuh cat warna", width: 1200, height: 800 },
    title: "Sesi melukis wajah",
    category: "Kreatif",
    date: "2026-08-23",
    caption: "Pemanasan sebelum kelas prakarya dimulai.",
    activitySlug: "pottery-class-perdana",
  },
  {
    id: "gal-03",
    image: { src: "/images/galeri-03.jpg", alt: "Tangan anak melukis di atas kertas dengan cat warna-warni", width: 1200, height: 800 },
    title: "Bebas pilih warna sendiri",
    category: "Kreatif",
    date: "2026-08-23",
    caption: "Tidak ada hasil yang salah — setiap karya dibawa pulang.",
    activitySlug: "pottery-class-perdana",
  },
  {
    id: "gal-04",
    image: { src: "/images/galeri-04.jpg", alt: "Anak-anak mewarnai batu dengan spidol di meja kerja", width: 1200, height: 800 },
    title: "Prakarya meja panjang",
    category: "Kreatif",
    date: "2026-08-23",
    caption: "Melatih motorik halus dan kesabaran sekaligus.",
    activitySlug: "pottery-class-perdana",
  },
  {
    id: "gal-05",
    image: { src: "/images/galeri-05.jpg", alt: "Balita memegang kamera mainan berwarna ungu", width: 1200, height: 800 },
    title: "Dokumentasi versi peserta",
    category: "Kegiatan",
    date: "2026-08-17",
    caption: "Beberapa peserta membawa kamera mainannya sendiri.",
    activitySlug: "lomba-17-agustusan",
  },
  {
    id: "gal-06",
    image: { src: "/images/galeri-06.jpg", alt: "Anak laki-laki tertawa sambil memegang buku di bangku taman", width: 1200, height: 800 },
    title: "Jeda di antara lomba",
    category: "Kegiatan",
    date: "2026-08-17",
    caption: "Istirahat sebentar sebelum babak estafet kelompok.",
    activitySlug: "lomba-17-agustusan",
  },
  {
    id: "gal-07",
    image: { src: "/images/galeri-07.jpg", alt: "Murid tersenyum sambil menulis di mejanya", width: 1200, height: 800 },
    title: "Menulis lembar refleksi",
    category: "Kegiatan",
    date: "2026-09-13",
    caption: "Setiap anak menuliskan satu hal baru yang dipelajari hari itu.",
    activitySlug: "hangar-explore-jakarta",
  },
  {
    id: "gal-08",
    image: { src: "/images/galeri-08.jpg", alt: "Anak kecil berjaket kuning berjalan membawa ransel", width: 1200, height: 800 },
    title: "Berangkat ke lokasi",
    category: "Kegiatan",
    date: "2026-09-13",
    caption: "Peserta berkumpul di titik kumpul sebelum masuk area hangar.",
    activitySlug: "hangar-explore-jakarta",
  },
  {
    id: "gal-09",
    image: { src: "/images/galeri-09.jpg", alt: "Tangan menyusun menara dari balok kayu berwarna", width: 1200, height: 800 },
    title: "Permainan kelompok",
    category: "Kegiatan",
    date: "2026-08-17",
    caption: "Menyusun menara bersama tanpa boleh berbicara.",
    activitySlug: "lomba-17-agustusan",
  },
  {
    id: "gal-10",
    image: { src: "/images/galeri-10.jpg", alt: "Tumpukan balok lego berwarna-warni", width: 1200, height: 800 },
    title: "Pos permainan konstruksi",
    category: "Kegiatan",
    date: "2026-08-17",
    caption: "Salah satu pos favorit peserta usia 5–8 tahun.",
    activitySlug: "lomba-17-agustusan",
  },
  {
    id: "gal-11",
    image: { src: "/images/galeri-11.jpg", alt: "Deretan bibit tanaman dalam pot kecil", width: 1200, height: 800 },
    title: "Bibit siap ditanam",
    category: "Kegiatan",
    date: "2026-09-13",
    caption: "Setiap anak membawa pulang satu pot bibit untuk dirawat di rumah.",
    activitySlug: "little-farmer-kampung-rimbun",
  },
  {
    id: "gal-12",
    image: { src: "/images/galeri-12.jpg", alt: "Sekop kecil berisi tanah di atas meja tanam", width: 1200, height: 800 },
    title: "Belajar menakar tanah",
    category: "Kegiatan",
    date: "2026-09-13",
    caption: "Langkah pertama sebelum bibit dipindahkan ke pot.",
    activitySlug: "little-farmer-kampung-rimbun",
  },
  {
    id: "gal-13",
    image: { src: "/images/galeri-13.jpg", alt: "Aneka sayuran segar hasil panen ditata dalam wadah", width: 1200, height: 800 },
    title: "Hasil panen hari itu",
    category: "Kegiatan",
    date: "2026-09-13",
    caption: "Sayuran yang dipanen peserta langsung dimasak untuk makan siang.",
    activitySlug: "little-farmer-kampung-rimbun",
  },
  {
    id: "gal-14",
    image: { src: "/images/galeri-14.jpg", alt: "Kue bundar yang sudah dihias dengan krim dan hiasan", width: 1200, height: 800 },
    title: "Hasil karya peserta",
    category: "Kuliner",
    date: "2026-09-06",
    caption: "Setiap cake dibawa pulang apa adanya — tanpa diperbaiki panitia.",
    activitySlug: "cocoa-maker-dapoer-cocoa",
  },
  {
    id: "gal-15",
    image: { src: "/images/galeri-15.jpg", alt: "Kue dengan hiasan bunga dan buah di atasnya", width: 1200, height: 800 },
    title: "Menghias sesuai selera",
    category: "Kuliner",
    date: "2026-09-06",
    caption: "Topping disediakan bebas pilih, tanpa contoh yang harus ditiru.",
    activitySlug: "cocoa-maker-dapoer-cocoa",
  },
  {
    id: "gal-16",
    image: { src: "/images/galeri-16.jpg", alt: "Kue cokelat dengan lelehan cokelat di sisinya", width: 1200, height: 800 },
    title: "Cokelat siap dicetak",
    category: "Kuliner",
    date: "2026-09-06",
    caption: "Cokelat leleh dituang ke cetakan pilihan masing-masing anak.",
    activitySlug: "cocoa-maker-dapoer-cocoa",
  },
  {
    id: "gal-17",
    image: { src: "/images/galeri-17.jpg", alt: "Sekeranjang kukis cokelat yang baru matang", width: 1200, height: 800 },
    title: "Snack sesi kedua",
    category: "Kuliner",
    date: "2026-09-06",
    caption: "Disiapkan tim dapur mitra untuk peserta dan pendamping.",
    activitySlug: "cocoa-maker-dapoer-cocoa",
  },
  {
    id: "gal-18",
    image: { src: "/images/galeri-18.jpg", alt: "Potongan cokelat batang di atas meja", width: 1200, height: 800 },
    title: "Dari biji jadi batang",
    category: "Kuliner",
    date: "2026-09-06",
    caption: "Anak melihat langsung seluruh tahap prosesnya.",
    activitySlug: "cocoa-maker-dapoer-cocoa",
  },
  {
    id: "gal-19",
    image: { src: "/images/galeri-19.jpg", alt: "Tumpukan piring dan mangkuk keramik buatan tangan", width: 1200, height: 800 },
    title: "Karya yang sudah dibakar",
    category: "Kreatif",
    date: "2026-08-23",
    caption: "Diambil peserta dua pekan setelah kelas selesai.",
    activitySlug: "pottery-class-perdana",
  },
  {
    id: "gal-20",
    image: { src: "/images/galeri-20.jpg", alt: "Sayap pesawat terlihat dari jendela saat terbang", width: 1200, height: 800 },
    title: "Mengenal bagian pesawat",
    category: "Event",
    date: "2026-09-13",
    caption: "Sesi pengenalan bagian pesawat sebelum masuk hangar.",
    activitySlug: "hangar-explore-jakarta",
  },
  {
    id: "gal-21",
    image: { src: "/images/galeri-21.jpg", alt: "Hamparan kebun hijau di bawah langit cerah", width: 1200, height: 800 },
    title: "Area kebun Kampung Rimbun",
    category: "Kegiatan",
    date: "2026-09-13",
    caption: "Area terbuka dan teduh, nyaman untuk kegiatan seharian.",
    activitySlug: "little-farmer-kampung-rimbun",
  },
  {
    id: "gal-22",
    image: { src: "/images/galeri-22.jpg", alt: "Jerapah menjulurkan kepala di area terbuka", width: 1200, height: 800 },
    title: "Pos pengenalan satwa",
    category: "Event",
    date: "2026-08-31",
    caption: "Salah satu pos tambahan pada kegiatan kunjungan lapangan.",
    activitySlug: "tentara-cilik-yonif-328",
  },
];
