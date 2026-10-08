-- VERIFIKASI pembayaran-manual.sql
-- Query ini HANYA MEMBACA. Jalankan setelah pembayaran-manual.sql.
-- Semua kolom harus bernilai true. Kalau ada satu saja false,
-- jalankan ulang pembayaran-manual.sql dan perhatikan pesan errornya.

select
  (select count(*) = 4 from information_schema.columns
    where table_name = 'payments'
      and column_name in ('proof_url','proof_submitted_at','rejected_at','rejection_reason'))
                                                      as kolom_bukti_ada,
  (select count(*) = 1 from pg_proc
    where proname = 'submit_payment_proof')           as fungsi_kirim_bukti_ada,
  (select count(*) = 1 from pg_proc
    where proname = 'admin_reject_payment')           as fungsi_tolak_ada,
  (select count(*) = 1 from pg_proc
    where proname = 'check_ticket_status')            as fungsi_cek_tiket_ada,
  (select count(*) = 1 from storage.buckets
    where id = 'bukti-pembayaran' and public = false) as bucket_privat_ada,
  (select count(*) >= 3 from pg_policies
    where tablename = 'objects'
      and policyname like 'bukti_%')                  as izin_bucket_ada;
