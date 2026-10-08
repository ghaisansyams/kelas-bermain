-- LANGKAH 1 dari 3 — LIHAT ISI DATABASE
-- Query ini HANYA MEMBACA. Tidak ada satu baris pun yang terhapus.

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
                                                as total_pemasukan,
  (select count(*) from events)                 as event_tidak_dihapus,
  (select count(*) from cms_sections)           as cms_tidak_dihapus;
