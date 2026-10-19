# Kelas Bermain — Platform Digital

Dua aplikasi dalam satu basis kode, berbagi satu basis data:

1. **Situs publik** untuk orang tua — jadwal kelas, pendaftaran lewat QR, transfer manual,
   check-in, dan verifikasi sertifikat.
2. **ERP internal** (`/admin`) untuk staf — pendamping, anak, event, pendaftaran, pembayaran,
   kehadiran, sertifikat, voucher, affiliate, CMS situs, dan laporan.

Kelas Bermain adalah aktivitas kreatif dan edukatif untuk anak **3–15 tahun di Jabodetabek**.

### Catatan penting

- **Basis data Postgres sendiri**, bukan Supabase. Dulu aplikasi ini jalan di atas Supabase
  (Auth + RLS + fungsi SECURITY DEFINER); sekarang semuanya lewat Prisma ke Postgres biasa,
  dengan sesi admin dan pemeriksaan hak akses ditulis di aplikasi sendiri
  (`src/lib/auth/session.ts`, `src/lib/admin/auth.ts`). Lihat bagian **Riwayat migrasi**
  di bawah kalau menemukan berkas yang masih menyebut Supabase.
- **Pembayaran transfer manual.** Tidak ada payment gateway. Orang tua transfer lalu
  mengunggah bukti; admin memverifikasi dan menekan "Konfirmasi Lunas" di `/admin/payments`.
  Tidak ada jalur kode yang bisa menandai pembayaran lunas tanpa admin.
- Hampir semua kelas berbayar. Satu event gratis (**Open House**) sengaja ada agar
  alur `FREE` benar-benar teruji, bukan hanya didukung model data.

## Tech stack

| Bagian | Pilihan |
| --- | --- |
| Framework | Next.js 15 (App Router, React 19, Server Components) |
| Bahasa | TypeScript (strict) |
| Basis data | PostgreSQL, diakses lewat Prisma — tidak ada Supabase, tidak ada RLS |
| Auth | Sesi sendiri: argon2/bcrypt + cookie httpOnly (`src/lib/auth/session.ts`) |
| Media | Disk lokal (`UPLOAD_DIR`), dilayani lewat `/uploads/[...path]` |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) |
| Ikon | lucide-react + SVG kustom untuk logo & ikon media sosial |
| Font | Plus Jakarta Sans + Fraunces (via `next/font`, self-hosted saat build) |
| Gambar | `next/image`, aset lokal + media diunggah |
| Deploy | Vercel *atau* VPS (lihat catatan Postgres lokal di bawah) |

## Menjalankan proyek

```bash
npm install
npm run db:start    # Postgres lokal dari node_modules — tanpa Homebrew/Docker
npx prisma migrate deploy
npm run dev          # http://localhost:3000
npm run build        # build produksi
npm run start         # jalankan hasil build
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run qa             # smoke test situs publik (Firefox headless)
npm run qa:registration # smoke test alur pendaftaran
```

`npm run db:start` menjalankan Postgres sungguhan lewat paket `embedded-postgres`,
cocok untuk mesin tanpa Homebrew atau Docker (lihat `scripts/db.mjs`). Di server
produksi, arahkan `DATABASE_URL` ke Postgres yang sudah ada — skrip ini hanya untuk
pengembangan lokal.

Node 20+ disarankan (dikembangkan dengan Node 22).

## Variabel lingkungan

Lihat `.env.example` untuk daftar lengkap beserta penjelasannya. Yang wajib:

| Nama | Fungsi |
| --- | --- |
| `DATABASE_URL` | Koneksi Postgres. Tanpa ini aplikasi tidak bisa membaca atau menulis apa pun. |

Semua yang lain opsional dan punya nilai bawaan yang masuk akal — lihat `.env.example`.

Tidak ada kunci service-role, tidak ada bypass RLS, tidak ada kredensial Supabase
di repositori ini.

## Rute

### Situs publik

| Rute | Isi |
| --- | --- |
| `/` | Landing: hero, nilai, jadwal terdekat, cara ikut, statistik, kegiatan, galeri, testimoni, media sosial |
| `/event` | Jadwal kelas + filter status dan kategori |
| `/event/[slug]` | Detail kelas (satu template untuk semua kelas) |
| `/register/[eventSlug]` | **Halaman pendaratan QR** — pendaftaran 4 langkah, draf tersimpan otomatis |
| `/payment/[registrationId]` | Status pembayaran + unggah bukti transfer |
| `/attendance/[eventSlug]` | Check-in kehadiran peserta |
| `/cek-tiket` | Cek status pendaftaran lewat nomor pendaftaran + kontak |
| `/certificate/[certificateId]`, `/sertifikat` | Verifikasi sertifikat publik |
| `/kegiatan`, `/kegiatan/[slug]` | Dokumentasi kegiatan |
| `/galeri` | Banner + tautan folder Google Drive (diatur dari CMS) |
| `/update` | Feed Instagram (disinkronkan lewat Apify, lihat di bawah) |
| `/affiliate` | Pendaftaran program affiliate |

URL lama (`/event/[slug]/daftar`, `/event/[slug]/attendance`, `/sertifikat/[id]`, `/tiket`)
tetap hidup lewat redirect permanen — materi cetak lama tidak rusak.

### ERP internal (`/admin`)

| Rute | Isi |
| --- | --- |
| `/admin/login` | Masuk — sesi sungguhan, bukan simulasi |
| `/admin` | Dashboard: statistik + pendaftaran terbaru |
| `/admin/customers`, `/admin/customers/[id]` | Pendamping + profil, anak, pendaftaran, pembayaran |
| `/admin/children` | Anak |
| `/admin/events`, `/admin/events/[id]` | Event |
| `/admin/registrations` | Pendaftaran + filter + ekspor CSV |
| `/admin/payments` | Pembayaran, bukti transfer, konfirmasi/tolak/refund |
| `/admin/finance` | Buku keuangan |
| `/admin/attendance` | Tandai kehadiran manual |
| `/admin/certificates` | Terbitkan & kelola sertifikat |
| `/admin/vouchers` | Voucher diskon |
| `/admin/affiliates` | Setujui/tolak pendaftar affiliate, lihat statistik |
| `/admin/cms` | Website builder — bagian halaman, koleksi, navigasi, tema, template sertifikat |
| `/admin/media` | Pustaka media (unggah, cari, hapus) |
| `/admin/users` | Kelola admin — buat akun, atur peran, ganti/reset kata sandi |
| `/admin/reports` | Laporan tersaring + ekspor CSV |
| `/admin/activity-log` | Jejak audit setiap perubahan |
| `/admin/panduan` | Panduan pemakaian ERP |

Seluruh `/admin/*` dijaga dua lapis: middleware memeriksa ada-tidaknya cookie sesi
(ini cepat tapi tidak bisa memvalidasi — berjalan di edge runtime), dan setiap
halaman/aksi memanggil `requireAdmin()` yang membaca sesi dari database. Middleware
yang keliru hanya membuat orang terlihat masuk; `requireAdmin()` yang sebenarnya
menolak.

## Alur

### QR → pendaftaran

```
QR di poster / banner / lokasi
  → /register/<slug>?source=poster
  → Data Peserta (bisa Personal atau Group — beberapa pendamping sekaligus)
  → Konfirmasi → kirim
  → Server action createRegistration: satu transaksi Postgres —
    pendamping, anak, pendaftaran, tagihan tersimpan bersama atau tidak sama sekali
  → Tombol "Lanjut ke Pembayaran" → WhatsApp dengan nomor pendaftaran terisi otomatis
```

Harga dan ketersediaan kuota dihitung ulang di server saat kirim — nilai yang
dikirim browser hanya dipakai untuk dibandingkan, tidak pernah dipercaya begitu
saja. Draf formulir tersimpan di localStorage perangkat supaya refresh tidak
menghapus isian.

### Pembayaran — transfer manual

| Langkah | Siapa |
| --- | --- |
| Transfer ke rekening yang tertera | Orang tua |
| Unggah bukti transfer di `/payment/[id]` | Orang tua |
| Pembayaran berubah ke `WAITING_VERIFICATION` | Otomatis |
| Admin memeriksa bukti, menekan Konfirmasi Lunas atau Tolak | Admin, di `/admin/payments` |
| Pembayaran jadi `PAID` (atau `REJECTED` dengan alasan) + nomor invoice terbit + tercatat di buku keuangan | Satu fungsi database, satu transaksi |

Tidak ada kode di mana pun — di server action, di service, di fungsi database
manapun — yang bisa menandai pembayaran `PAID` tanpa admin menekan tombol itu.

### Kehadiran → sertifikat

```
/attendance/<slug>
  → verifikasi nomor pendaftaran + kontak orang tua
  → attendanceStatus = PRESENT, certificateStatus = AVAILABLE
  → admin menerbitkan sertifikat di /admin/certificates
  → /certificate/<nomor> atau /sertifikat bisa diverifikasi publik
```

### Instagram → halaman Update

```
Cron tengah malam (vercel.json, atau crontab di VPS)
  → /api/cron/instagram (dikunci CRON_SECRET)
  → Apify menjalankan browser di sisi mereka, mengembalikan postingan terbaru
  → gambar diunduh ke disk, postingan masuk sebagai DRAF di CMS
  → admin menekan Terbitkan di /admin/cms
```

Cadangan gratis kalau kuota Apify habis: `npm run instagram:scrape` menjalankan
Firefox headless dari laptop (Instagram memblokir IP datacenter, jadi ini tidak
bisa dijalankan dari server).

## Struktur proyek

```
src/
  app/                      # Rute App Router (publik + /admin) + metadata per halaman
  components/
    admin/                  # Komponen ERP (tabel, dialog konfirmasi, editor CMS)
    brand/                  # Logo & ikon media sosial
    certificate/            # Kartu sertifikat, viewer, formulir verifikasi
    event/                  # Kartu event, filter, panel registrasi
    forms/                  # Field primitif + formulir pendaftaran & kehadiran
    gallery/                # Grid masonry + lightbox
    home/                   # Bagian-bagian landing page
    layout/                 # Header, footer
    registration/           # Wizard pendaftaran, checkout, tiket
    ui/                     # Button, Badge, Container, Skeleton, EmptyState
  data/                     # Konten statis bawaan (fallback kalau CMS kosong)
  lib/
    admin/                  # Gerbang hak akses, aktor database, unggah, media
    auth/                   # Sesi admin (hash, cookie, verifikasi)
    cms/                    # Skema CMS, template bagian, preset tema
    config/                 # Lokasi penyimpanan, nomor WhatsApp
    services/               # Batas antara UI dan basis data — SATU TEMPAT per domain
    utils/                  # Tanggal, format, validasi
    db.ts                   # Klien Prisma tunggal (singleton)
    types.ts                # Model domain
  middleware.ts              # Penjaga cepat /admin — bukan gerbang sesungguhnya
prisma/
  schema.prisma              # Skema basis data
  migrations/                 # Riwayat migrasi, termasuk fungsi & trigger yang dibawa dari Supabase
public/images/                # Foto bawaan (aset lokal)
public/uploads/                # Media yang diunggah admin + hasil sinkron Instagram
scripts/                       # Alat pengembangan + migrasi satu kali (lihat di bawah)
```

### Aturan yang dijaga

Komponen **tidak pernah** memuat konten secara langsung. Halaman mengambil data
lewat `lib/services/*.ts`, lalu meneruskannya ke komponen sebagai prop. Modul
layanan yang dipanggil dari komponen klien (`"use client"`) ditandai
`"use server"` dan menjalankan pemeriksaan hak aksesnya sendiri — Prisma tidak
bisa dan tidak boleh dipanggil langsung dari browser.

## Arsitektur data

```
PostgreSQL (Prisma)
      ↓
src/lib/services/      content · registration · payment · attendance ·
                       certificate · voucher · affiliate · cms · report
      ↓
komponen UI            hanya menerima props
```

Setiap tulisan yang menyentuh uang atau hak akses (konfirmasi pembayaran,
refund, terbitkan sertifikat, kelola pengguna) memanggil fungsi `admin_*`
di database lewat `src/lib/admin/actor.ts` (`asAdmin`), yang membungkus
panggilannya dalam satu transaksi dan mengisi `app.user_id` supaya fungsi
database tahu siapa yang bertindak — pengganti `auth.uid()` milik Supabase.
Fungsi itu memeriksa hak akses DI DALAM database, jadi aturannya tetap
berlaku dua lapis sekalipun satu pemanggil di aplikasi lupa memeriksa.

### Penomoran

| Entitas | Format | Contoh |
| --- | --- | --- |
| Pendamping | `KB-CUS-<5 digit>` | `KB-CUS-00001` |
| Anak | `KB-CHD-<5 digit>` | `KB-CHD-00001` |
| Pendaftaran | `KB-REG-<tahun>-<5 digit>` | `KB-REG-2026-00001` |
| Invoice | `INV-<tahun>-<5 digit>` | `INV-2026-00001` |
| Sertifikat | `KB-<tahun>-<5 digit>` | `KB-2026-00125` |
| Affiliate | kode acak 8 karakter, dibuat trigger database saat disetujui | `KLBMX7Q2` |

### Peran ERP

| Peran | Akses |
| --- | --- |
| `SUPER_ADMIN` | seluruh menu, termasuk Pengguna, refund, dan hapus data permanen |
| `ADMIN` | semua operasional, keuangan, dan website; tidak bisa mengelola pengguna lain |
| `STAFF` | akses terbatas ke menu operasional sehari-hari |

Setiap aksi memeriksa perannya sendiri lewat `requireAdmin()` / `requireRole()` —
menu yang disembunyikan di tampilan bukan satu-satunya penjaga.

## Riwayat migrasi: Supabase → Postgres

Proyek ini awalnya dibangun di atas Supabase (Postgres terkelola + Auth + RLS +
fungsi SECURITY DEFINER). Semuanya sudah dipindahkan ke Postgres polos dengan
Prisma; tidak ada lagi ketergantungan pada `@supabase/*` di kode aplikasi.
Beberapa jejak sengaja dibiarkan karena berguna:

- `prisma/migrations/*_logika_database/` — 24 fungsi dan 3 trigger yang dulu
  hidup di Supabase, dibawa apa adanya (bukan ditulis ulang) supaya perilakunya
  identik dengan yang sudah teruji bertahun-tahun.
- `scripts/migrate-data.mjs`, `scripts/migrate-storage.mjs`,
  `scripts/rewrite-media-urls.mjs` — alat migrasi satu kali. Aman dijalankan
  ulang (idempotent) tapi tidak dipakai aplikasi yang berjalan; boleh dihapus
  kapan saja setelah cutover selesai dan terbukti stabil.
- Komentar yang menyebut "dulu di Supabase ini begini..." di beberapa berkas
  (`src/lib/auth/session.ts`, `src/lib/admin/actor.ts`) — dipertahankan karena
  menjelaskan KENAPA kodenya berbentuk begitu, bukan sekadar sejarah.

Kalau menemukan berkas lain yang masih menyebut Supabase di luar daftar ini,
itu kemungkinan sisa yang belum sempat dibersihkan — aman dihapus setelah
diperiksa tidak ada yang memanggilnya.
