-- ===================================================================
-- RINGKASAN SATU LAYAR — hanya membaca, tidak menghapus apa pun
-- ===================================================================
-- Digabung jadi satu query karena SQL Editor Supabase hanya
-- menampilkan hasil pernyataan TERAKHIR.
--
-- Yang harus kamu lihat:
--   tidak_cocok_pola  = 0      -> aman
--   siapa_tidak_cocok = NULL   -> aman
-- Kalau dua kolom itu berisi, JANGAN hapus. Kirim ke saya dulu.
-- ===================================================================

with percobaan as (
  select r.id
  from registrations r
  join children c   on c.id = r.child_id
  join customers cu on cu.id = r.customer_id
  where c.full_name  ilike any (array['%TES%','%test%','%asep%','%asdasd%','%ASDASD%','%Anak Tiket%','%Anak Payment%'])
     or cu.full_name ilike any (array['%TES%','%test%','%asdasd%','%asfdasdfs%','%ASDASD%','%Tiket Uji%','%Test Wizard%','%Test Payment%','%Test Free%'])
)
, bukan_percobaan as (
  select r.id, c.full_name as anak, cu.full_name as pendamping
  from registrations r
  join children c   on c.id = r.child_id
  join customers cu on cu.id = r.customer_id
  where r.id not in (select id from percobaan)
)
select
  (select count(*) from registrations)     as total_registrasi,
  (select count(*) from percobaan)         as cocok_pola_percobaan,
  (select count(*) from bukan_percobaan)   as tidak_cocok_pola,
  (select string_agg(anak || ' / ' || pendamping, ' | ')
     from bukan_percobaan)                 as siapa_tidak_cocok,
  (select count(*) from customers)         as total_peserta,
  (select count(*) from children)          as total_anak,
  (select count(*) from payments)          as total_pembayaran,
  (select count(*) from certificates)      as total_sertifikat,
  (select coalesce(sum(amount),0) from financial_transactions where type = 'INCOME')
                                           as total_pemasukan_dibukukan;
