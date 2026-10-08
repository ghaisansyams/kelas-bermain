-- LANGKAH 2 dari 3 — HAPUS SELURUH DATA OPERASIONAL
--
-- Dibungkus satu transaksi: kalau ada satu perintah gagal, tidak ada
-- yang terhapus sama sekali.
--
-- Urutannya dari daun ke akar mengikuti foreign key. Kalau dibalik,
-- database akan menolak karena masih ada baris yang merujuk.
--
-- TIDAK disentuh: event, CMS, media, voucher, pengguna admin,
-- pengaturan diskon, riwayat versi, template sertifikat.

begin;

delete from financial_transactions;
delete from certificates;
delete from attendance_records;
delete from voucher_redemptions;
delete from payments;
delete from registrations;
delete from children;
delete from customers;
delete from affiliates;

-- Penghitung ikut dinolkan karena pemakaiannya sudah hilang.
update vouchers set used_count = 0;
update events  set registered  = 0;

commit;


-- LANGKAH 3 — PERIKSA. Delapan angka pertama harus 0,
-- dua angka terakhir harus tetap 12 dan 14.

select
  (select count(*) from customers)              as peserta,
  (select count(*) from children)               as anak,
  (select count(*) from registrations)          as registrasi,
  (select count(*) from payments)               as pembayaran,
  (select count(*) from attendance_records)     as kehadiran,
  (select count(*) from certificates)           as sertifikat,
  (select count(*) from financial_transactions) as catatan_kas,
  (select count(*) from affiliates)             as affiliate,
  (select count(*) from events)                 as event_harus_12,
  (select count(*) from cms_sections)           as cms_harus_14;
