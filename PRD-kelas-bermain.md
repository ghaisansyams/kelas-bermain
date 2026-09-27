# PRD — Kelas Bermain

| | |
|---|---|
| **Project** | Kelas Bermain — Website Publik + ERP Internal |
| **Versi dokumen** | 2.1 — revisi Ka Fika dkk; F8 selesai, sisanya siap dikerjakan |
| **Tanggal** | 27 September 2026 |
| **Disusun oleh** | Aji |
| **Sumber revisi** | Grup WhatsApp Kelas Bermain (Ka Fika dkk) |
| **Repository** | `~/Projects/kelas-bermain` |
| **Live** | https://kelas-bermain.vercel.app |

---

## Revision Log

| Rev | Tanggal | Sumber | Ringkasan | Status |
|-----|---------|--------|-----------|--------|
| 1.0 | 27 Sep 2026 | — | Baseline as-built | ✅ Terbangun |
| 2.0 | 27 Sep 2026 | Grup WA Kelas Bermain | 9 item revisi: program affiliate, form pendaftaran disederhanakan, multi-ortu, pembayaran transfer manual, statistik dihapus, sertifikat disembunyikan, kotak kontak 6 kanal | 📋 Direncanakan |
| 2.1 | 27 Sep 2026 | Development | **F8 selesai** — R-05, R-06, R-07, R-08 terpasang dan terverifikasi (109 pemeriksaan browser lolos) | ✅ Terbangun |

### Daftar item revisi

| # | Item | Jenis | Section terdampak | Dampak |
|---|------|-------|-------------------|--------|
| **R-01** | Program Affiliate — pendaftaran affiliator, kode pribadi, komisi Rp10.000/peserta, cair H-1, bonus diskon 50% | 🆕 Modul baru | 3, 4, 6, 7, 8, 9, 10, 12, 13 | Besar |
| **R-02** | Form pendaftaran disesuaikan dengan form WA yang benar-benar dipakai | 🔄 Ubah | 6, 8 | Sedang |
| **R-03** | Satu pendaftaran boleh berisi beberapa anak dengan **orang tua berbeda** | 🔄 Ubah | 7, 8, 10 | Sedang |
| **R-04** | Pembayaran = transfer bank manual + unggah bukti transfer, bukan payment gateway | 🔄 Ubah | 4, 7, 8, 10, 12 | Besar |
| **R-05** ✅ | Statistik di halaman depan **dihapus** — angkanya tidak boleh dipublikasikan | ➖ Hapus | 4, 6 | Kecil |
| **R-06** ✅ | Fitur Cek Sertifikat **disembunyikan** — tidak ada e-sertifikat | ➖ Sembunyikan | 4, 6, 7, 9, 13 | Sedang |
| **R-07** ✅ | Kotak kontak 6 kanal: IG, WA, Email, Threads, TikTok, Facebook | 🔄 Ubah | 1, 5, 6 | Kecil |
| **R-08** ✅ | Email resmi: `kelasbermain.id@gmail.com` (menjawab Q-08 v1.0) | 🔄 Ubah | 1 | Kecil |
| **R-09** | Data faktual: 5 kegiatan terselenggara sejak 2026, rentang usia 3–15 th | 🔄 Ubah | 1 | Kecil |

---

## ⚠️ Konflik yang harus diputuskan sebelum development

### KONF-01 — Nomor WhatsApp di website publik

| | |
|---|---|
| **Keputusan lama (K-01)** | "Rapat secara khusus meminta media sosial dan **TIDAK ADA nomor telepon**. Karena itu: JANGAN tampilkan nomor telepon di mana pun pada website publik." — notulen rapat direktur |
| **Permintaan baru (R-07)** | Kotak kontak wajib memuat **WA: 081774918611**. Flyer affiliate juga mencantumkan nomor yang sama. |
| **Status** | 🔴 **Bertentangan langsung.** Tidak bisa dijalankan keduanya. |

Program affiliate secara praktis tidak bisa berjalan tanpa nomor WhatsApp — pendaftaran affiliator, grup affiliator, dan konfirmasi bukti transfer semuanya lewat WA. Jadi permintaan baru ini punya alasan operasional yang kuat, bukan sekadar preferensi.

**Rekomendasi:** cabut K-01 dan tampilkan nomor WA. Tapi karena K-01 datang dari permintaan eksplisit direktur di rapat, **Aji perlu konfirmasi ke direktur dulu** — jangan diputuskan sepihak di level development.

**Sampai ada keputusan:** nomor WA dibuat sebagai konfigurasi yang bisa dinyalakan/dimatikan (`NEXT_PUBLIC_SHOW_WHATSAPP`), sehingga keputusan apa pun tidak memerlukan perubahan kode.

### KONF-02 — Batas usia Tentara Cilik menolak peserta yang sebenarnya diterima

Form pendaftaran asli di WA mencatat peserta **ADYATAMA HAMIZAN NUR ADAM, usia 3 tahun 8 bulan, kelas Tentara Cilik**. Di sistem, Tentara Cilik dibatasi **4–15 tahun**, sehingga validasi akan **menolak** pendaftaran ini.

**Artinya salah satu dari dua hal ini benar:** batas usia di sistem salah, atau tim menerima peserta di luar batas secara kasuistis.

**Rekomendasi:** perbaiki batas usia tiap kelas berdasarkan data sebenarnya, **dan** ubah validasi usia dari penolakan keras menjadi peringatan yang bisa dilanjutkan admin — karena kenyataannya tim memang memberi kelonggaran.

### KONF-03 — Harga kelas

Pesan konfirmasi pembayaran menyebut **Rp160.000**. Harga Tentara Cilik di sistem saat ini **Rp285.000** (placeholder yang saya karang untuk demo). Tidak jelas apakah Rp160.000 itu untuk Tentara Cilik atau kelas lain.

**Blocker:** daftar harga asli seluruh kelas dibutuhkan sebelum sistem boleh menerima pembayaran.

### KONF-04 — Statistik yang sedang tayang tidak akurat

Halaman depan **saat ini menampilkan**: "20+ Kegiatan terselenggara", "8 Lokasi mitra", "1.200+ Anak sudah ikut". Angka sebenarnya menurut Ka Fika: **5 kegiatan, sejak 2026**. Jumlah lokasi mitra dan jumlah anak tidak dijawab.

Jadi situs yang sedang live mempublikasikan angka yang jauh melebihi kenyataan. Ini bukan sekadar permintaan penghapusan — ini **koreksi yang mendesak**, dan sebaiknya dikerjakan lebih dulu dari item revisi lain.

> ✅ **Selesai di F8.** Ternyata angka itu ada di **dua tempat**, bukan satu: blok statistik di tengah halaman *dan* strip statistik di dalam hero (`20+ Kegiatan`, `1.200+ Anak`) yang hampir terlewat. Keduanya sudah dihapus. Hero sekarang hanya menampilkan dua fakta yang boleh dipublikasikan: rentang usia 3–15 tahun dan area kegiatan Jabodetabek.

---

## Keputusan yang dikunci (v2.0)

| # | Keputusan | Sumber | Status |
|---|-----------|--------|--------|
| K-01 | Tidak ada nomor telepon di website publik | Notulen direktur | ⚠️ Ditangguhkan — lihat KONF-01 |
| K-02 | Di bawah banner Galeri adalah link Google Drive, bukan grid foto | Notulen direktur | ✅ Tetap |
| K-03 | Nomor WA yang tercetak di dalam poster boleh tampil | Aji | ✅ Tetap |
| K-04 | Semua kelas reguler berbayar; satu Open House gratis dipertahankan | Aji | ✅ Tetap |
| K-05 | Tiga skenario pembayaran harus ada semua | Brief platform | 🔄 Direvisi R-04 — WEBSITE diganti MANUAL_TRANSFER |
| K-06 | Frontend tidak dibangun ulang saat pindah database; akses data lewat repository | Brief awal | ✅ Tetap |
| **K-07** | **Tidak ada e-sertifikat.** Fitur cek sertifikat disembunyikan, bukan dihapus dari kode | Ka Fika (R-06) | 🆕 Baru |
| **K-08** | **Statistik jumlah kegiatan/lokasi/anak tidak dipublikasikan** | Ka Fika (R-05) | 🆕 Baru |
| **K-09** | **Komisi affiliate Rp10.000/peserta, dibayarkan H-1 sebelum kegiatan** | Ka Fika (R-01) | 🆕 Baru |

---

# 1. Project Overview / Product Vision

## Nama project
**Kelas Bermain** — Website Publik + ERP Internal + Program Affiliate

## Deskripsi singkat

Kelas Bermain adalah penyelenggara kelas aktivitas anak usia 3–15 tahun di Jabodetabek. Programnya berbentuk kelas pengalaman satu hari: anak menjadi pemadam cilik, membuat cokelat dari biji kakao, bertani dan memanen sayur, membentuk keramik, atau menghias mini cake. Mottonya *Play • Learn • Grow*.

Produk ini punya tiga sisi yang berbagi satu model data. **Website publik** adalah etalase dan pintu pendaftaran bagi orang tua. **ERP internal** di `/admin` adalah ruang kerja tim: data keluarga, event, pendaftaran, verifikasi pembayaran, kehadiran, laporan, dan QR. **Program affiliate** (baru di v2.0) memungkinkan siapa pun mempromosikan kelas dengan kode pribadi dan mendapat komisi per peserta yang berhasil mendaftar dan membayar.

## Latar belakang

Operasional sebelumnya berjalan sepenuhnya lewat WhatsApp: promosi di Instagram, pendaftaran dengan mengirim form teks ke admin, pembayaran transfer manual yang dikonfirmasi dengan mengirim bukti transfer, dan pencatatan peserta di spreadsheet. Tidak ada nomor pendaftaran yang konsisten dan tidak ada cara mengukur kanal promosi mana yang menghasilkan.

Sistem ini tidak menggantikan cara kerja itu secara paksa — ia memindahkannya ke tempat yang bisa dilacak. Karena itu alur pembayaran tetap transfer manual dengan unggah bukti (R-04), bukan payment gateway: itulah yang benar-benar dipakai tim, dan memaksakan gateway hanya akan membuat sistem ditinggalkan.

## Target user utama

| Kelompok | Siapa | Kebutuhan utama |
|---|---|---|
| **Orang tua** (eksternal) | Ayah/bunda anak 3–15 th di Jabodetabek, menemukan Kelas Bermain dari Instagram atau dari share affiliator | Mendaftarkan anak tanpa harus chat admin satu per satu |
| **Affiliator** (eksternal) 🆕 | Siapa pun yang mau penghasilan tambahan dengan membagikan kelas ke jaringannya | Dapat kode, tahu berapa peserta yang masuk lewat kodenya, dan komisinya cair tepat waktu |
| **Tim operasional** (internal) | Admin dan staf lapangan | Memverifikasi bukti transfer, mengelola kuota, mencatat kehadiran |
| **Pemilik/Direktur** (internal) | Pengambil keputusan | Angka pendapatan, pendaftaran, kehadiran, dan efektivitas affiliate |

## Identitas & kontak resmi (R-07, R-08)

| Kanal | Nilai |
|---|---|
| Instagram | `kelasbermain.id` |
| WhatsApp | `081774918611` ⚠️ tunduk pada KONF-01 |
| Email | `kelasbermain.id@gmail.com` |
| Threads | `kelasbermain.id` |
| TikTok | `kelasbermain.id` |
| Facebook | `kelas bermain` |

> Email `halo@kelasbermain.id` yang dipakai sekarang adalah placeholder dan harus diganti.

## Data faktual organisasi (R-09)

| Data | Nilai | Boleh dipublikasikan? |
|---|---|---|
| Kegiatan terselenggara | 5 | ❌ **Tidak** |
| Sejak tahun | 2026 | ❌ Tidak |
| Jumlah lokasi mitra | _belum dijawab_ | ❌ Tidak |
| Jumlah anak yang pernah ikut | _belum dijawab_ | ❌ Tidak |
| Rentang usia peserta | 3–15 tahun | ✅ Ya (sudah tampil) |

---

# 2. Problem Statement & Goals

## Problem Statement

| # | Masalah | Dampak jika dibiarkan |
|---|---------|----------------------|
| P-01 | Pendaftaran lewat chat WA satu per satu, admin menyalin form teks manual | Admin kehabisan waktu; pendaftaran hilang saat chat menumpuk |
| P-02 | Data peserta tersebar di spreadsheet dan chat | Tidak diketahui keluarga mana yang repeat; alumni tidak bisa dihubungi ulang |
| P-03 | Bukti transfer dikirim sebagai gambar di chat, dicocokkan manual | Rawan terlewat; kuota tidak terkunci tepat waktu; pendapatan tidak terhitung real-time |
| P-04 | Absensi dicatat di kertas | Data kehadiran tidak pernah masuk sistem |
| P-05 | Tidak diketahui promosi mana yang menghasilkan pendaftaran | Anggaran promosi berdasarkan tebakan |
| **P-06** 🆕 | **Tidak ada cara melacak peserta yang datang dari affiliator** | Komisi dihitung manual, rawan salah dan rawan sengketa. Affiliator tidak percaya kalau tidak bisa melihat angkanya |
| **P-07** 🆕 | **Satu keluarga mendaftarkan anak dengan pendamping berbeda harus mengisi form dua kali** | Pengalaman buruk untuk rombongan dan grup arisan/komunitas, padahal itu segmen yang paling sering dibawa affiliator |
| P-08 | Tidak ada etalase resmi selain Instagram | Detail event ditanyakan berulang kali |

## Goals

| # | Tujuan | Success metric |
|---|--------|----------------|
| G-01 | Pendaftaran selesai mandiri tanpa chat | ≥ 80% pendaftaran masuk lewat website/QR |
| G-02 | Satu sumber data pelanggan yang dinormalisasi | 100% pendaftaran punya relasi Orang Tua → Anak → Event; nol duplikat keluarga |
| G-03 | Verifikasi pembayaran punya antrean yang jelas | Bukti transfer terverifikasi < 1 hari kerja; nol pembayaran terlewat |
| G-04 | Kehadiran tercatat digital di hari-H | ≥ 90% peserta ter-check-in |
| **G-05** 🆕 | **Komisi affiliate terhitung otomatis dan cair tepat waktu** | 100% komisi terhitung dari sistem; nol sengketa; semua payout H-1 |
| **G-06** 🆕 | **Affiliator bisa melihat sendiri performa kodenya** | Affiliator tidak perlu bertanya ke admin untuk tahu jumlah peserta dan komisinya |
| G-07 | Sumber pendaftaran terlacak | Setiap pendaftaran punya atribut sumber dan/atau kode affiliate |
| G-08 | Pengambilan keputusan berbasis angka | Dashboard menampilkan pendapatan, pendaftaran, tunggakan, kehadiran, dan performa affiliate per periode |
| G-09 | Frontend siap pindah database tanpa dibangun ulang | Penggantian sumber data hanya menyentuh lapisan repository |

> **Goal yang dihapus dari v1.0:** "Sertifikat bernomor unik dan bisa diverifikasi publik" — dibatalkan oleh R-06/K-07.

---

# 3. User Personas / Roles

## 3.1 Orang Tua / Wali (publik, tanpa login)

Ayah atau bunda yang mencari kegiatan akhir pekan. Mayoritas menemukan Kelas Bermain dari Instagram, dari QR di poster, atau dari **share affiliator di grup WhatsApp/komunitas**. Mengakses lewat ponsel.

- **Hak akses:** seluruh halaman publik tanpa autentikasi. Tidak punya akun.
- **Tujuan:** menemukan kelas yang cocok, mendaftarkan satu anak atau lebih, transfer, unggah bukti, selesai.
- **Batasan:** hanya melihat pendaftarannya sendiri lewat tautan langsung.

## 3.2 Affiliator (publik, akses terbatas) 🆕

Ibu rumah tangga, mahasiswa, guru, atau siapa pun yang punya jaringan dan mau penghasilan tambahan. Modalnya hanya HP. Sering kali juga orang tua peserta.

- **Cara masuk:** mendaftar lewat form publik, lalu diverifikasi admin dan mendapat kode pribadi.
- **Hak akses:** halaman status affiliate miliknya sendiri, diakses lewat kode/tautan pribadi tanpa password.
- **Bisa melihat:** jumlah peserta yang masuk lewat kodenya, status pembayaran mereka (lunas/belum), akumulasi komisi, jadwal pencairan.
- **Tidak bisa melihat:** data pribadi peserta selain inisial/nama depan, data affiliator lain, dan seluruh isi ERP.
- **Tujuan:** tahu kodenya bekerja, dan tahu kapan uangnya cair.

> **Keputusan privasi:** affiliator **tidak** boleh melihat nama lengkap anak, nomor WhatsApp, atau domisili peserta yang mendaftar lewat kodenya. Cukup jumlah, status pembayaran, dan nama depan. Ini data anak di bawah umur — lihat §11.

## 3.3 STAFF (ERP)

Staf lapangan — registrasi ulang, absensi, pendataan.

- **Akses:** Dashboard, Orang Tua, Anak, Pendaftaran, Kehadiran, Laporan.
- **Tidak bisa:** Pembayaran, Event, Affiliate, Kegiatan, Galeri, Pengaturan.
- **Alasan:** staf lapangan tidak perlu dan tidak boleh melihat atau mengubah nominal uang.

## 3.4 ADMIN (ERP)

Admin operasional.

- **Akses:** semua menu STAFF, ditambah Event, Pembayaran (termasuk verifikasi bukti transfer), **Affiliate**, Kegiatan, Galeri.
- **Tidak bisa:** Pengaturan.

## 3.5 SUPER_ADMIN (ERP)

Pemilik/penanggung jawab sistem. Akses penuh termasuk Pengaturan dan pencairan komisi.

### Matriks hak akses (v2.0)

| Menu / Permission | SUPER_ADMIN | ADMIN | STAFF |
|---|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ |
| Orang Tua | ✅ | ✅ | ✅ |
| Anak | ✅ | ✅ | ✅ |
| Event | ✅ | ✅ | ❌ |
| Pendaftaran | ✅ | ✅ | ✅ |
| Pembayaran + verifikasi bukti | ✅ | ✅ | ❌ |
| **Affiliate** 🆕 | ✅ | ✅ | ❌ |
| **Pencairan komisi** 🆕 | ✅ | ❌ | ❌ |
| Kehadiran | ✅ | ✅ | ✅ |
| ~~Sertifikat~~ | 🚫 disembunyikan (K-07) | 🚫 | 🚫 |
| Kegiatan | ✅ | ✅ | ❌ |
| Galeri | ✅ | ✅ | ❌ |
| Laporan | ✅ | ✅ | ✅ |
| Pengaturan | ✅ | ❌ | ❌ |

> Pencairan komisi sengaja dibatasi SUPER_ADMIN: itu transfer uang keluar, dan harus punya satu penanggung jawab.

---

# 4. Scope & Deliverables (MVP Scope)

## In Scope — v2.0

### Website publik
- **Home**: hero, event terdekat, kategori kegiatan, cara ikut, testimoni, seksi Instagram, **kotak kontak 6 kanal** (R-07)
- **Event**: daftar dengan filter status dan kategori
- **Detail Event**: satu template untuk semua event
- **Pendaftaran** `/register/[eventSlug]`: **form disederhanakan** (R-02), **multi-anak dengan pendamping berbeda** (R-03), **field kode affiliate**, **field "Mengetahui Kelas Bermain dari"**
- **Pembayaran** `/payment/[registrationId]`: **instruksi transfer bank + unggah bukti transfer** (R-04)
- **Konfirmasi kehadiran** `/attendance/[eventSlug]`
- **Kegiatan**: halaman kategori dan detail
- **Galeri**: banner + link Google Drive (K-02)
- 🆕 **Jadi Affiliator** `/affiliate`: penjelasan program + form pendaftaran affiliator
- 🆕 **Status Affiliate** `/affiliate/[kode]`: halaman pribadi affiliator
- Halaman status: loading, empty, error, 404

### ERP internal
- **Dashboard**: KPI dua tingkat, filter periode, grafik, rincian kehadiran per event, **widget performa affiliate**
- **CRUD**: Orang Tua, Anak, Event, Pendaftaran, Pembayaran, Kehadiran
- 🆕 **Affiliate**: daftar affiliator, verifikasi pendaftaran, kelola kode, rekap komisi, **antrean pencairan H-1**
- 🆕 **Verifikasi bukti transfer**: antrean pembayaran menunggu dengan pratinjau gambar bukti
- **Generator QR** per event dengan `?source=`
- **Laporan** + ekspor CSV, **ditambah laporan affiliate**
- **Pencarian global**
- **Autentikasi mock** berbasis peran

## Dihapus dari scope v1.0

| Item | Alasan |
|---|---|
| ❌ **Cek Sertifikat** (publik + ERP) | R-06/K-07 — tidak ada e-sertifikat. Kegiatan lama tidak punya kode sertifikat, sebagian kegiatan membagikan sertifikat fisik di lokasi |
| ❌ **Statistik halaman depan** | R-05/K-08 — angka tidak boleh dipublikasikan |
| ❌ **Payment gateway di website** | R-04 — diganti transfer manual. Antarmuka `PaymentGateway` tetap disimpan untuk nanti |

> **Sertifikat disembunyikan, bukan dihapus.** Seluruh kode, tipe, dan data sertifikat tetap di repository di balik flag `FEATURE_CERTIFICATES=false`. Alasannya: kalau nanti Kelas Bermain mulai menerbitkan e-sertifikat, fitur ini tinggal dinyalakan. Menghapusnya berarti membangun ulang dari nol.

## Out of Scope

| Item | Alasan |
|---|---|
| Database sungguhan | Masih data dummy; arsitektur sudah siap migrasi |
| Payment gateway produksi | Diganti transfer manual (R-04) |
| Akun & login untuk orang tua | Pendaftaran harus selesai tanpa buat akun |
| Login berpassword untuk affiliator | Akses lewat tautan pribadi berkode sudah cukup untuk MVP |
| Pencairan komisi otomatis ke rekening | Transfer tetap manual oleh SUPER_ADMIN; sistem hanya menyiapkan daftar dan mencatat |
| Aplikasi mobile native | Website sudah mobile-first |
| Notifikasi WA/email otomatis | Butuh provider berbayar; belum diputuskan |
| Upload foto galeri ke sistem | Foto dikelola di Google Drive (K-02) |
| Scraping Instagram | Seksi Instagram memakai data statis |
| Multi-bahasa | Pasar hanya Indonesia |

## Deliverables

1. Source code lengkap (Next.js, TypeScript strict)
2. Website publik ter-deploy
3. ERP internal dengan tiga akun demo
4. Program affiliate berjalan end-to-end
5. Data dummy realistis termasuk affiliator dan komisi
6. `.env.example` lengkap
7. Dokumen PRD ini
8. Suite verifikasi browser otomatis

---

# 5. Platform & Design

## Platform

**Web only** — satu aplikasi Next.js, dipisah lewat route group `(public)` dan `admin/(shell)`. Mobile-first: website publik dirancang untuk 390px lebih dulu.

Halaman affiliate masuk ke `(public)` karena affiliator bukan pengguna ERP dan tidak boleh melihat chrome admin.

## Mobile Approach

**N/A** — tidak ada aplikasi mobile. Affiliator bekerja "modal HP" lewat browser; tidak ada kebutuhan native. Jika nanti dibutuhkan, Capacitor lebih rasional daripada Flutter karena web-nya sudah ada.

## Design Theme / Style

**Mood:** hangat, ramah, premium — **bukan kekanak-kanakan**. Ini yang membedakan dari kompetitor: mayoritas penyelenggara kelas anak memakai warna mencolok dan font bulat, yang justru membuat orang tua ragu. Kelas Bermain tampil seperti brand yang dipercaya orang dewasa.

**Warna** (token di `src/app/globals.css`):

| Token | Nilai | Peran |
|---|---|---|
| `--color-brand` | `#d93a2b` | Aksi utama, aksen brand |
| `--color-canvas` | `#fcfaf6` | Latar halaman, krem hangat |
| `--color-surface` | `#ffffff` | Kartu dan panel |
| `--color-ink` | `#1e1b18` | Teks utama |
| `--color-pine` | `#0f6b5c` | Positif — lunas, hadir, komisi cair |
| `--color-sun` | `#efa613` | Perlu tindakan — menunggu verifikasi |
| `--color-grape` | `#6b31db` | Kategori data pada grafik |
| `--color-sky` | `#2f6fb5` | Informasi netral |

> Warna brand sempat `#E4572E`, diganti ke `#D93A2B` karena teks putih di atasnya hanya 3,6:1 — gagal WCAG AA. Sekarang 4,6:1.

**Halaman affiliate** memakai sistem desain yang sama persis. Tidak boleh terasa seperti halaman MLM: tanpa angka penghasilan berkedip, tanpa hitung mundur palsu, tanpa testimoni penghasilan. Nada bicaranya jujur dan tenang — Rp10.000 per peserta disebut apa adanya.

**Font:** dua variabel font Next.js. Angka memakai `tabular-nums`.

**Aksesibilitas:** menghormati `prefers-reduced-motion`; target sentuh ≥ 44px; setiap grafik punya tabel `sr-only` setara; identitas tidak pernah lewat warna saja.

## Kotak kontak (R-07)

Blok kontak di footer memuat enam kanal dengan ikon masing-masing:

| Urutan | Kanal | Nilai | Tautan |
|---|---|---|---|
| 1 | Instagram | `@kelasbermain.id` | `https://instagram.com/kelasbermain.id` |
| 2 | WhatsApp ⚠️ | `081774918611` | `https://wa.me/6281774918611` |
| 3 | Email | `kelasbermain.id@gmail.com` | `mailto:` |
| 4 | Threads | `@kelasbermain.id` | `https://threads.net/@kelasbermain.id` |
| 5 | TikTok | `@kelasbermain.id` | `https://tiktok.com/@kelasbermain.id` |
| 6 | Facebook | `Kelas Bermain` | URL halaman FB — **belum diberikan** |

> ⚠️ Baris WhatsApp tunduk pada KONF-01 dan dikendalikan flag `NEXT_PUBLIC_SHOW_WHATSAPP`.
> Ikon Threads, TikTok, dan Facebook belum ada — lucide-react v1 tidak lagi menyediakan ikon brand, jadi ketiganya digambar sebagai SVG inline seperti ikon Instagram yang sudah ada di `src/components/brand/social-icons.tsx`.
> **URL halaman Facebook masih perlu diminta** — "kelas bermain" saja tidak cukup untuk membuat tautan.

---

# 6. Menu & Features List

## 6.1 Orang Tua (Publik)

### Menu: Home (`/`)
- Hero dengan ajakan mendaftar
- Daftar event terdekat
- Kategori kegiatan
- Seksi "Cara Ikut" (4 langkah) — **teks langkah 4 diubah**, tidak lagi menyebut e-sertifikat (R-06)
- Testimoni orang tua
- Seksi Instagram (data statis)
- 🆕 Kotak kontak 6 kanal (R-07)
- ➖ **Seksi statistik dihapus** (R-05)

### Menu: Event (`/event`)
- List seluruh event
- **Filter:** status lifecycle, kategori
- **Urutan:** tanggal mulai terdekat
- Status kosong yang jelas

### Menu: Detail Event (`/event/[slug]`)
Poster, tanggal dan waktu, lokasi, rentang usia, kapasitas dan sisa kuota, agenda per jam, harga, ketentuan, tombol daftar.
➖ Blok kebijakan sertifikat dihapus (R-06).

### Menu: Pendaftaran (`/register/[eventSlug]`) — **direvisi**

**Field data pendamping** (R-02 — mengikuti form WA yang benar-benar dipakai):

| Field | Wajib | Catatan perubahan |
|---|:---:|---|
| Nama Pendamping/Orang Tua | ✅ | Boleh dua nama, contoh "ANNISA/ADAM" — jangan validasi sebagai satu nama |
| No. WhatsApp Aktif | ✅ | — |
| Domisili | ✅ | 🔄 **Menggantikan** Alamat + Kota yang terpisah |
| Email | ⬜ Opsional | 🔄 Dari wajib jadi opsional — form WA tidak memintanya |
| ~~Pekerjaan~~ | — | ➖ **Dihapus** — tidak ada di form asli |

**Field data anak** (per anak):

| Field | Wajib | Catatan perubahan |
|---|:---:|---|
| Nama Anak | ✅ | — |
| Nama Panggilan | ✅ | 🔄 Dari opsional jadi wajib — form asli selalu mengisinya |
| Usia Anak | ✅ | 🔄 Lihat catatan di bawah |
| ~~Jenis Kelamin~~ | ⬜ | ➖ Dipindah ke opsional |
| ~~Asal Sekolah~~ | ⬜ | ➖ Dipindah ke opsional |
| ~~Kelas~~ | ⬜ | ➖ Dipindah ke opsional |
| Catatan Khusus | ⬜ | Tetap opsional — penting untuk alergi |

**Field tingkat pendaftaran:**

| Field | Wajib | Catatan |
|---|:---:|---|
| Kelas yang Diikuti | ✅ | Terisi otomatis dari halaman event |
| **Mengetahui Kelas Bermain dari** | ✅ | 🆕 **Jadi field yang terlihat.** Sebelumnya hanya diambil diam-diam dari `?source=` URL |
| **Kode Affiliate** | ⬜ | 🆕 Divalidasi langsung: kode tidak dikenal → peringatan, bukan penolakan |

> **Catatan Usia vs Tanggal Lahir.** Form WA meminta usia ("3 THN 8 BULAN"); sistem menyimpan tanggal lahir dan menurunkan usia. **Rekomendasi: tetap simpan tanggal lahir** — usia berubah seiring waktu, jadi menyimpan "3 tahun 8 bulan" membuat data basi dalam hitungan bulan dan mustahil dipakai untuk validasi usia di event berikutnya. Yang diubah adalah **tampilannya**: input tetap tanggal lahir, tapi di sebelahnya langsung muncul usia terhitung ("3 tahun 8 bulan") supaya orang tua bisa mencocokkan dengan kebiasaan mereka.

**Opsi "Mengetahui Kelas Bermain dari":** Teman 🆕 · Instagram · TikTok 🆕 · Threads 🆕 · Facebook 🆕 · QR Code · Poster · Banner · Brosur · Affiliator 🆕 · Lainnya 🆕

### Menu: Pembayaran (`/payment/[registrationId]`) — **direvisi total (R-04)**

Tiga skenario:

| Skenario | Alur |
|---|---|
| **GRATIS** | Tidak ada langkah pembayaran. Langsung terkonfirmasi. |
| **TRANSFER MANUAL** 🆕 | Tampilkan nominal + rekening tujuan → orang tua transfer → **unggah bukti transfer** → status `WAITING_VERIFICATION` → admin verifikasi → `PAID` |
| **PIHAK KETIGA** | Peringatan sebelum submit → status `PENDING` → diarahkan ke platform mitra |

**Rekening tujuan** (dikelola di ERP > Pengaturan, **jangan di-hardcode**):

| Bank | Nomor | Atas Nama |
|---|---|---|
| BSI | 5676283270 | Yufika Agustyani |
| BCA | 7360652348 | Yufika Agustyani |

Halaman pembayaran menampilkan: nominal, kedua rekening dengan tombol salin, batas waktu pembayaran, area unggah bukti, dan kalimat yang menjelaskan kuota baru aman setelah bukti diverifikasi.

### Menu: Konfirmasi Kehadiran (`/attendance/[eventSlug]`)
Check-in mandiri dengan verifikasi kontak.

### Menu: Kegiatan (`/kegiatan`, `/kegiatan/[slug]`)
Halaman kategori aktivitas dan detailnya.

### Menu: Galeri (`/galeri`)
Banner + link Google Drive (K-02).

### ➖ Menu: Sertifikat — **DISEMBUNYIKAN** (R-06/K-07)
`/sertifikat` dan `/certificate/[id]` tidak lagi dapat diakses. Tautan "Cek Sertifikat" dihapus dari footer. Rute mengembalikan 404 selama `FEATURE_CERTIFICATES=false`.

### 🆕 Menu: Jadi Affiliator (`/affiliate`)
- Penjelasan program dalam 5 langkah: daftar → gabung grup → share → komisi Rp10.000/peserta → cair H-1
- Penjelasan bonus diskon 50% untuk affiliator yang ikut kegiatan
- **Form pendaftaran affiliator:** Nama Lengkap ✅, No. WhatsApp ✅, Email ⬜, Domisili ✅, Nama Bank ✅, Nomor Rekening ✅, Nama Pemilik Rekening ✅, Alasan bergabung ⬜
- Setelah submit: status "menunggu verifikasi", diarahkan bergabung ke grup WA

### 🆕 Menu: Status Affiliate (`/affiliate/[kode]`)
Halaman pribadi affiliator, tanpa password, diakses lewat tautan berkode.

- Kode affiliate + tombol salin, dan tautan share siap pakai per event
- Ringkasan: total peserta masuk, peserta lunas, komisi terkumpul, komisi sudah cair, komisi akan cair
- Tabel peserta: **nama depan saja**, event, status pembayaran, tanggal, komisi
- Jadwal pencairan per event (H-1)

> Tanpa password memang lebih lemah, tapi halaman ini tidak memuat data pribadi peserta dan kode-nya acak serta panjang. Menambah sistem password untuk affiliator termasuk out of scope MVP.

---

## 6.2 ERP Internal

### Menu: Dashboard (`/admin/dashboard`)
- **Filter periode** menggerakkan seluruh widget: 7 hari / 30 hari / 6 bulan / custom. Granularitas menyesuaikan (≤14 hari → harian, ≤92 hari → mingguan, selebihnya bulanan)
- **KPI utama (4):** Pendapatan Lunas, Total Pendaftaran, **Menunggu Verifikasi** 🔄 (menggantikan Pembayaran Tertunda, dapat diklik ke antrean), Tingkat Kehadiran — masing-masing dengan indikator tren
- **KPI referensi (4):** Orang Tua, Anak, Event Akan Datang, **Affiliator Aktif** 🆕 (menggantikan Sertifikat Terbit yang dihapus)
- **Grafik:** Pendaftaran per Periode, Pendapatan per Periode
- **Panel:** Pendaftaran per Event, Tingkat Kehadiran + rincian per event
- 🆕 **Panel:** Affiliator teratas + komisi jatuh tempo
- **Daftar:** Pendaftaran Terbaru

> **Catatan pembacaan angka.** "Pendapatan Lunas" dan "Pendaftaran Aktif" mengukur dimensi berbeda — yang satu uang masuk sepanjang periode, yang satu pendaftaran yang statusnya masih terbuka saat ini. Angka lunas bisa lebih besar dari angka aktif, dan itu benar. "Menunggu Verifikasi" sengaja **tidak** dibatasi periode: bukti transfer dari minggu lalu tetap harus diperiksa.

### Menu: Orang Tua, Anak, Event, Pendaftaran, Kehadiran
Sama seperti v1.0 — list, detail, create, edit. Event punya sub-halaman QR.

### Menu: Pembayaran (`/admin/payments`) — **direvisi (R-04)**
- 🆕 **Antrean Verifikasi** sebagai tab utama: daftar pembayaran berstatus `WAITING_VERIFICATION` dengan **pratinjau gambar bukti transfer**, tombol Setujui / Tolak, dan kolom alasan penolakan
- List seluruh pembayaran; override status manual
- Menerima `?status=` dari kartu dashboard

### 🆕 Menu: Affiliate (`/admin/affiliates`)
- **Daftar affiliator**: nomor, nama, kode, WhatsApp, jumlah peserta, komisi terkumpul, status
- **Verifikasi pendaftaran affiliator**: setujui → sistem membuat kode unik; tolak → dengan alasan
- **Detail affiliator**: data rekening, riwayat peserta, riwayat komisi, riwayat pencairan
- **Aktif/nonaktifkan** kode
- **Rekap komisi** per event

### 🆕 Menu: Pencairan Komisi (`/admin/affiliates/payouts`) — SUPER_ADMIN saja
- **Antrean H-1**: otomatis mengelompokkan komisi yang jatuh tempo per event, dikelompokkan per affiliator, dengan nama bank dan nomor rekening
- Tandai sudah ditransfer + unggah bukti transfer + catatan
- Riwayat pencairan

### Menu: Kegiatan & Galeri
Read-only. Menunggu object storage.

### Menu: Laporan (`/admin/reports`)
Enam laporan lama + satu baru, semuanya ekspor CSV:

| Laporan | Isi |
|---|---|
| Laporan Pendaftaran | Pendaftaran + status pembayaran, kehadiran, **kode affiliate** |
| Laporan Orang Tua | Data keluarga, jumlah anak, total pembayaran |
| Laporan Anak | Daftar anak, usia, jumlah kelas |
| Laporan Pembayaran | Transaksi per metode, status, **verifikator** |
| Laporan Kehadiran | Kehadiran per event |
| Laporan Event | Ringkasan per event |
| 🆕 **Laporan Affiliate** | Per affiliator: peserta masuk, peserta lunas, komisi, status pencairan |

> ➖ Laporan Sertifikat dihapus (R-06).

### Menu: Pengaturan (`/admin/settings`) — SUPER_ADMIN
- Identitas situs dan **enam kanal kontak** (R-07)
- 🆕 **Rekening penerima pembayaran** (BSI, BCA) — dikelola di sini, bukan di kode
- 🆕 **Nominal komisi affiliate** (default Rp10.000) dan **persentase diskon affiliator** (default 50%)
- 🆕 **Feature flag**: tampilkan WhatsApp, aktifkan sertifikat

### Global
- **Pencarian global** lintas orang tua / anak / event / pendaftaran / pembayaran / **affiliator**
- **Menu akun**: Profil, Pengaturan (sesuai peran), Keluar

### Filter, pencarian, dan urutan per menu

| Menu | Pencarian | Filter | Urutan default |
|---|---|---|---|
| Orang Tua | Nama, nomor pelanggan, email, WhatsApp | Kota, Status | Nomor pelanggan ↑ |
| Anak | Nama, nomor anak, sekolah, nama orang tua | Kelompok usia (3–6/7–10/11–15), Jenis kelamin | Nomor anak ↑ |
| Event | Judul, slug, kota | Lifecycle, Kategori, Status publikasi | Tanggal mulai ↓ |
| Pendaftaran | Nomor, nama anak, nama orang tua, email, WhatsApp | Event, Status pendaftaran, Status pembayaran, Status kehadiran, **Kode affiliate** 🆕 | Tanggal pendaftaran ↓ |
| Pembayaran | Payment ID, referensi, nama pelanggan | Event, Metode, Status | Tanggal dibuat ↓ |
| Kehadiran | Nomor pendaftaran, nama anak | Event, Status kehadiran | Urutan record |
| **Affiliate** 🆕 | Nama, kode, WhatsApp | Status, Event | Komisi terkumpul ↓ |
| **Pencairan** 🆕 | Nama affiliator | Event, Status pencairan | Jatuh tempo ↑ |

Setiap tabel menampilkan penghitung hasil ("menampilkan _n_ dari _N_").

> **Belum ada sorting yang bisa diatur pengguna.** Header kolom tidak bisa diklik, dan tidak ada paginasi. Belum terasa pada volume sekarang, tapi akan jadi masalah di ratusan baris — terutama tabel Pendaftaran setelah program affiliate berjalan. Utang teknis T-09.

---

# 7. User Flow / Workflow

## 7.1 Alur orang tua — via affiliator (alur baru yang paling penting)

```
Affiliator share link + kode di grup WA
  └─> /register/[eventSlug]?ref=KODE
        └─> Kode affiliate terisi otomatis, ditampilkan "Kode FIKA10 dipakai ✓"
              └─> Isi data pendamping (nama, WA, domisili)
                    └─> Tambah anak (1..n)
                          ├─ Anak dengan pendamping sama    ─> pakai data pendamping di atas
                          └─ Anak dengan pendamping berbeda ─> isi pendamping sendiri  (R-03)
                                └─> Validasi usia terhadap rentang event
                                      ├─ di luar rentang ─> PERINGATAN, bisa dilanjutkan (KONF-02)
                                      └─ valid
                                            └─> Pilih "Mengetahui Kelas Bermain dari"
                                                  └─> Konfirmasi: rincian per anak + total
                                                        └─> Submit
                                                              ├─> 1..n Customer  (per pendamping unik)
                                                              ├─> n Child
                                                              ├─> n Registration (KB-REG-2026-NNNNN)
                                                              ├─> 1 Payment      (KB-PAY-2026-NNNNN)
                                                              └─> n AffiliateCommission (status PENDING)
                                                                    └─> /payment/[registrationId]
```

## 7.2 Alur pembayaran transfer manual (R-04)

```
Halaman pembayaran
  ├─ Nominal + rekening BSI & BCA (tombol salin)
  ├─ Batas waktu
  └─ Area unggah bukti transfer
        └─> Orang tua transfer di m-banking
              └─> Unggah bukti (JPG/PNG/PDF, maks 5 MB)
                    └─> Status: WAITING_VERIFICATION
                          └─> Muncul di ERP > Pembayaran > Antrean Verifikasi
                                ├─ Admin SETUJUI
                                │    └─> Status PAID
                                │          ├─> Kuota terkunci
                                │          ├─> Registration CONFIRMED
                                │          └─> AffiliateCommission PENDING -> PAYABLE
                                └─ Admin TOLAK (+ alasan)
                                     └─> Status REJECTED
                                           └─> Orang tua bisa unggah ulang
```

> Perhatikan: komisi affiliate baru menjadi `PAYABLE` setelah pembayaran **diverifikasi**, bukan saat pendaftaran masuk. Ini sesuai aturan "peserta yang daftar **& melakukan pembayaran**".

## 7.3 Alur affiliator — daftar sampai komisi cair

```
/affiliate  ── baca program
  └─> Isi form pendaftaran affiliator (termasuk data rekening)
        └─> Status PENDING_VERIFICATION
              └─> ERP > Affiliate > verifikasi
                    ├─ TOLAK  ─> selesai, dengan alasan
                    └─ SETUJUI
                          └─> Sistem membuat kode unik (mis. FIKA10)
                                └─> Affiliator diundang ke grup WA + terima tautan /affiliate/[kode]
                                      └─> Share ke jaringannya
                                            └─> Peserta daftar & bayar (7.1 + 7.2)
                                                  └─> Komisi Rp10.000/peserta jadi PAYABLE
                                                        └─> H-1 sebelum event:
                                                              ERP > Pencairan Komisi
                                                                └─> Antrean per affiliator + rekening
                                                                      └─> SUPER_ADMIN transfer manual
                                                                            └─> Tandai PAID + unggah bukti
                                                                                  └─> Terlihat di /affiliate/[kode]
```

## 7.4 Alur multi-anak dengan pendamping berbeda (R-03)

Skenario nyata: dua ibu bertetangga mendaftarkan anak masing-masing dalam satu pengisian form.

```
Form pendaftaran
  ├─ Pendamping utama: ANNISA  (kontak penanggung jawab pembayaran)
  ├─ Anak 1: TAMA      ─ pendamping: ANNISA        (centang "sama dengan di atas")
  ├─ Anak 2: KEISHA    ─ pendamping: ANNISA        (centang "sama dengan di atas")
  └─ Anak 3: BILQIS    ─ pendamping: DEWI + WA sendiri  (isi terpisah)
        └─> Submit
              ├─> Customer ANNISA  (pembayar, menerima instruksi transfer)
              ├─> Customer DEWI    (record terpisah, punya riwayat sendiri)
              ├─> Child TAMA -> ANNISA, KEISHA -> ANNISA, BILQIS -> DEWI
              ├─> 3 Registration
              └─> 1 Payment untuk ketiganya, penanggung jawab ANNISA
```

**Aturan:** satu batch pendaftaran punya **satu pembayar** (pendamping utama), tetapi boleh memuat anak-anak dari **beberapa customer**. Ini memisahkan "siapa yang membayar" dari "siapa wali anak ini" — penting agar riwayat keluarga DEWI tetap benar meski ANNISA yang mentransfer.

## 7.5 Alur hari-H

```
Hari acara
  └─> Check-in
        ├─ Mandiri: /attendance/[eventSlug] + verifikasi kontak
        └─ Petugas: ERP > Kehadiran > check-in manual
              └─> attendanceStatus = PRESENT
```

> ➖ Alur penerbitan sertifikat dihapus (R-06). Sertifikat fisik dibagikan di lokasi oleh penyelenggara, di luar sistem.

## 7.6 Alur admin — menyiapkan event

```
ERP > Event > Buat
  └─> Detail, agenda, lokasi, rentang usia, kapasitas
        └─> Skenario pembayaran (GRATIS / TRANSFER MANUAL / PIHAK KETIGA)
              └─> Publish
                    └─> Event > QR > pilih sumber
                          └─> Unduh QR untuk poster
                    └─> Bagikan link + kode ke grup affiliator
```

---

# 8. Functional Requirements

## Authentication

| Aspek | Ketentuan |
|---|---|
| **Website publik** | Tanpa login. Orang tua tidak punya akun. |
| **Affiliator** 🆕 | Tanpa password. Akses lewat tautan berkode `/affiliate/[kode]`. Kode acak minimal 8 karakter, tidak berurutan, tidak bisa ditebak. |
| **ERP** | Wajib login. Seluruh `/admin/*` dijaga middleware kecuali `/admin/login`. |
| **Metode** | Username + password. **Mock authentication** — tiga akun demo hard-coded. |
| **Sesi** | Cookie ditandatangani HMAC-SHA256 (Web Crypto), secret dari `ADMIN_SESSION_SECRET`. |
| **Redirect** | Anonim → `/admin/login?next=<path>`; sudah login membuka login → dashboard. |
| **Otorisasi** | `can(role, permission)` di satu tempat, menggerakkan sidebar dan penjaga halaman. |

**Akun demo:**

| Username | Password | Nama | Peran |
|---|---|---|---|
| `superadmin` | `kelasbermain` | Putri Anggraini | SUPER_ADMIN |
| `admin` | `kelasbermain` | Rangga Mahendra | ADMIN |
| `staff` | `kelasbermain` | Dinda Kurniawati | STAFF |

> Kredensial demo, sengaja publik. **Wajib dihapus** sebelum sistem memegang data asli.

## Validasi

| Form | Aturan |
|---|---|
| Pendaftaran — pendamping | Nama, WhatsApp, Domisili wajib. Email opsional tapi jika diisi harus valid. Nama boleh memuat "/" (contoh "ANNISA/ADAM"). |
| Pendaftaran — WhatsApp | Dinormalkan ke format `62…`; menerima `08…`, `+62…`, dan spasi |
| Pendaftaran — anak | Nama, panggilan, tanggal lahir wajib |
| Pendaftaran — usia | 🔄 **Peringatan, bukan penolakan** (KONF-02). Di luar rentang → "Usia di luar rentang kelas ini (4–15 th). Lanjutkan?" dan pendaftaran ditandai `ageOverride` agar admin bisa meninjau |
| Pendaftaran — duplikat | Satu anak tidak bisa didaftarkan dua kali ke event yang sama |
| Pendaftaran — kuota | Ditolak jika kapasitas penuh |
| Pendaftaran — deadline | Ditolak setelah tanggal penutupan |
| Pendaftaran — kode affiliate | Opsional. Kode tidak dikenal/nonaktif → peringatan lembut, pendaftaran **tetap bisa lanjut** tanpa kode. Jangan pernah menggagalkan pendaftaran karena salah ketik kode. |
| Unggah bukti transfer 🆕 | JPG/PNG/PDF, maksimal 5 MB, wajib sebelum status berubah |
| Pendaftaran affiliator 🆕 | Nama, WhatsApp, Domisili, Nama Bank, Nomor Rekening, Nama Pemilik Rekening wajib. Nomor rekening hanya angka. |
| Kode affiliate 🆕 | Unik seluruh sistem, case-insensitive saat dicocokkan, disimpan huruf besar |
| Check-in kehadiran | Kontak harus cocok dengan data pendaftaran |
| Login ERP | Pesan generik, tidak membocorkan field mana yang salah |

## Aturan bisnis komisi affiliate 🆕

| Aturan | Ketentuan |
|---|---|
| Nominal | Rp10.000 per **peserta** (per anak, bukan per transaksi) |
| Syarat | Peserta mendaftar memakai kode **dan** pembayarannya sudah diverifikasi `PAID` |
| Waktu jatuh tempo | H-1 sebelum tanggal kegiatan |
| Pembatalan | Pendaftaran dibatalkan atau pembayaran ditolak → komisi otomatis `CANCELLED` |
| Diskon affiliator | 50% untuk affiliator yang ikut kegiatan sendiri |

**Pertanyaan terbuka yang perlu dijawab Ka Fika sebelum dikerjakan:**

| # | Pertanyaan | Kenapa perlu diputuskan |
|---|---|---|
| A-01 | Affiliator memakai kodenya sendiri untuk anaknya sendiri — dapat diskon 50% **dan** komisi Rp10.000, atau salah satu saja? | Tanpa aturan, ini celah yang bisa dipakai berulang |
| A-02 | Pembayaran baru diverifikasi **setelah** H-1. Komisinya ikut pencairan berikutnya, atau dibayar terpisah? | Menentukan apakah antrean pencairan perlu status "tertunggak" |
| A-03 | Peserta batal setelah komisi dicairkan — komisi ditarik kembali atau diikhlaskan? | Menentukan apakah perlu mekanisme koreksi |
| A-04 | Diskon 50% berlaku untuk berapa anak affiliator? Semua anaknya atau satu? | Menentukan validasi |
| A-05 | Satu kode berlaku untuk semua event, atau kode per event? | Mengubah struktur data |
| A-06 | Ada batas minimum pencairan? | Menentukan apakah komisi Rp10.000 tunggal langsung ditransfer |

## Notifikasi

**Belum ada notifikasi otomatis.** Umpan balik seluruhnya in-app: state loading, pesan sukses/gagal, badge status, halaman error/404.

Komunikasi tetap manual lewat WhatsApp, sesuai cara kerja tim sekarang.

Kandidat berikutnya, berurutan berdasarkan nilai:

| Prioritas | Notifikasi | Kenapa |
|---|---|---|
| 1 | Pemberitahuan internal saat ada bukti transfer baru | Tanpa ini admin harus membuka ERP berkala |
| 2 | Konfirmasi ke orang tua saat pembayaran disetujui | Saat ini dikirim manual satu per satu |
| 3 | Pemberitahuan ke affiliator saat komisi cair | Membangun kepercayaan program |
| 4 | Pengingat H-1 acara ke peserta | Menurunkan ketidakhadiran |

---

# 9. Business Process

## Proses yang diotomasi sistem

| Proses | Sebelumnya | Sesudah |
|---|---|---|
| Penomoran | Manual/tidak ada | Otomatis: `KB-CUS-00001`, `KB-CHD-00001`, `KB-REG-2026-00001`, `KB-PAY-2026-00001`, 🆕 `KB-AFF-00001`, 🆕 `KB-PYO-2026-00001` |
| Deduplikasi keluarga | Tidak ada | Nomor WhatsApp yang sama memakai ulang record Customer |
| Perhitungan usia | Manual | Diturunkan dari tanggal lahir, tidak pernah disimpan |
| Status lifecycle event | Manual | Diturunkan dari tanggal mulai/selesai |
| Sisa kuota | Hitung manual | Kapasitas dikurangi pendaftaran terverifikasi |
| Verifikasi pembayaran 🆕 | Cocokkan bukti transfer di chat | Antrean terstruktur dengan pratinjau dan jejak verifikator |
| Perhitungan komisi 🆕 | Hitung manual per affiliator | Otomatis Rp10.000 × peserta lunas berkode |
| Jadwal pencairan 🆕 | Diingat manual | Antrean otomatis muncul H-1 per event |
| Rekap pendapatan | Manual | Agregasi otomatis dari pembayaran `PAID` |
| Atribusi kanal | Tidak ada | `?source=` + field "Mengetahui dari" + kode affiliate |

## Approval flow

| Yang di-approve | Siapa | Urutan |
|---|---|---|
| Publikasi event | ADMIN / SUPER_ADMIN | Draft → lengkapi → publish. Belum publish tidak muncul di website. |
| **Bukti transfer** 🆕 | ADMIN / SUPER_ADMIN | Unggah → antrean → setujui/tolak (+ alasan) → kuota terkunci |
| **Pendaftaran affiliator** 🆕 | ADMIN / SUPER_ADMIN | Daftar → verifikasi → kode diterbitkan → undang ke grup WA |
| **Pencairan komisi** 🆕 | SUPER_ADMIN saja | Antrean H-1 → transfer manual → tandai cair + unggah bukti |
| Konfirmasi pembayaran pihak ketiga | ADMIN / SUPER_ADMIN | Verifikasi di platform mitra → ubah status di ERP |
| Override status pembayaran | ADMIN / SUPER_ADMIN | Manual, untuk koreksi |
| ~~Penerbitan sertifikat~~ | — | ➖ Dihapus (R-06) |

## Audit trail

**Diperluas di v2.0** karena sekarang ada uang keluar.

Sudah tercatat: `createdAt`/`updatedAt` Customer, `createdAt` Child, `registrationDate`, `createdAt`/`paidAt`/`expiresAt` Payment, `checkedInAt`/`method`/`recordedBy` Kehadiran.

🆕 Wajib ditambahkan:
- **Verifikasi pembayaran**: siapa menyetujui/menolak, kapan, alasan penolakan, URL bukti
- **Pencairan komisi**: siapa mencairkan, kapan, nominal, bukti transfer
- **Perubahan status affiliator**: siapa mengaktifkan/menonaktifkan kode dan kapan

**Masih kurang:** log umum siapa mengubah apa untuk operasi edit/hapus biasa. Perlu tabel audit terpisah saat migrasi database.

---

# 10. Technical Stack & Integration

## Technical Stack

| Lapisan | Teknologi | Versi |
|---|---|---|
| Framework | Next.js (App Router) | 15.5.25 |
| UI | React | 19.2.4 |
| Bahasa | TypeScript (strict) | ^5 |
| Styling | Tailwind CSS (CSS-first `@theme`) | ^4.3.3 |
| Ikon | lucide-react + SVG inline untuk ikon brand | ^1.46.0 |
| QR | qrcode-generator | ^2.0.4 |
| Utilitas kelas | clsx, tailwind-merge | ^2.1.1, ^3.7.0 |
| Grafik | **Dibuat sendiri** — tidak ada library chart | — |
| Hosting | Vercel | — |

> Tidak ada library chart, animasi, maupun UI kit. Grafik dibangun dari SVG dan div memakai token desain yang sama dengan sisa aplikasi.

## Database

**Belum ada database.** Data dari fixture statis di `src/data/` dilapisi penyimpanan browser.

**Jalur migrasi (K-06):** seluruh akses data lewat `src/lib/repositories/index.ts` yang mengekspos `Repository<T>`. Pindah ke PostgreSQL = mengimplementasikan ulang **satu file itu**.

### Model data v2.0

Relasi yang sudah ada:

```
customers.id     -> children.customer_id
customers.id     -> registrations.customer_id      (wali anak)
children.id      -> registrations.child_id
events.id        -> registrations.event_id
registrations.id -> payments.registration_id
registrations.id -> attendance.registration_id
```

🆕 Relasi baru:

```
registrations.payer_customer_id -> customers.id      (R-03: pembayar ≠ wali)
registrations.affiliate_id      -> affiliates.id
affiliates.id                   -> affiliate_commissions.affiliate_id
registrations.id                -> affiliate_commissions.registration_id
affiliate_payouts.id            -> affiliate_commissions.payout_id
payments.proof_url                                    (R-04: bukti transfer)
payments.verified_by / verified_at / rejection_reason
```

🆕 Tipe baru:

| Tipe | Field utama |
|---|---|
| **Affiliate** | `id`, `affiliateNumber` (KB-AFF-00001), `code` (unik), `fullName`, `whatsapp`, `email?`, `domicile`, `bankName`, `bankAccountNumber`, `bankAccountName`, `status` (PENDING/ACTIVE/INACTIVE/REJECTED), `joinedAt`, `verifiedBy`, `notes` |
| **AffiliateCommission** | `id`, `affiliateId`, `registrationId`, `eventId`, `amount`, `status` (PENDING/PAYABLE/PAID/CANCELLED), `earnedAt`, `payableAt` (H-1 event), `paidAt?`, `payoutId?` |
| **AffiliatePayout** | `id`, `payoutNumber` (KB-PYO-2026-00001), `affiliateId`, `eventId`, `commissionIds[]`, `totalAmount`, `transferredAt`, `proofUrl?`, `recordedBy` |

🆕 Perubahan enum:

```
PaymentMethod:  NONE | MANUAL_TRANSFER | THIRD_PARTY | WEBSITE
                        └─ baru, default    └─ disimpan untuk nanti, tidak dipakai

PaymentStatus:  NOT_REQUIRED | PENDING | WAITING_VERIFICATION | PAID
                | REJECTED | FAILED | EXPIRED | CANCELLED
                              └─ keduanya baru
```

## Integrasi Pihak Ketiga

| Kategori | Status | Rencana |
|---|---|---|
| **Object storage** 🔴 | ❌ Belum ada | **Menjadi blocker di v2.0** — bukti transfer wajib diunggah, dan bukti transfer tidak bisa disimpan di browser. S3/Cloudinary/Supabase Storage harus ada sebelum R-04 bisa jalan sungguhan |
| **Storage galeri** | Google Drive (link manual) | Tetap (K-02) |
| **Payment gateway** | ❌ Tidak dipakai lagi | Antarmuka `PaymentGateway` disimpan; transfer manual menggantikannya |
| **Messaging (WA)** | ❌ Manual | Fonnte/Wablas jika notifikasi disetujui |
| **Email** | ❌ Tidak ada | Resend/SMTP |
| **Maps** | ❌ Tidak dipakai | Lokasi sebagai teks |
| **Instagram/TikTok/Threads/FB** | Tautan statis, tanpa API | Tetap |

> **Catatan penting:** sebelum v2.0, object storage adalah "nice to have". Setelah R-04, sistem tidak bisa berfungsi tanpanya. Ini harus naik jadi prasyarat pertama.

## Variabel lingkungan

| Variabel | Wajib | Fungsi |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Tidak (fallback) | Base URL untuk SEO, sitemap, QR |
| `NEXT_PUBLIC_GALLERY_DRIVE_URL` | Tidak (fallback) | Folder Drive galeri |
| `ADMIN_SESSION_SECRET` | **Ya di produksi** | Kunci tanda tangan cookie ERP |
| 🆕 `NEXT_PUBLIC_SHOW_WHATSAPP` | Tidak (default `false`) | Menyalakan nomor WA di kontak (KONF-01) |
| 🆕 `FEATURE_CERTIFICATES` | Tidak (default `false`) | Menyalakan kembali fitur sertifikat (K-07) |
| 🆕 `STORAGE_*` | **Ya** saat R-04 aktif | Kredensial object storage untuk bukti transfer |

`ADMIN_SESSION_SECRET` sudah tersetel di Vercel (Production/Preview/Development, 25 Sep 2026). `.env` tidak pernah di-commit.

---

# 11. Security Requirements

## Yang sudah diterapkan

| Kontrol | Implementasi |
|---|---|
| **Gerbang ERP** | Middleware menjaga seluruh `/admin/*`; diverifikasi di produksi (307 ke login) |
| **Integritas sesi** | Cookie HMAC-SHA256; cookie palsu ditolak |
| **Manajemen secret** | Tidak ada secret di repository; `.env` di-gitignore; secret produksi di Vercel |
| **Pemisahan data** | Website publik tidak mengekspos data ERP |
| **Otorisasi berbasis peran** | `can()` tunggal; ditolak di level halaman |
| **Crawler** | `robots.txt` melarang `/admin`, `/register/`, `/payment/`, `/attendance/` |

## 🆕 Kontrol baru yang dibutuhkan v2.0

| # | Kontrol | Kenapa |
|---|---|---|
| N-01 | **Bukti transfer tidak boleh bisa diakses publik** | Berisi nama, nomor rekening, dan saldo orang tua. Wajib URL bertanda tangan dan berbatas waktu, bukan URL publik yang bisa ditebak |
| N-02 | **Halaman affiliate tidak boleh menampilkan data pribadi peserta** | Nama depan saja. Bukan nama lengkap, bukan WhatsApp, bukan domisili — ini data anak |
| N-03 | **Kode affiliate harus tidak bisa ditebak** | Kode berurutan memungkinkan siapa pun membaca statistik affiliator lain |
| N-04 | **Rate limiting pada unggah bukti transfer** | Endpoint unggah tanpa autentikasi adalah target penyalahgunaan penyimpanan |
| N-05 | **Validasi tipe file sungguhan, bukan hanya ekstensi** | Ekstensi bisa dipalsukan |
| N-06 | **Nomor rekening affiliator hanya terlihat SUPER_ADMIN** | Data keuangan pihak ketiga |
| N-07 | **Jejak audit untuk semua persetujuan pembayaran dan pencairan** | Menyangkut uang; harus bisa ditelusuri |
| N-08 | **`robots.txt` melarang `/affiliate/`** | Halaman berkode tidak boleh terindeks |

## Kesenjangan yang masih terbuka

| # | Kesenjangan | Risiko | Prioritas |
|---|---|---|---|
| S-01 | Autentikasi mock dengan kredensial demo publik | Siapa pun yang tahu bisa masuk | 🔴 Blocker |
| S-02 | Password plaintext di kode | Tidak ada hashing | 🔴 Blocker |
| S-03 | Tidak ada rate limiting di login | Brute force | 🟠 Tinggi |
| S-04 | Data sensitif tidak dienkripsi saat disimpan | Data anak tersimpan polos | 🟠 Tinggi |
| S-05 | Tidak ada audit log untuk edit/hapus umum | Perubahan tidak bisa ditelusuri | 🟠 Tinggi |
| S-06 | Tidak ada backup & recovery policy | Wajib bersamaan dengan migrasi database | 🟠 Tinggi |
| S-07 | Tidak ada kebijakan retensi data anak | — | 🟡 Sedang |

## Compliance

Sistem mengumpulkan **data pribadi anak di bawah umur** (nama, tanggal lahir, domisili) dan kini juga **data keuangan pihak ketiga** (rekening affiliator, bukti transfer orang tua). Keduanya tunduk pada **UU No. 27/2022 tentang Pelindungan Data Pribadi**, yang memberi perlindungan khusus bagi data anak dan mensyaratkan persetujuan orang tua.

Yang belum dipenuhi dan perlu masuk development:

- Pernyataan persetujuan eksplisit pada form pendaftaran
- Halaman Kebijakan Privasi
- Kebijakan retensi dan penghapusan, termasuk **berapa lama bukti transfer disimpan**
- Mekanisme permintaan hapus data oleh orang tua
- Persetujuan terpisah untuk affiliator soal penyimpanan data rekening

> Program affiliate menaikkan taruhan di sini: sekarang ada pihak ketiga yang menyimpan data rekeningnya di sistem, dan ada gambar bukti transfer berisi informasi perbankan orang tua. Ini bukan lagi sekadar daftar peserta.

---

# 12. Monetization

## Model bisnis

Kelas Bermain memonetisasi lewat **biaya per peserta per kelas**. Tidak ada langganan, tidak ada freemium.

| Skenario | Peran |
|---|---|
| Kelas berbayar | Sumber pendapatan utama (K-04) |
| Open House gratis | Akuisisi keluarga baru |
| Pihak ketiga | Dijual lewat platform mitra |
| 🆕 **Affiliate** | Kanal akuisisi berbiaya variabel — Rp10.000 per peserta, hanya dibayar kalau berhasil |

## 🆕 Ekonomi program affiliate

| Komponen | Nilai |
|---|---|
| Komisi per peserta | Rp10.000 |
| Syarat | Peserta terdaftar **dan** pembayaran terverifikasi |
| Waktu bayar | H-1 sebelum kegiatan |
| Bonus affiliator ikut kegiatan | Diskon 50% |

**Catatan biaya:** pada harga kelas Rp160.000–Rp285.000, komisi Rp10.000 setara **3,5%–6%** per peserta. Itu murah untuk kanal akuisisi — jauh di bawah biaya iklan berbayar pada umumnya.

**Yang perlu diwaspadai** adalah bonus diskon 50%, bukan komisinya. Pada kelas Rp285.000, satu affiliator yang mengikutsertakan anaknya sendiri memotong Rp142.500 — setara komisi 14 peserta. Kalau tidak dibatasi (lihat A-01 dan A-04), biaya program bisa didominasi diskon, bukan akuisisi.

## Struktur harga

Katalog: **11 event** — 10 berbayar, 1 gratis.

| Event | Kategori | Skenario | Harga sistem |
|---|---|---|---|
| Pekan Kelas Bermain | Eksplorasi | Berbayar | Rp950.000 |
| Hangar Explore | Eksplorasi | Berbayar | Rp295.000 |
| Tentara Cilik | Profesi | Berbayar | Rp285.000 |
| Little Farmer | Alam | Pihak ketiga | Rp275.000 |
| Pemadam Cilik | Profesi | Berbayar | Rp265.000 |
| Decorate Mini Cake | Kuliner | Berbayar | Rp245.000 |
| Cocoa Maker | Kuliner | Berbayar | Rp235.000 |
| Pottery Class | Kreatif | Pihak ketiga | Rp225.000 |
| Cocoa Maker Perdana | Kuliner | Berbayar | Rp199.000 |
| Lomba 17 Agustusan | Outdoor | Berbayar | Rp75.000 |
| Open House Kelas Bermain | Eksplorasi | Gratis | — |

> 🔴 **Seluruh harga di atas adalah placeholder yang saya karang untuk demo.** Satu-satunya angka nyata yang pernah disebut adalah **Rp160.000** di pesan konfirmasi pembayaran, dan tidak jelas itu untuk kelas apa. Lihat KONF-03. **Daftar harga asli wajib ada sebelum sistem menerima pembayaran.**

## Aplikasi ini tidak dimonetisasi

Ini sistem internal milik Kelas Bermain, bukan produk SaaS yang dijual ke pihak lain.

---

# 13. KPI / Metrics

## Metrik bisnis (di dashboard)

| Metrik | Definisi | Sudah diukur | Target |
|---|---|:---:|---|
| Pendapatan Lunas | Total pembayaran `PAID` pada periode | ✅ | _Perlu keputusan klien_ |
| Total Pendaftaran | Pendaftaran pada periode | ✅ | _Perlu keputusan klien_ |
| 🆕 Menunggu Verifikasi | Bukti transfer belum diperiksa (sepanjang waktu) | 🔨 Dibangun | **0 lebih dari 1 hari kerja** |
| Tingkat Kehadiran | PRESENT ÷ total | ✅ | ≥ 90% |
| Kehadiran per Event | Rincian per event | ✅ | Tidak ada event < 75% |
| Orang Tua & Anak | Total dan penambahan periode | ✅ | — |
| 🆕 Affiliator Aktif | Affiliator dengan ≥ 1 peserta lunas pada periode | 🔨 Dibangun | _Perlu keputusan klien_ |
| ~~Sertifikat Terbit~~ | — | ➖ Dihapus (R-06) | — |

## 🆕 Metrik program affiliate

| Metrik | Definisi | Kenapa penting |
|---|---|---|
| Peserta via affiliate | Pendaftaran berkode ÷ total pendaftaran | Mengukur apakah program benar-benar menghasilkan |
| Konversi per affiliator | Peserta lunas ÷ peserta mendaftar berkode | Membedakan affiliator yang membawa peserta serius |
| Biaya akuisisi affiliate | Total komisi ÷ peserta via affiliate | Harusnya persis Rp10.000; menyimpang berarti ada kesalahan hitung |
| Beban diskon affiliator | Total rupiah diskon 50% | **Metrik yang paling perlu diawasi** — lihat §12 |
| Affiliator tidur | Affiliator aktif tanpa peserta 60 hari | Menentukan apakah perlu pembersihan daftar |
| Ketepatan pencairan | Payout tepat H-1 ÷ total payout | Kepercayaan program bergantung pada ini |

## Metrik produk (belum diukur)

| Metrik | Kebutuhan |
|---|---|
| Conversion rate pendaftaran | Analytics |
| Drop-off per langkah form | Analytics |
| Efektivitas kanal | **Data sudah terekam**, tinggal dibuat laporannya |
| Repeat rate keluarga | **Data sudah ada**, tinggal dihitung |
| Waktu verifikasi pembayaran 🆕 | Dari unggah sampai disetujui — mengukur kecepatan tim |

## Target angka

**Menunggu keputusan klien.** Target pendapatan, peserta per event, dan jumlah affiliator tidak bisa ditetapkan dari sisi development — butuh angka historis dan target bisnis.

---

# 14. Timeline / Roadmap

## Sudah selesai (v1.0)

| Fase | Isi | Status |
|---|---|:---:|
| F1 | Website publik: IA, template event, pendaftaran, SEO, state lengkap | ✅ |
| F2 | Galeri jadi link Drive (K-02) | ✅ |
| F3 | Rebranding sesuai @kelasbermain.id; semua kelas berbayar | ✅ |
| F4 | Aset poster Instagram terbukti muat | ✅ |
| F5 | Platform ERP: model ternormalisasi, QR, CRUD, laporan, CSV, auth berbasis peran | ✅ |
| F6 | Animasi "Cara Ikut" berbasis scroll | ✅ |
| F7 | Perbaikan dashboard: sidebar, menu akun, KPI dua tingkat, filter periode | ✅ |

## Development v2.0 — usulan urutan

Diurutkan berdasarkan **risiko dan ketergantungan**, bukan ukuran.

| Fase | Isi | Estimasi | Kenapa urutannya di sini |
|---|---|---|---|
| **F8 — Koreksi mendesak** ✅ | Hapus statistik palsu (R-05), sembunyikan sertifikat (R-06), kotak kontak 6 kanal (R-07, R-08), perbaiki teks e-sertifikat | **Selesai 27 Sep 2026** | Dikerjakan lebih dulu karena situs live menampilkan angka yang jauh dari kenyataan |
| **F9 — Keputusan** | Tuntaskan KONF-01 (nomor WA), KONF-03 (harga), A-01…A-06 (aturan komisi) | — | **Memblokir F11 dan F12.** Bukan pekerjaan coding |
| **F10 — Object storage** | S3/Cloudinary + URL bertanda tangan | 2–3 hari | **Prasyarat R-04.** Tanpa ini bukti transfer tidak bisa disimpan |
| **F11 — Pembayaran transfer manual** | Unggah bukti, status baru, antrean verifikasi di ERP | 3–4 hari | Bergantung F10. Alur uang inti |
| **F12 — Form pendaftaran** | Sederhanakan field (R-02), multi-pendamping (R-03), field sumber dan kode affiliate | 3–4 hari | Bergantung keputusan F9 |
| **F13 — Program affiliate** | Model data, halaman publik, status affiliator, ERP affiliate, komisi | 5–7 hari | Bergantung F11 (komisi butuh pembayaran terverifikasi) dan F12 (kode affiliate di form) |
| **F14 — Pencairan komisi** | Antrean H-1, catat transfer, laporan affiliate | 2–3 hari | Bergantung F13 |
| **F15 — Dashboard v2** | KPI baru, panel affiliate, ganti KPI sertifikat | 1–2 hari | Bergantung F13 |

**Total estimasi development v2.0: 17–24 hari kerja**, di luar waktu tunggu keputusan F9. F8 sudah selesai, jadi sisa estimasi **16–23 hari kerja**.

### Yang sudah terpasang di F8

| Perubahan | Bukti |
|---|---|
| Blok statistik halaman depan dihapus, termasuk strip di hero | 4 pemeriksaan |
| `/sertifikat` dan `/certificate/[id]` mengembalikan 404 | 2 pemeriksaan |
| Tautan "Cek Sertifikat" hilang dari footer, sitemap, hasil pencarian ERP, dan layar check-in | 4 pemeriksaan |
| Menu Sertifikat hilang dari sidebar ERP; kartu KPI diganti "Rata-rata Peserta" | platform + dash |
| Kotak kontak 6 kanal dengan ikon Threads, TikTok, Facebook baru | 6 pemeriksaan |
| Email resmi `kelasbermain.id@gmail.com` menggantikan placeholder | 2 pemeriksaan |
| Nomor WA tersembunyi secara default, dan terbukti muncul saat flag dinyalakan | 2 pemeriksaan + uji flag manual |

Total **109 pemeriksaan browser lolos** (f8 25, platform 41, dashboard 27, kartu kehadiran 16) plus suite responsif/a11y/hidrasi bersih. `lint`, `tsc --noEmit`, dan `build` lolos.

Keduanya dikendalikan lewat env var, dan sudah diuji dalam dua keadaan: `NEXT_PUBLIC_SHOW_WHATSAPP=true` memunculkan nomor WA, `FEATURE_CERTIFICATES=true` menghidupkan kembali seluruh fitur sertifikat (rute jadi 200 dan sitemap memuatnya lagi). Jadi keputusan KONF-01 dan K-07 tinggal ubah konfigurasi, tanpa menyentuh kode.

## Fase berikutnya (belum dijadwalkan)

| Fase | Isi | Estimasi | Prasyarat |
|---|---|---|---|
| F16 — Autentikasi produksi | Hashing, user management, rate limiting (S-01…S-03) | 3–5 hari | Keputusan penyedia auth |
| F17 — Database | Migrasi PostgreSQL/Supabase, audit log, backup | 5–8 hari | Akun database |
| F18 — Kepatuhan PDP | Persetujuan, kebijakan privasi, retensi | 2–3 hari | Keputusan klien + review hukum |
| F19 — Notifikasi | WA/email sesuai prioritas §8 | 3–4 hari | Provider + anggaran |
| F20 — Object storage lanjutan | Kegiatan & Galeri bisa diedit dari ERP | 2–3 hari | F10 sudah ada |

> **Tanggal target go-live belum ditetapkan.** Estimasi di atas adalah durasi kerja, bukan tanggal kalender.

---

# 15. UAT & Maintenance

## Skenario testing utama

### A. Website publik — orang tua

| # | Skenario | Hasil yang diharapkan | Status |
|---|---|---|:---:|
| A-01 | Buka home dari ponsel | Rapi di 390px, tanpa scroll horizontal | ✅ |
| A-02 | Cari statistik di halaman depan | **Tidak ada** blok statistik | ✅ |
| A-03 | Cek kotak kontak | 6 kanal tampil; WA sesuai keputusan KONF-01 | ✅ |
| A-04 | Buka `/sertifikat` | **404** | ✅ |
| A-05 | Cari tautan "Cek Sertifikat" di footer | **Tidak ada** | ✅ |
| A-06 | Filter event | Daftar menyesuaikan; state kosong jelas | ✅ |
| A-07 | Scan QR dari poster | Mendarat di event benar dengan badge sumber | ✅ |
| A-08 | Daftar dengan form baru | Hanya field yang diminta; email opsional | 🔨 |
| A-09 | Isi "Mengetahui Kelas Bermain dari" | Wajib, opsi lengkap termasuk Teman dan TikTok | 🔨 |
| A-10 | Daftarkan 3 anak, 1 dengan pendamping berbeda | 2 Customer, 3 Child, 3 Registration, 1 Payment | 🔨 |
| A-11 | Daftarkan anak 3 th 8 bln ke Tentara Cilik (batas 4 th) | **Peringatan, bisa dilanjutkan**, ditandai `ageOverride` | 🔨 |
| A-12 | Daftar dengan kode affiliate valid | Kode terpasang, komisi tercatat PENDING | 🔨 |
| A-13 | Daftar dengan kode affiliate salah ketik | Peringatan lembut, **pendaftaran tetap bisa lanjut** | 🔨 |
| A-14 | Buka halaman pembayaran | Nominal + rekening BSI & BCA + tombol salin + area unggah | 🔨 |
| A-15 | Unggah bukti transfer | Status jadi WAITING_VERIFICATION | 🔨 |
| A-16 | Unggah file 8 MB | Ditolak dengan pesan jelas | 🔨 |
| A-17 | Daftar event gratis | Tidak ada langkah pembayaran | ✅ |
| A-18 | Daftar event pihak ketiga | Peringatan, status PENDING, diarahkan keluar | ✅ |
| A-19 | Check-in kontak salah / benar | Ditolak / tercatat | ✅ |
| A-20 | Buka Galeri | Banner + link Drive, tanpa grid foto | ✅ |
| A-21 | Cari nomor telepon di seluruh situs | Sesuai keputusan KONF-01 | ✅ |

### B. Affiliate 🆕

| # | Skenario | Hasil yang diharapkan | Status |
|---|---|---|:---:|
| B-01 | Buka `/affiliate` | Program jelas: 5 langkah, Rp10.000/peserta, cair H-1, bonus 50% | 🔨 |
| B-02 | Daftar sebagai affiliator | Status PENDING_VERIFICATION | 🔨 |
| B-03 | Admin setujui | Kode unik terbit, tidak berurutan | 🔨 |
| B-04 | Buka `/affiliate/[kode]` | Ringkasan komisi dan daftar peserta tampil | 🔨 |
| B-05 | Periksa data peserta di halaman affiliate | **Nama depan saja** — tanpa nama lengkap, WA, domisili | 🔨 |
| B-06 | Tebak kode affiliator lain | Tidak bisa ditebak dari pola | 🔨 |
| B-07 | Peserta berkode bayar & diverifikasi | Komisi PENDING → PAYABLE | 🔨 |
| B-08 | Pembayaran ditolak | Komisi → CANCELLED | 🔨 |
| B-09 | H-1 sebelum event | Komisi muncul di antrean pencairan | 🔨 |
| B-10 | ADMIN buka menu pencairan | **Ditolak** — hanya SUPER_ADMIN | 🔨 |

### C. ERP

| # | Skenario | Hasil yang diharapkan | Status |
|---|---|---|:---:|
| C-01 | Buka `/admin/*` tanpa login | Diarahkan ke login | ✅ |
| C-02 | Login sebagai STAFF | Pembayaran, Affiliate, Pengaturan tidak muncul | 🔨 |
| C-03 | STAFF buka `/admin/settings` langsung | "Akses ditolak" | ✅ |
| C-04 | Pendaftaran dari website muncul di ERP | Tanpa sinkronisasi manual | ✅ |
| C-05 | Antrean verifikasi | Bukti transfer tampil sebagai pratinjau | 🔨 |
| C-06 | Setujui bukti transfer | PAID, kuota terkunci, komisi PAYABLE, verifikator tercatat | 🔨 |
| C-07 | Tolak bukti transfer | REJECTED + alasan; orang tua bisa unggah ulang | 🔨 |
| C-08 | Filter periode dashboard | Seluruh widget dan granularitas menyesuaikan | ✅ |
| C-09 | Menu Sertifikat di sidebar | **Tidak ada** | ✅ |
| C-10 | Ekspor laporan affiliate ke CSV | Kolom benar | 🔨 |
| C-11 | Generate QR per event | SVG benar, parameter sumber terpasang | ✅ |
| C-12 | Pencarian global | Termasuk affiliator | 🔨 |

### D. Non-fungsional

| # | Skenario | Hasil yang diharapkan | Status |
|---|---|---|:---:|
| D-01 | Lint, typecheck, build produksi | Ketiganya lolos | ✅ |
| D-02 | Tanpa overflow horizontal 1440–390px | Bersih di seluruh lebar | ✅ |
| D-03 | Hidrasi React | Bersih | ✅ |
| D-04 | `prefers-reduced-motion` | Animasi berhenti total | ✅ |
| D-05 | Kontras teks | WCAG AA | ✅ |
| D-06 | Grafik terbaca pembaca layar | Tabel `sr-only` setara | ✅ |
| D-07 | robots.txt | `/admin` dan `/affiliate/` dilarang | 🔨 |
| D-08 | Akses URL bukti transfer tanpa izin | **Ditolak** | 🔨 |

**Legenda:** ✅ sudah lolos · 🔨 harus dibangun/diuji di v2.0

**Otomatisasi:** 84 pemeriksaan berjalan di Firefox headless via puppeteer-core, terbagi empat suite (platform 41, dashboard 27, kartu kehadiran 16, plus responsif/a11y/hidrasi). Suite baru untuk affiliate dan verifikasi pembayaran harus ditambahkan di v2.0.

## Periode support pasca-launch

**Belum disepakati.** Usulan: 30 hari perbaikan bug tanpa biaya setelah serah terima, mencakup cacat yang ada saat penyerahan — di luar permintaan fitur baru.

## SLA maintenance

**Belum disepakati.** Usulan sebagai bahan diskusi:

| Tingkat | Definisi | Target respons |
|---|---|---|
| P1 — Kritis | Situs mati, pendaftaran gagal, bukti transfer tidak bisa diunggah, komisi salah hitung | 4 jam kerja |
| P2 — Tinggi | Satu fitur tidak berfungsi, ada workaround | 1 hari kerja |
| P3 — Sedang | Cacat tampilan, teks salah | 3 hari kerja |
| P4 — Rendah | Permintaan peningkatan | Backlog |

> Salah hitung komisi masuk P1 karena menyangkut uang pihak ketiga dan kepercayaan program.

---

## Lampiran A — Yang harus diputuskan sebelum development

| # | Pertanyaan | Ke siapa | Memblokir |
|---|---|---|---|
| **KONF-01** | Nomor WA tampil di website publik atau tidak? | **Direktur** | F11, F12 |
| **KONF-03** | Daftar harga asli seluruh kelas | Ka Fika | F11 |
| **KONF-02** | Batas usia asli tiap kelas | Ka Fika | F12 |
| **A-01** | Affiliator pakai kode sendiri: diskon + komisi, atau salah satu? | Ka Fika | F13 |
| **A-02** | Pembayaran terverifikasi setelah H-1 — komisi ikut kapan? | Ka Fika | F14 |
| **A-03** | Peserta batal setelah komisi cair — ditarik atau tidak? | Ka Fika | F14 |
| **A-04** | Diskon 50% untuk berapa anak affiliator? | Ka Fika | F13 |
| **A-05** | Satu kode untuk semua event, atau per event? | Ka Fika | F13 |
| **A-06** | Ada batas minimum pencairan? | Ka Fika | F14 |
| Q-01 | URL halaman Facebook | Ka Fika | F8 |
| Q-02 | Jumlah lokasi mitra & jumlah anak (untuk internal) | Ka Fika | — |
| Q-03 | Target angka tiap KPI | Direktur | — |
| Q-04 | Kapan sistem mulai memegang data asli | Direktur | F16, F17, F18 |
| Q-05 | Penyedia object storage | Aji + klien | F10 |
| Q-06 | Persetujuan orang tua & kebijakan privasi (UU PDP) | Direktur | F18 |
| Q-07 | Periode support dan SLA | Direktur | — |

## Lampiran B — Utang teknis

| # | Item | Lokasi |
|---|---|---|
| T-01 | Autentikasi mock dengan kredensial demo publik | `src/lib/auth/users.ts` |
| T-02 | Tidak ada database | `src/lib/repositories/index.ts` |
| T-03 | Mock payment gateway (akan digantikan transfer manual) | `src/lib/services/payment.ts` |
| T-04 | Kegiatan & Galeri read-only di ERP | `src/app/admin/(shell)/activities`, `gallery` |
| T-05 | Harga kelas masih placeholder | `src/data/events.ts` |
| T-06 | Tidak ada audit log untuk edit/hapus umum | — |
| T-07 | Repository belum punya remote Git | — |
| T-08 | Email organisasi masih placeholder | `src/data/site.ts` |
| T-09 | Tabel ERP tanpa sorting kolom dan tanpa paginasi | `src/components/admin/ui.tsx` |
| **T-10** 🆕 | **Statistik halaman depan berisi angka karangan** — harus dihapus | `src/data/site.ts:91` |
| **T-11** 🆕 | **Batas usia event belum diverifikasi** terhadap peserta sungguhan | `src/data/events.ts` |
| **T-12** 🆕 | **Belum ada object storage** — blocker untuk bukti transfer | — |
| **T-13** 🆕 | **Tanggal data dummy statis, jadi lapuk seiring waktu.** Per 27 Sep 2026 lima dari sebelas event sudah lewat tenggat dan satu kuotanya penuh, sehingga alur pendaftaran tidak bisa diuji pada event-event itu. Seed sebaiknya dihitung relatif terhadap tanggal hari ini | `src/data/events.ts` |
