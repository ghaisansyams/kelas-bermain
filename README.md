# Kelas Bermain

Situs publik untuk program **Kelas Bermain** — menampilkan event, kegiatan, dan galeri,
lengkap dengan alur pendaftaran, kehadiran, dan sertifikat peserta.

> **Status: versi demo dengan data dummy.**
> Seluruh konten pada `src/data` adalah data contoh. Pendaftaran, kehadiran, dan penerbitan
> sertifikat berjalan di peramban (localStorage) dan **belum** terhubung ke basis data
> produksi mana pun. Arsitekturnya sudah disiapkan agar penggantian ke CMS/database tidak
> menyentuh satu pun komponen UI — lihat [Mengganti data dummy](#mengganti-data-dummy).

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

Tidak ada API key, token, atau kredensial apa pun di repositori ini.

## Rute

| Rute | Isi |
| --- | --- |
| `/` | Landing page: hero, nilai program, event terdekat, cara ikut, statistik, kegiatan, testimoni, media sosial |
| `/event` | Daftar event + filter status (Semua / Akan Datang / Sedang Berlangsung / Selesai) dan kategori |
| `/event/[slug]` | Halaman detail event (satu template untuk semua event) |
| `/event/[slug]/daftar` | Formulir pendaftaran + status sukses; instruksi pembayaran untuk event berbayar |
| `/event/[slug]/attendance` | Formulir konfirmasi kehadiran peserta |
| `/kegiatan` | Daftar kegiatan + filter kategori |
| `/kegiatan/[slug]` | Detail kegiatan: linimasa, sorotan, galeri, kegiatan terkait |
| `/galeri` | Galeri publik: banner utama, filter kategori, grid masonry, lightbox |
| `/sertifikat` | Verifikasi sertifikat berdasarkan nomor sertifikat atau ID pendaftaran |
| `/sertifikat/[id]` | Tampilan sertifikat + cetak/unduh |
| `/sitemap.xml`, `/robots.txt` | Dihasilkan otomatis dari data konten |

Galeri **tidak memerlukan login** — seluruh isinya terbuka untuk umum.

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
- Seluruh foto adalah **stok berlisensi bebas sebagai placeholder** dan perlu diganti dengan
  dokumentasi asli Kelas Bermain sebelum situs dipakai sungguhan.

## Kualitas & pengujian

Pada commit ini:

- `npm run lint`, `npm run typecheck`, dan `npm run build` bersih tanpa peringatan.
- 48 halaman dihasilkan sebagai HTML statis.
- Diuji di peramban pada lebar 360 / 390 / 768 / 1280 px: tidak ada scroll horizontal,
  tidak ada gambar gagal muat, tidak ada hydration error.
- Alur yang diuji ujung ke ujung: menu seluler, filter event (termasuk deep link
  `?filter=`), validasi form, pendaftaran gratis, penolakan email duplikat, pendaftaran
  berbayar beserta instruksi pembayaran, pencatatan kehadiran, penolakan kontak yang tidak
  cocok, penerbitan sertifikat bernomor unik, verifikasi sertifikat, serta lightbox galeri.

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
