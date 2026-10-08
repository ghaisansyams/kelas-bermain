-- Kelas Bermain — nomor invoice terlihat oleh pendaftar
--
-- Jalankan sekali di Supabase SQL Editor. Aman dijalankan ulang.
--
-- Nomor invoice sudah dibuat otomatis saat admin menekan Konfirmasi
-- Pembayaran (lihat admin_confirm_payment di erp-schema.sql). Yang belum ada:
-- pendaftar tidak pernah melihatnya. Berkas ini membuka satu kolom —
-- invoice_number — ke halaman status pendaftaran, supaya orang tua punya
-- nomor resmi untuk klaim reimburse atau arsip pribadi.
--
-- Yang dibuka hanyalah nomor invoice. Tidak ada data pembayaran lain,
-- tidak ada data peserta lain, dan halaman ini tetap hanya bisa dibuka
-- lewat access_token acak — bukan lewat nomor pendaftaran yang berurutan.

-- Postgres menolak mengganti fungsi yang jumlah kolom keluarannya berubah,
-- jadi fungsi lama dihapus dulu. Jeda tanpa fungsi ini hanya sepersekian
-- detik, dan halaman status pendaftaran sudah menangani kegagalan baca
-- dengan aman — tidak ada data yang hilang.
drop function if exists get_registration_by_token(uuid);

create or replace function get_registration_by_token(p_token uuid)
returns table (
  registration_id uuid, registration_number text, event_id text,
  status text, payment_status text, payment_method text, amount numeric,
  child_full_name text, customer_full_name text, customer_whatsapp text,
  payment_id uuid, payment_status_live text, payment_expires_at timestamptz,
  invoice_number text, paid_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.registration_number, r.event_id, r.status, r.payment_status,
         r.payment_method, r.amount, c.full_name, cu.full_name, cu.whatsapp,
         p.id, p.status, p.expires_at, p.invoice_number, p.paid_at
  from registrations r
  join children c on c.id = r.child_id
  join customers cu on cu.id = r.customer_id
  left join payments p on p.registration_id = r.id
  where r.access_token = p_token;
$$;

grant execute on function get_registration_by_token to anon, authenticated;

-- ===================================================================
-- PEMERIKSAAN: apakah satu pembayaran pernah tercatat dua kali?
-- ===================================================================
--
-- Jalankan query di bawah kapan saja untuk membuktikan tidak ada pemasukan
-- ganda. Hasil kosong = aman. Setiap baris yang muncul berarti ada satu
-- pembayaran dengan lebih dari satu catatan pemasukan, dan itu harus
-- diselidiki.
--
--   select reference_id,
--          count(*) as jumlah_catatan,
--          sum(amount) as total_tercatat
--   from financial_transactions
--   where type = 'INCOME' and reference_type = 'payment'
--   group by reference_id
--   having count(*) > 1;
--
-- Untuk melihat ringkasan semua pembayaran lunas beserta invoicenya:
--
--   select p.invoice_number, p.amount, p.paid_at,
--          r.registration_number, c.full_name as anak,
--          (select count(*) from financial_transactions f
--            where f.reference_type = 'payment' and f.reference_id = p.id
--              and f.type = 'INCOME') as catatan_pemasukan
--   from payments p
--   join registrations r on r.id = p.registration_id
--   join children c on c.id = r.child_id
--   where p.status = 'PAID'
--   order by p.paid_at desc;
--
-- Kolom catatan_pemasukan harus selalu bernilai 1.
-- ===================================================================
