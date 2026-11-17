/**
 * The in-app handbook.
 *
 * Written as data rather than as a page full of markup, so adding a step is
 * one entry here and nothing else. Kept in the admin itself rather than in a
 * separate document: a guide nobody can find is a guide nobody reads.
 *
 * `screenshot` points at a Media Library URL. Every step works without one —
 * a missing picture never leaves a broken frame on the page.
 */

export interface GuideStep {
  title: string;
  body: string;
  /** Optional Media Library image illustrating this step. */
  screenshot?: string;
  /** Where in the admin this step happens. */
  href?: string;
}

export interface GuideChapter {
  id: string;
  title: string;
  summary: string;
  /** lucide-react icon name resolved by the page. */
  icon: "rocket" | "calendar" | "users" | "wallet" | "check" | "award" | "chart" | "layout";
  steps: GuideStep[];
}

export const GUIDE: GuideChapter[] = [
  {
    id: "mulai",
    title: "Alur Harian",
    summary: "Urutan kerja dari orang tua mendaftar sampai sertifikat terbit.",
    icon: "rocket",
    steps: [
      {
        title: "Orang tua mendaftar lewat website",
        body: "Mereka memilih kelas di halaman Event, mengisi data pendamping dan anak, lalu menekan Konfirmasi. Saat itu juga datanya masuk ke menu Registrasi dan Pembayaran dengan status Belum Bayar. Kamu tidak perlu melakukan apa pun di tahap ini.",
        href: "/admin/registrations",
      },
      {
        title: "Cek pembayaran masuk",
        body: "Setelah orang tua transfer dan mengirim bukti lewat WhatsApp, buka menu Pembayaran. Cari nomor registrasinya, cocokkan nominalnya, lalu tekan Konfirmasi Lunas. Sekali tekan saja — sistem mengabaikan tekanan kedua, jadi tidak akan tercatat dua kali.",
        href: "/admin/payments",
      },
      {
        title: "Hari kegiatan: catat kehadiran",
        body: "Buka menu Kehadiran, pilih eventnya, lalu tandai Hadir atau Tidak Hadir untuk tiap anak. Waktu check-in tercatat otomatis.",
        href: "/admin/attendance",
      },
      {
        title: "Terbitkan sertifikat",
        body: "Buka menu Sertifikat, pilih event yang sama. Hanya anak yang tercatat Hadir yang bisa diterbitkan sertifikatnya. Gunakan tombol massal untuk menerbitkan semuanya sekaligus.",
        href: "/admin/certificates",
      },
    ],
  },
  {
    id: "event",
    title: "Mengelola Event",
    summary: "Menambah kelas baru dan mengatur di mana ia tampil.",
    icon: "calendar",
    steps: [
      {
        title: "Membuat event baru",
        body: "Menu Event → tombol Event Baru. Isi judul, tanggal, jam, lokasi, kuota, dan harga. Slug terisi otomatis dari judul — itu yang jadi alamat halamannya di website.",
        href: "/admin/events",
      },
      {
        title: "Tiga cara menampilkan harga",
        body: "Tampilkan Harga untuk kelas berbayar biasa. Sembunyikan kalau harga hanya diberi lewat WhatsApp — pengunjung melihat tulisan Hubungi kami. Gratis untuk kegiatan tanpa biaya, dan pendaftarnya langsung terkonfirmasi tanpa tahap pembayaran.",
      },
      {
        title: "Menambah kategori event baru",
        body: "Menu Event → tombol Kategori (atau tautan Kelola kategori di bawah pilihan Kategori pada form event). Isi nama, pilih warna lencana, dan boleh unggah foto cadangan untuk bagian Tentang Event. Kategori baru langsung bisa dipilih di form event dan otomatis muncul sebagai tombol filter di halaman Event begitu ada event yang memakainya. Tombol panah mengatur urutan filter. Mengganti nama ikut mengganti nama di semua event yang memakainya; kategori yang masih dipakai event tidak bisa dihapus.",
        href: "/admin/events/kategori",
      },
      {
        title: "Menayangkan event",
        body: "Saat menekan Simpan Event pada event baru, akan muncul pertanyaan: Tayangkan sekarang atau Simpan sebagai draft dulu. Tayangkan sekarang membuat event langsung tampil di website. Draft belum terlihat pengunjung. Event draft bisa ditayangkan kapan saja lewat tombol Tayangkan di website di bagian atas halaman event, dan event yang sudah tampil bisa disembunyikan lagi dengan tombol di tempat yang sama. Setelah kegiatan selesai, buka Status lainnya di bagian Tampil di website dan pilih Selesai supaya masuk bagian Yang Sudah Kami Jalankan.",
      },
      {
        title: "Foto Tentang Event dan daftar ketentuan",
        body: "Bagian Foto Tentang Event mengisi gambar di atas deskripsi pada halaman event, maksimal 4 foto. Kalau dikosongkan, dipakai foto bawaan kategori. Rundown, fasilitas, ketentuan peserta, dan catatan pendaftaran diisi satu kolom per item: tekan Tambah atau Enter untuk menambah baris, ikon tempat sampah untuk menghapus.",
      },
    ],
  },
  {
    id: "website",
    title: "Mengubah Isi Website",
    summary: "Teks, gambar, menu, dan tampilan — tanpa menyentuh kode.",
    icon: "layout",
    steps: [
      {
        title: "Satu pintu: CMS Website",
        body: "Semua isi website diatur dari satu menu. Tab Website untuk logo, menu, footer, dan SEO. Tab Halaman Depan untuk tiap bagian beranda. Tab Event untuk mengatur event mana yang disorot.",
        href: "/admin/cms",
      },
      {
        title: "Draf dulu, baru terbit",
        body: "Setiap perubahan tersimpan sebagai draf dan belum terlihat pengunjung. Di atas editor ada hitungan berapa bagian yang belum terbit. Tekan Publikasikan kalau sudah yakin — akan muncul konfirmasi dulu.",
      },
      {
        title: "Melihat hasilnya sebelum terbit",
        body: "Centang Tampilkan draf di pratinjau untuk melihat hasil perubahan di panel tengah. Hanya kamu yang melihatnya; pengunjung tetap melihat versi yang sudah terbit.",
      },
      {
        title: "Mengubah urutan bagian",
        body: "Di panel Struktur Halaman, seret bagian ke atas atau bawah — atau pakai tombol panah kalau lebih nyaman. Tekan Simpan Urutan setelahnya. Menyeret hanya mengubah urutan tampilan, tidak menyentuh isinya.",
      },
      {
        title: "Mengganti galeri foto",
        body: "Galeri memakai satu folder Google Drive. Buka CMS Website → Halaman Depan → bagian Galeri Foto, lalu tempel tautan folder barunya. Pastikan folder disetel Siapa saja yang memiliki link.",
      },
    ],
  },
  {
    id: "uang",
    title: "Pembayaran & Keuangan",
    summary: "Memverifikasi transfer, refund, dan membaca laporan.",
    icon: "wallet",
    steps: [
      {
        title: "Nomor invoice terbit otomatis",
        body: "Begitu kamu menekan Konfirmasi Lunas, sistem membuat nomor invoice, mencatat pemasukan di Keuangan, dan menulis jejak audit — semuanya sekaligus. Orang tua bisa melihat nomor invoicenya di halaman status pendaftaran mereka.",
        href: "/admin/payments",
      },
      {
        title: "Refund",
        body: "Hanya Super Admin yang bisa. Pemasukan awal tidak dihapus; sistem mencatat baris pengeluaran terpisah. Dengan begitu riwayatnya tetap utuh dan bisa diaudit.",
        href: "/admin/finance",
      },
      {
        title: "Laporan dan ekspor",
        body: "Menu Laporan memberi rekap per rentang tanggal: pendapatan, konversi bayar, tingkat kehadiran, dan rekap per event. Tombol unduh CSV mengikuti rentang tanggal yang sedang aktif.",
        href: "/admin/reports",
      },
      {
        title: "Diskon dan voucher",
        body: "Besaran diskon sibling dan group diatur di Pengaturan Diskon, bukan di kode. Voucher dibuat di menu Voucher, lengkap dengan kuota dan masa berlaku. Daftar kode tidak pernah dikirim ke browser pengunjung.",
        href: "/admin/settings",
      },
    ],
  },
  {
    id: "sertifikat",
    title: "Sertifikat",
    summary: "Desain, tanda tangan, dan penerbitan.",
    icon: "award",
    steps: [
      {
        title: "Atur penanda tangan dulu",
        body: "CMS Website → tab Sertifikat. Isi nama dan jabatan penanda tangan, serta gambar tanda tangannya kalau ada. Paling baik PNG berlatar transparan.",
        href: "/admin/cms?tab=certificates",
      },
      {
        title: "Membuat desain",
        body: "Di tab yang sama ada perancang sertifikat. Atur posisi tiap elemen dalam milimeter, lalu lihat hasilnya langsung di pratinjau yang memakai data contoh.",
      },
      {
        title: "Variabel yang terisi otomatis",
        body: "Tulis {{participant_name}}, {{event_name}}, {{event_date}}, atau {{certificate_number}} di elemen teks. Saat sertifikat diterbitkan, semuanya diganti data asli. Untuk gambar tanda tangan, isi sumber gambarnya dengan {{signature}}.",
      },
      {
        title: "Sertifikat massal dari Excel (sekolah/instansi)",
        body: "Untuk pelanggan yang datanya sudah di Excel dan tidak mendaftar lewat website. CMS Website → tab Sertifikat → bagian paling atas. Pilih desain (atau unggah desain Canva yang kosong di bagian nama), unggah Excel (.xlsx atau .csv), periksa daftar nama, geser posisi nama bila perlu, lalu klik Buat sertifikat. Hasilnya satu PDF siap cetak (dipecah per 100 halaman) atau ZIP berisi satu PDF per nama. Hanya nama yang diisi, tanpa nomor; berkas diproses di browser dan tidak disimpan di database.",
        href: "/admin/cms?tab=certificates",
      },
      {
        title: "Sertifikat lama tidak ikut berubah",
        body: "Mengubah desain atau penanda tangan hanya berlaku untuk sertifikat berikutnya. Yang sudah diterbitkan tetap seperti saat dicetak — dokumen yang sudah dipegang orang tidak boleh berubah diam-diam.",
      },
    ],
  },
  {
    id: "pengguna",
    title: "Pengguna & Keamanan",
    summary: "Siapa yang boleh mengakses apa.",
    icon: "users",
    steps: [
      {
        title: "Tiga tingkat akses",
        body: "Super Admin bisa semuanya termasuk mengelola pengguna, menghapus data, dan refund. Admin bisa seluruh operasional dan website. Staff untuk kebutuhan terbatas.",
        href: "/admin/users",
      },
      {
        title: "Menambah pengguna",
        body: "Hanya Super Admin yang bisa. Di menu Pengguna, isi email, nama, peran, dan kata sandi awal (minimal 10 karakter), lalu sampaikan kata sandinya langsung kepada orangnya. Tidak ada email pemulihan: kalau seseorang lupa kata sandi, Super Admin menggantinya lewat tombol Ganti kata sandi di baris orang itu, dan semua sesi lamanya otomatis berakhir.",
      },
      {
        title: "Menghapus event, pendamping, atau anak",
        body: "Hanya Super Admin yang bisa. Klik Hapus, baca daftar apa saja yang ikut dipindahkan (pendaftaran, pembayaran, bukti transfer, sertifikat), lalu ketik tulisan yang diminta persis sama, yaitu judul event, kode KB-CUS pendamping, atau kode KB-CHD anak. Data tidak langsung hilang: ia pindah ke menu Terhapus dan bisa dipulihkan selama 30 hari. Kalau hanya ingin menyembunyikan pendamping atau anak dari daftar, pakai Nonaktifkan di halaman Detail.",
        href: "/admin/trash",
      },
      {
        title: "Memulihkan data dari Terhapus",
        body: "Menu Sistem → Terhapus menampilkan semua yang dihapus beserta sisa harinya. Klik Pulihkan untuk mengembalikan persis seperti semula, termasuk pendaftaran, pembayaran, kehadiran, dan sertifikatnya. Setelah 30 hari data dibuang otomatis dan tidak bisa kembali. Tombol Buang membuang lebih cepat, dengan mengetik HAPUS. Kalau event atau orang yang berkaitan sudah dihapus juga, pendaftaran yang bergantung padanya tidak ikut pulih dan kamu diberi tahu.",
        href: "/admin/trash",
      },
      {
        title: "Semua perubahan tercatat",
        body: "Menu Activity Log menyimpan siapa mengubah apa dan kapan, lengkap dengan nilai sebelum dan sesudah. Berguna saat ada angka yang terasa tidak cocok.",
        href: "/admin/activity-log",
      },
    ],
  },
];
