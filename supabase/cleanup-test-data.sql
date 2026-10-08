-- ===================================================================
-- KELAS BERMAIN — HAPUS DATA PERCOBAAN
-- ===================================================================
--
-- JALANKAN BAGIAN 1 DULU. Lihat hasilnya. Kalau yang muncul memang hanya
-- data percobaan, baru jalankan BAGIAN 2.
--
-- Jangan jalankan seluruh berkas sekaligus.
-- ===================================================================


-- ===================================================================
-- BAGIAN 1 — LIHAT DULU (tidak menghapus apa pun)
-- ===================================================================
-- Blok ini hanya membaca. Aman dijalankan berkali-kali.

select
  r.registration_number as nomor_registrasi,
  c.full_name           as anak,
  cu.full_name          as pendamping,
  cu.whatsapp,
  r.payment_status      as status_bayar,
  p.invoice_number      as invoice,
  p.amount              as nominal,
  cert.number           as sertifikat,
  r.registration_date as dibuat
from registrations r
join children c    on c.id = r.child_id
join customers cu  on cu.id = r.customer_id
left join payments p      on p.registration_id = r.id
left join certificates cert on cert.registration_id = r.id
where
  -- Nama yang jelas-jelas percobaan. Tambahkan pola lain di sini kalau
  -- ada yang terlewat, lalu jalankan ulang untuk memastikan.
  c.full_name  ilike any (array['%TES%','%test%','%asep%','%asdasd%','%ASDASD%','%Anak Tiket%','%Anak Payment%'])
  or cu.full_name ilike any (array['%TES%','%test%','%asdasd%','%asfdasdfs%','%ASDASD%','%Tiket Uji%','%Test Wizard%','%Test Payment%'])
order by r.registration_date;


-- ===================================================================
-- BAGIAN 2 — HAPUS (jalankan hanya setelah Bagian 1 diperiksa)
-- ===================================================================
-- Semua dibungkus satu transaksi: kalau ada satu saja yang gagal,
-- tidak ada yang terhapus sama sekali.
--
-- Urutannya dari anak ke induk, supaya tidak ada baris yatim:
--   catatan kas -> sertifikat -> kehadiran -> penukaran voucher
--   -> pembayaran -> registrasi -> anak -> pelanggan
--
-- Hapus dua baris di bawah ini (tanda -- di depan BEGIN dan COMMIT)
-- untuk menjalankannya.

-- begin;

with sasaran as (
  select r.id as registration_id, r.child_id, r.customer_id
  from registrations r
  join children c   on c.id = r.child_id
  join customers cu on cu.id = r.customer_id
  where c.full_name  ilike any (array['%TES%','%test%','%asep%','%asdasd%','%ASDASD%','%Anak Tiket%','%Anak Payment%'])
     or cu.full_name ilike any (array['%TES%','%test%','%asdasd%','%asfdasdfs%','%ASDASD%','%Tiket Uji%','%Test Wizard%','%Test Payment%'])
)
, hapus_kas as (
  delete from financial_transactions
  where reference_type = 'payment'
    and reference_id in (select id from payments where registration_id in (select registration_id from sasaran))
  returning 1
)
, hapus_sertifikat as (
  delete from certificates where registration_id in (select registration_id from sasaran) returning 1
)
, hapus_kehadiran as (
  delete from attendance_records where registration_id in (select registration_id from sasaran) returning 1
)
, hapus_voucher as (
  delete from voucher_redemptions where registration_id in (select registration_id from sasaran) returning 1
)
, hapus_bayar as (
  delete from payments where registration_id in (select registration_id from sasaran) returning 1
)
, hapus_registrasi as (
  delete from registrations where id in (select registration_id from sasaran) returning child_id, customer_id
)
select
  (select count(*) from hapus_kas)        as catatan_kas_dihapus,
  (select count(*) from hapus_sertifikat) as sertifikat_dihapus,
  (select count(*) from hapus_kehadiran)  as kehadiran_dihapus,
  (select count(*) from hapus_voucher)    as voucher_dihapus,
  (select count(*) from hapus_bayar)      as pembayaran_dihapus,
  (select count(*) from hapus_registrasi) as registrasi_dihapus;

-- Anak dan pelanggan yang sudah tidak punya registrasi apa pun.
-- Dipisah agar data orang tua yang masih punya anak lain tidak ikut hilang.
delete from children c
where not exists (select 1 from registrations r where r.child_id = c.id)
  and c.full_name ilike any (array['%TES%','%test%','%asep%','%asdasd%','%ASDASD%','%Anak Tiket%','%Anak Payment%']);

delete from customers cu
where not exists (select 1 from registrations r where r.customer_id = cu.id)
  and not exists (select 1 from children ch where ch.customer_id = cu.id)
  and cu.full_name ilike any (array['%TES%','%test%','%asdasd%','%asfdasdfs%','%ASDASD%','%Tiket Uji%','%Test Wizard%','%Test Payment%']);

-- commit;


-- ===================================================================
-- BAGIAN 3 — PERIKSA SETELAH MENGHAPUS
-- ===================================================================
-- Jalankan Bagian 1 sekali lagi. Hasilnya harus kosong.
--
-- Lalu pastikan jumlah peserta tiap event ikut turun. Angka ini dihitung
-- ulang otomatis oleh trigger, jadi seharusnya sudah benar:
--
--   select id, title, registered, capacity from events order by start_date;
--
-- Dan pastikan buku kas tidak menyisakan catatan tanpa pembayaran:
--
--   select count(*) as kas_yatim
--   from financial_transactions f
--   where f.reference_type = 'payment'
--     and not exists (select 1 from payments p where p.id = f.reference_id);
--
-- Hasilnya harus 0.
-- ===================================================================
