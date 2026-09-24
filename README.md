# Kelas Bermain

Situs publik untuk **Kelas Bermain** — aktivitas kreatif dan edukatif untuk anak usia
**3–15 tahun di Jabodetabek**. Menampilkan jadwal kelas, dokumentasi kegiatan, dan galeri,
lengkap dengan alur pendaftaran, kehadiran, dan sertifikat peserta.

> **Status: versi demo dengan data dummy.**
> Judul kelas, tanggal, lokasi, daftar aktivitas, dan benefit mengikuti unggahan
> [@kelasbermain.id](https://instagram.com/kelasbermain.id). **Harga masih placeholder** —
> poster Instagram tidak mencantumkan biaya. Pendaftaran, kehadiran, dan penerbitan
> sertifikat berjalan di peramban (localStorage) dan **belum** terhubung ke basis data
> produksi mana pun. Arsitekturnya sudah disiapkan agar penggantian ke CMS/database tidak
> menyentuh satu pun komponen UI — lihat [Mengganti data dummy](#mengganti-data-dummy).

### Catatan penting

- **Seluruh kelas berstatus berbayar** (`registrationType: "PAID"`). Jalur `FREE` tetap
  didukung model data dan layanan, hanya tidak dipakai oleh data saat ini.
- **Tidak ada nomor telepon di seluruh situs**, sesuai notulen rapat — meskipun bio dan
  poster Instagram mencantumkan nomor WhatsApp. Kontak publik hanya email dan Instagram.
  Untuk menampilkannya, tambahkan entri pada `socialLinks` di `src/data/site.ts`.
- **Logo digambar ulang** dari profil Instagram sebagai SVG di
  `src/components/brand/logo.tsx` (dan `src/app/icon.svg`). Ganti dengan berkas asli bila
  sudah tersedia agar sama persis.

---

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
`clsx`, `tailwind-merge`. Tidak ada pustaka form, state manager, atau animasi tambahan.

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

Keduanya opsional. `NEXT_PUBLIC_GALLERY_DRIVE_URL` hanya perlu diisi bila folder Drive
berpindah tanpa ingin mengubah kode.

Tidak ada API key, token, atau kredensial apa pun di repositori ini.

## Rute

| Rute | Isi |
| --- | --- |
| `/` | Landing page: hero, nilai program, event terdekat, cara ikut, statistik, kegiatan, testimoni, media sosial |
| `/event` | Jadwal kelas + filter status (Semua / Akan Datang / Sedang Berlangsung / Selesai) dan kategori |
| `/event/[slug]` | Halaman detail event (satu template untuk semua event) |
| `/event/[slug]/daftar` | Formulir pendaftaran + status sukses; instruksi pembayaran untuk event berbayar |
| `/event/[slug]/attendance` | Formulir konfirmasi kehadiran peserta |
| `/kegiatan` | Daftar kegiatan + filter kategori |
| `/kegiatan/[slug]` | Detail kegiatan: linimasa, sorotan, galeri, kegiatan terkait |
| `/galeri` | Galeri publik: banner utama + tautan ke folder Google Drive (bukan grid foto) |
| `/sertifikat` | Verifikasi sertifikat berdasarkan nomor sertifikat atau ID pendaftaran |
| `/sertifikat/[id]` | Tampilan sertifikat + cetak/unduh |
| `/sitemap.xml`, `/robots.txt` | Dihasilkan otomatis dari data konten |

Galeri **tidak memerlukan login** — seluruh isinya terbuka untuk umum.

## Model konten

Kategori kelas: **Profesi, Kuliner, Alam, Kreatif, Eksplorasi, Outdoor** — masing-masing
punya satu warna tetap yang diambil dari empat kotak pada logo (merah, kuning, hijau, ungu).

Dua bidang yang spesifik untuk program anak:

- `ageRange: [min, max]` pada `EventRecord` — ditampilkan di kartu kelas dan halaman detail,
  karena ini hal pertama yang dicari orang tua.
- `parentName` pada `Registration` — formulir mendata **anak** (nama, usia, sekolah) dan
  **orang tua/wali** (nama, email, WhatsApp) secara terpisah.

### Poster desainer (format Instagram)

`EventRecord` punya bidang opsional `poster` untuk artwork asli dari tim desain — biasanya
potret 4:5 sesuai ukuran Instagram. Aset ini **tidak pernah dipotong**:

- **Kartu event** menampilkan poster secara utuh (`object-contain`) di atas salinan dirinya
  sendiri yang diburamkan, sehingga tinggi semua kartu di grid tetap sejajar.
- **Halaman detail** menampilkan poster pada ukuran penuh di blok "Poster Kegiatan".

Artinya aset yang dibuat untuk Instagram bisa langsung dipakai di website tanpa perlu
versi lanskap terpisah. Contohnya ada pada event `pemadam-cilik-oktober-2026`.

> **Perhatian:** poster Pemadam Cilik memuat nomor WhatsApp yang tercetak di dalam gambar.
> Aturan "tanpa nomor telepon" hanya berlaku pada teks situs; nomor di dalam artwork tetap
> terlihat pengunjung. Potong bagian bawah poster bila nomor tersebut tidak boleh tampil.

### Catatan halaman Galeri

Sesuai notulen rapat dengan direktur, area **di bawah banner berisi tautan, bukan grid
foto**: dokumentasi lengkap disimpan di satu folder Google Drive dan halaman Galeri hanya
menautkannya. Isi tautan lewat `NEXT_PUBLIC_GALLERY_DRIVE_URL` atau pada
`src/data/gallery.ts` (`galleryDrive.url`).

Grid foto beserta lightbox-nya **tetap dipakai di halaman detail kegiatan**
(`/kegiatan/[slug]`), yang menampilkan foto milik kegiatan tersebut.

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

## Mengganti data dummy

### 1. Konten (event, kegiatan, galeri, pembicara, testimoni)

Semua fungsi baca ada di `src/lib/services/content.ts` dan **sudah `async`**, meskipun saat
ini hanya membaca array statis:

```ts
export async function getEvents(now = new Date()): Promise<EventView[]>
export async function getEventBySlug(slug: string): Promise<EventView | null>
export async function getActivities(): Promise<ActivityRecord[]>
export async function getGalleryItems(): Promise<GalleryItem[]>
```

Untuk pindah ke CMS/database, ganti isi fungsi-fungsi tersebut dengan query — selama nilai
kembaliannya tetap mengikuti tipe di `src/lib/types.ts`, tidak ada komponen yang perlu
disentuh.

Dua hal yang perlu dipertahankan:

- **Status event dihitung di server**, lewat `resolveLifecycle()` di `lib/utils/date.ts`.
  Nilainya diturunkan sebagai prop, sehingga markup server dan klien selalu sama dan tidak
  terjadi hydration mismatch.
- **Bentuk data di `src/data` sengaja dibuat menyerupai kolom tabel**, supaya pemetaan ke
  skema basis data nantinya berjalan lurus.

### 2. Pendaftaran, kehadiran, dan sertifikat

| Berkas | Perannya sekarang | Penggantinya nanti |
| --- | --- | --- |
| `lib/services/registration.ts` | Menyimpan pendaftaran ke localStorage | `POST /api/registrations` atau Supabase client |
| `lib/services/attendance.ts` | Mencatat kehadiran, menerima `source: "form" \| "qr"` | Endpoint absensi + pemindaian QR |
| `lib/services/certificate.ts` | Menerbitkan & memverifikasi sertifikat | Endpoint sertifikat |
| `lib/services/payment.ts` | `MockPaymentProvider` → instruksi transfer manual | Implementasi `PaymentProvider` untuk Midtrans/Xendit/Stripe |
| `lib/repositories/*.ts` | Adapter localStorage | Adapter database |

Antarmukanya sudah ditetapkan, jadi penggantian cukup menukar implementasi. Contoh:
`payment.ts` mengekspor `interface PaymentProvider`; cukup buat implementasi baru lalu ubah
satu baris `export const paymentProvider`.

### 3. Penomoran sertifikat

Format: `KB-<tahun>-<urutan 5 digit>` — contoh `KB-2026-00125`.

Logikanya terisolasi di `lib/utils/certificate.ts` (`formatCertificateNumber`,
`parseCertificateNumber`, `nextCertificateNumber`). Saat ini urutan dihitung dari sertifikat
yang sudah ada. **Di produksi, ganti `nextCertificateNumber` dengan sequence/identity column
database** agar nomor tetap unik saat ada penulisan bersamaan.

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
- 48 halaman dihasilkan sebagai HTML statis.
- Diuji di peramban pada lebar 360 / 390 / 768 / 1280 px: tidak ada scroll horizontal,
  tidak ada gambar gagal muat, tidak ada hydration error.
- 28 alur diuji ujung ke ujung: menu seluler, filter event (termasuk deep link `?filter=`),
  validasi anak + orang tua, penolakan usia di luar 3–15, pendaftaran berbayar beserta
  instruksi pembayaran dan status menunggu bayar, kelas dengan kuota penuh, pencatatan
  kehadiran, penolakan kontak yang tidak cocok, penerbitan sertifikat bernomor unik,
  verifikasi sertifikat, tautan Drive pada halaman Galeri, lightbox pada halaman detail
  kegiatan, serta pemeriksaan bahwa tidak ada nomor telepon di halaman mana pun.
- Daftar event dan formulir dirender di server (bukan skeleton), sehingga isinya terbaca
  tanpa menjalankan JavaScript. Halaman yang bergantung pada tanggal diregenerasi tiap jam
  (`revalidate = 3600`) agar status "Akan Datang"/"Selesai" tidak basi.

## Deploy

Dikonfigurasi untuk Vercel (`vercel.json`, region `sin1`). Build standar Next.js tanpa
langkah tambahan.

```bash
vercel --prod
```

Setelah domain final diketahui, set `NEXT_PUBLIC_SITE_URL` di environment variables Vercel
agar metadata SEO dan sitemap memakai URL yang benar.

## Batasan versi ini

- Data pendaftaran/kehadiran/sertifikat tersimpan di peramban pengguna, jadi tidak lintas
  perangkat dan hilang bila data situs dibersihkan.
- Tidak ada payment gateway sungguhan; instruksi transfer bersifat contoh.
- Tanggal event bersifat statis. Seiring waktu, event "akan datang" akan berpindah sendiri
  ke "selesai" karena statusnya dihitung dari tanggal sebenarnya.
- Belum ada panel admin, autentikasi, maupun absensi QR (jalur kodenya sudah disiapkan).
- **Harga setiap kelas masih placeholder** dan wajib diganti dengan angka sebenarnya.
- Alamat email pada footer masih placeholder; Instagram adalah satu-satunya kanal kontak
  yang terkonfirmasi.
- Poster Pemadam Cilik beresolusi 595×739 px (hasil tangkapan layar). Minta berkas asli dari
  tim desain agar tajam pada layar beresolusi tinggi.
- Tautan folder Google Drive pada halaman Galeri belum diisi; halaman menampilkan status
  "belum diatur" sampai URL asli dimasukkan.
