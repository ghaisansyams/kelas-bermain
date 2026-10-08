-- ===================================================================
-- KOSONGKAN SELURUH DATA OPERASIONAL — MULAI DARI NOL
-- ===================================================================
--
-- Dipakai sekali, sebelum sistem menerima pendaftar sungguhan.
--
-- KENAPA MENGOSONGKAN SEMUA, BUKAN MENCOCOKKAN NAMA?
-- Mencocokkan pola nama punya dua risiko: pendaftar asli yang namanya
-- kebetulan mengandung "test" ikut terhapus, dan data percobaan yang
-- namanya tidak terduga justru tertinggal. Karena seluruh 8 peserta
-- di database memang data uji, mengosongkan semuanya lebih pasti.
--
-- YANG DIHAPUS: peserta, anak, registrasi, pembayaran, kehadiran,
-- sertifikat, catatan kas, penukaran voucher, dan affiliate.
--
-- YANG TIDAK DISENTUH: event, isi CMS, media, voucher, pengguna admin,
-- pengaturan diskon, dan riwayat versi. Semuanya tetap utuh.
--
-- JANGAN JALANKAN INI setelah ada pendaftar sungguhan.
-- ===================================================================


-- -------------------------------------------------------------------
-- LANGKAH 1 — LIHAT DULU. Jalankan blok ini sendirian.
-- -------------------------------------------------------------------
-- Pastikan angkanya sesuai dugaan sebelum menghapus.

select
  (select count(*) from customers)              as peserta,
  (select count(*) from children)               as anak,
  (select count(*) from registrations)          as registrasi,
  (select count(*) from payments)               as pembayaran,
  (select count(*) from attendance_records)     as kehadiran,
  (select count(*) from certificates)           as sertifikat,
  (select count(*) from financial_transactions) as catatan_kas,
  (select count(*) from affiliates)             as affiliate,
  (select coalesce(sum(amount),0) from financial_transactions where type = 'INCOME')
                                                as total_pemasukan;


-- -------------------------------------------------------------------
-- LANGKAH 2 — HAPUS. Jalankan blok ini setelah Langkah 1 diperiksa.
-- -------------------------------------------------------------------
-- Satu transaksi: kalau ada satu saja yang gagal, tidak ada yang
-- terhapus. Urutannya dari daun ke akar, mengikuti foreign key.

begin;

delete from financial_transactions where reference_type = 'payment';
delete from certificates;
delete from attendance_records;
delete from voucher_redemptions;
delete from payments;
delete from registrations;
delete from children;
delete from customers;
delete from affiliates;

-- Penghitung voucher ikut dinolkan, karena pemakaiannya sudah dihapus.
update vouchers set used_count = 0;

-- Jumlah peserta tiap event dihitung ulang dari nol.
update events set registered = 0;

commit;


-- -------------------------------------------------------------------
-- LANGKAH 3 — PERIKSA. Semua angka harus 0.
-- -------------------------------------------------------------------

select
  (select count(*) from customers)              as peserta,
  (select count(*) from children)               as anak,
  (select count(*) from registrations)          as registrasi,
  (select count(*) from payments)               as pembayaran,
  (select count(*) from certificates)           as sertifikat,
  (select count(*) from financial_transactions) as catatan_kas,
  (select count(*) from events)                 as event_harus_tetap_12,
  (select count(*) from cms_sections)           as cms_harus_tetap_ada;
