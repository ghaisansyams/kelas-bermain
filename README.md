# Kelas Bermain — Platform Digital

Dua aplikasi dalam satu basis kode, berbagi satu model data:

1. **Situs publik** untuk orang tua — jadwal kelas, pendaftaran lewat QR, pembayaran, check-in, dan verifikasi sertifikat.
2. **ERP internal** (`/admin`) untuk staf — customer, anak, event, pendaftaran, pembayaran, kehadiran, sertifikat, konten, dan laporan.

Kelas Bermain adalah aktivitas kreatif dan edukatif untuk anak **3–15 tahun di Jabodetabek**.

> **Status: versi demo dengan data dummy.**
> Judul kelas, tanggal, lokasi, aktivitas, dan benefit mengikuti unggahan
> [@kelasbermain.id](https://instagram.com/kelasbermain.id). **Harga masih placeholder.**
> Pendaftaran, pembayaran, kehadiran, dan sertifikat berjalan di peramban
> (localStorage) — belum ada basis data produksi. Seluruh akses data lewat
> lapisan service, jadi penggantian ke Supabase/PostgreSQL tidak menyentuh satu
> pun komponen UI.

### Catatan penting

- **Autentikasi ERP masih simulasi.** Akun fixture, kata sandi ditampilkan di
  layar masuk. Ganti `src/lib/auth/*` sebelum dipakai untuk data asli.
- **Payment gateway masih simulasi.** Tidak ada uang berpindah.
- **Tidak ada nomor telepon di teks situs publik**, sesuai notulen. Nomor WhatsApp
  tetap terlihat karena tercetak di dalam poster Pemadam Cilik.
- Hampir semua kelas berbayar. Satu event gratis (**Open House**) sengaja ada agar
  alur `FREE` benar-benar teruji, bukan hanya didukung model data.

## Tech stack

| Bagian | Pilihan |
| --- | --- |
| Framework | Next.js 15 (App Router, React 19, Server Components) |
| Bahasa | TypeScript (strict) |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) |
| Ikon | lucide-react + SVG kustom untuk logo & ikon media sosial |
| Font | Plus Jakarta Sans + Fraunces (via `next/font`, self-hosted saat build) |
| Gambar | `next/image`, aset lokal di `public/images` |
| Animasi | CSS murni + `IntersectionObserver` (tanpa pustaka animasi) |
| Deploy | Vercel (region `sin1`) |

Dependensi runtime sengaja dijaga minimal: `next`, `react`, `react-dom`, `lucide-react`,
`clsx`, `tailwind-merge`, `qrcode-generator`. Tidak ada pustaka form, state manager,
chart, atau animasi tambahan — chart dashboard digambar sendiri sebagai SVG/HTML.

## Menjalankan proyek

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build produksi
npm run start      # jalankan hasil build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

Node 20+ disarankan (dikembangkan dengan Node 22).

## Variabel lingkungan

Hanya satu, dan bersifat opsional:

| Nama | Fungsi | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Basis URL absolut untuk metadata SEO, Open Graph, sitemap, dan canonical | `https://kelas-bermain.vercel.app` |
| `NEXT_PUBLIC_GALLERY_DRIVE_URL` | URL folder Google Drive yang ditautkan di halaman Galeri | folder produksi di `src/data/gallery.ts` |
| `ADMIN_SESSION_SECRET` | Kunci tanda tangan cookie sesi ERP | nilai pengembangan yang terdokumentasi — **wajib diisi di produksi** |

Keduanya opsional. `NEXT_PUBLIC_GALLERY_DRIVE_URL` hanya perlu diisi bila folder Drive
berpindah tanpa ingin mengubah kode.

Tidak ada API key, token, atau kredensial apa pun di repositori ini.

## Rute

### Situs publik

| Rute | Isi |
| --- | --- |
| `/` | Landing: hero, nilai, jadwal terdekat, cara ikut, statistik, kegiatan, galeri, testimoni, media sosial |
| `/event` | Jadwal kelas + filter status dan kategori |
| `/event/[slug]` | Detail kelas (satu template untuk semua kelas) |
| `/register/[eventSlug]` | **Halaman pendaratan QR** — pendaftaran 4 langkah |
| `/payment/[registrationId]` | Checkout & pembayaran (gerbang simulasi) |
| `/attendance/[eventSlug]` | Check-in kehadiran peserta |
| `/certificate/[certificateId]` | Verifikasi sertifikat publik |
| `/kegiatan`, `/kegiatan/[slug]` | Dokumentasi kegiatan |
| `/galeri` | Banner + tautan folder Google Drive |
| `/sertifikat` | Pencarian sertifikat berdasarkan nomor |

URL lama (`/event/[slug]/daftar`, `/event/[slug]/attendance`, `/sertifikat/[id]`) tetap
hidup lewat redirect permanen — materi cetak lama tidak rusak.

### ERP internal

| Rute | Isi |
| --- | --- |
| `/admin/login` | Masuk (akun demo ditampilkan di layar) |
| `/admin/dashboard` | 8 kartu statistik + 4 chart + pendaftaran terbaru |
| `/admin/customers`, `/admin/customers/[id]` | Orang tua + profil, anak, pendaftaran, pembayaran |
| `/admin/children`, `/admin/children/[id]` | Anak + profil, kelas, sertifikat |
| `/admin/events`, `/admin/events/[id]` | Event + ikhtisar, pendaftaran, pembayaran, sertifikat |
| `/admin/events/[id]/qr` | **Generator QR** — unduh PNG/SVG, cetak, salin tautan, penanda sumber |
| `/admin/registrations` | Pendaftaran + 5 filter + ekspor CSV |
| `/admin/payments` | Pembayaran + ubah status manual (untuk konfirmasi pihak ketiga) |
| `/admin/attendance` | Tandai kehadiran manual + tautan QR check-in |
| `/admin/certificates` | Sertifikat terbit |
| `/admin/activities`, `/admin/gallery` | Konten |
| `/admin/reports` | 6 laporan, tersaring, ekspor CSV |
| `/admin/settings` | Identitas, peran, status integrasi, skema basis data |

`/admin` dialihkan ke `/admin/dashboard`. Seluruh `/admin/*` dijaga middleware.

## Alur

### QR → pendaftaran

```
QR di poster / banner / lokasi
  → /register/<slug>?source=poster
  → Langkah 1 Orang Tua  → Langkah 2 Anak (bisa lebih dari satu)
  → Langkah 3 Konfirmasi → Langkah 4 Selesai
  → Nomor pendaftaran per anak + nomor customer
```

`?source=` tersimpan pada setiap pendaftaran, sehingga media mana yang menghasilkan
peserta bisa dilihat di kolom Sumber.

### Tiga skenario pembayaran

| Tipe | Metode | Yang terjadi |
| --- | --- | --- |
| `FREE` | `NONE` | Langsung `CONFIRMED`, tanpa pembayaran |
| `PAID` | `WEBSITE` | Checkout di situs ini lewat gerbang simulasi → `PAID` |
| `PAID` | `THIRD_PARTY` | Pendaftaran tercatat `PENDING`, peserta diarahkan ke platform mitra; admin mengonfirmasi manual |

### Kehadiran → sertifikat

```
/attendance/<slug>  (atau QR check-in dengan ?reg= terisi otomatis)
  → verifikasi nomor pendaftaran + kontak orang tua
  → attendanceStatus = PRESENT, certificateStatus = AVAILABLE
  → "Lihat Sertifikat" → nomor KB-<tahun>-<urutan> diterbitkan
  → /certificate/<nomor> bisa diverifikasi publik
```

## Struktur proyek

```
src/
  app/                      # Rute App Router + metadata per halaman
  components/
    brand/                  # Logo & ikon media sosial
    certificate/            # Kartu sertifikat, viewer, formulir verifikasi
    event/                  # Kartu event, filter, panel registrasi, bagian detail
    forms/                  # Field primitif + formulir pendaftaran & kehadiran
    gallery/                # Grid masonry + lightbox
    home/                   # Bagian-bagian landing page
    kegiatan/               # Kartu & filter kegiatan
    layout/                 # Header, footer, page header
    ui/                     # Button, Badge, Container, Skeleton, EmptyState, Reveal
  data/                     # SELURUH konten dummy (lihat di bawah)
  lib/
    repositories/           # Penyimpanan (localStorage) untuk pendaftaran & sertifikat
    services/               # Batas antara UI dan sumber data
    utils/                  # Tanggal, format, penomoran sertifikat, validasi
    types.ts                # Model domain
public/images/              # Foto (aset lokal, bukan hotlink)
```

### Aturan yang dijaga

Komponen **tidak pernah** memuat konten secara langsung. Yang benar:

```tsx
<EventCard event={event} />        // konten datang dari prop
```

Yang dihindari:

```tsx
<div><h1>Creative Leadership 2026</h1></div>   // konten tertanam di komponen
```

Halaman mengambil data lewat `lib/services/content.ts`, lalu meneruskannya ke komponen
sebagai prop. Inilah yang membuat penggantian sumber data menjadi pekerjaan satu berkas.

## Arsitektur data

```
src/data/            seed — customers, children, registrations, payments,
                     attendance, certificates, events, activities, gallery
      ↓
src/lib/repositories/  satu adapter per koleksi (localStorage + seed)
      ↓
src/lib/services/      content · customer · registration · payment ·
                       attendance · certificate · qr · admin
      ↓
komponen UI            hanya menerima props
```

Relasi antar-entitas:

```
Customer (orang tua)
  ├── Child            customers.id -> children.customer_id
  └── Registration     customers.id -> registrations.customer_id
        ├── Event      events.id    -> registrations.event_id
        ├── Payment    registrations.id -> payments.registration_id
        ├── Attendance registrations.id -> attendance.registration_id
        └── Certificate registrations.id -> certificates.registration_id
```

Data orang tua **tidak diduplikasi** per anak; pendaftaran ulang dengan email yang
sama memakai kembali baris customer yang ada.

### Mengganti data dummy dengan basis data

Cukup satu berkas: **`src/lib/repositories/index.ts`**. Implementasikan ulang
`Repository<T>` terhadap klien Supabase/PostgreSQL. Selama bentuk kembaliannya
tetap mengikuti `src/lib/repositories/types.ts`, tidak ada service maupun komponen
yang perlu diubah.

Yang juga perlu dipindah ke basis data saat itu:

| Sekarang | Nanti |
| --- | --- |
| `lib/utils/numbering.ts` | sequence / identity column, agar nomor tetap unik saat penulisan bersamaan |
| `lib/services/payment.ts` (`mockGateway`) | implementasi `PaymentGateway` untuk Midtrans/Xendit/Stripe |
| `lib/auth/*` | penyedia autentikasi sungguhan (Supabase Auth, Auth.js, Clerk) |
| Unggah galeri | penyimpanan objek (Supabase Storage / S3) |

### Penomoran

| Entitas | Format | Contoh |
| --- | --- | --- |
| Customer | `KB-CUS-<5 digit>` | `KB-CUS-00001` |
| Anak | `KB-CHD-<5 digit>` | `KB-CHD-00001` |
| Pendaftaran | `KB-REG-<tahun>-<5 digit>` | `KB-REG-2026-00001` |
| Pembayaran | `KB-PAY-<tahun>-<5 digit>` | `KB-PAY-2026-00001` |
| Sertifikat | `KB-<tahun>-<5 digit>` | `KB-2026-00125` |

### Peran ERP

| Peran | Akses |
| --- | --- |
| `SUPER_ADMIN` | seluruh menu termasuk Pengaturan |
| `ADMIN` | semua kecuali Pengaturan |
| `STAFF` | Dashboard, Orang Tua, Anak, Pendaftaran, Kehadiran, Laporan |

Menu sidebar difilter per peran, dan halaman yang tidak diizinkan menolak akses —
bukan sekadar disembunyikan.

## Siap untuk panel admin

Belum ada dashboard admin di fase ini — sesuai permintaan. Yang sudah disiapkan:

- Setiap entitas punya tipe eksplisit di `lib/types.ts` dan `lib/repositories/types.ts`.
- `EventRecord` memuat `published`, `capacity`, `registered`, `registration.type`,
  `registration.price`, `agenda`, dan `certificate` — cukup untuk form CRUD event.
- `ActivityRecord` dan `GalleryItem` juga memuat `published`/kategori untuk kebutuhan serupa.
- Pembacaan untuk kebutuhan admin sudah tersedia: `listRegistrations(eventSlug?)`,
  `listAttendance(eventSlug)`, `listCertificates()` — siap dipakai untuk tabel peserta dan
  ekspor CSV.

## Catatan konten

- **Tidak ada nomor telepon** yang ditampilkan di seluruh situs — sesuai permintaan rapat.
  Kontak publik hanya lewat email dan media sosial.
- Bagian Instagram memakai data statis di `src/data/instagram.ts`. Tidak ada scraping dan
  tidak ada pemanggilan API Instagram. Komponennya hanya mengonsumsi tipe `SocialPost`,
  sehingga integrasi resmi nantinya cukup mengganti sumber datanya.
- Sebagian besar foto adalah **stok berlisensi bebas sebagai placeholder** dan perlu diganti
  dengan dokumentasi asli Kelas Bermain sebelum situs dipakai sungguhan.
- Cover **Tentara Cilik** dan **Pemadam Cilik** adalah ilustrasi datar yang dibuat sendiri
  (tidak ada foto stok yang sesuai dan aman untuk tema ini). Ganti dengan poster asli bila
  tersedia.

## Kualitas & pengujian

Pada commit ini:

- `npm run lint`, `npm run typecheck`, dan `npm run build` bersih tanpa peringatan.
- 73 halaman dihasilkan saat build.
- **41 alur diuji ujung ke ujung di peramban**, mencakup: pendaratan QR beserta
  penanda sumber, pendaftaran multi-anak, total harga, tiga skenario pembayaran
  (gratis / website / pihak ketiga), simulasi pembayaran gagal lalu berhasil,
  penolakan usia di luar rentang kelas, penolakan kontak yang tidak cocok saat
  check-in, penerbitan sertifikat setelah kehadiran, verifikasi sertifikat publik,
  penjagaan rute ERP, pembatasan peran STAFF, dashboard, pencarian global,
  generator QR, seluruh halaman ERP, dan perubahan status pembayaran manual.
- Salah satu tes membuktikan **situs publik dan ERP memang berbagi data**:
  pendaftaran yang dibuat lewat situs publik langsung muncul di tabel ERP.
- Sapuan responsif dan aksesibilitas pada **360 / 390 / 768 / 1280 px** (publik) dan
  **390 / 768 / 1366 px** (ERP): tidak ada scroll horizontal, gambar rusak, teks
  alternatif hilang, kontrol tanpa label, maupun hydration error.

## Deploy

Dikonfigurasi untuk Vercel (`vercel.json`, region `sin1`). Build standar Next.js tanpa
langkah tambahan.

```bash
vercel --prod
```

Setelah domain final diketahui, set `NEXT_PUBLIC_SITE_URL` di environment variables Vercel
agar metadata SEO dan sitemap memakai URL yang benar.

## Batasan versi ini

- **Data tersimpan di peramban.** Pendaftaran, pembayaran, kehadiran, dan sertifikat
  memakai localStorage, jadi tidak lintas perangkat dan hilang bila data situs
  dibersihkan. Data seed selalu tersedia sebagai dasar.
- **Autentikasi ERP simulasi.** Cookie sesi ditandatangani HMAC sehingga tidak bisa
  dipalsukan dengan mengedit nilainya, tetapi akunnya fixture tanpa kata sandi
  terenkripsi. Bukan autentikasi produksi.
- **Payment gateway simulasi.** Tombol "Bayar Sekarang" hanya mengubah status.
- **Harga setiap kelas masih placeholder** dan wajib diganti dengan angka sebenarnya.
- Kegiatan dan galeri di ERP masih **baca saja**; form CRUD menunggu backend dan
  penyimpanan objek.
- Statistik pemindaian QR belum ada — yang tercatat baru sumber pendaftaran.
- Tanggal event bersifat statis; halaman yang bergantung tanggal diregenerasi tiap
  jam (`revalidate = 3600`).
- Sebagian besar foto adalah stok placeholder. Cover Tentara Cilik dan Pemadam Cilik
  adalah ilustrasi datar buatan sendiri; poster Pemadam Cilik memakai artwork asli.
- Alamat email pada footer masih placeholder.
