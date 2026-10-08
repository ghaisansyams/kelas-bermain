-- ===================================================================
-- BAGIAN 1 — LIHAT DULU, TIDAK MENGHAPUS APA PUN
-- ===================================================================
--
-- Query ini HANYA MEMBACA. Aman dijalankan berkali-kali.
-- Tidak ada satu pun baris yang berubah atau hilang.
--
-- Periksa hasilnya: semua yang muncul harus data percobaan.
-- Kalau ada nama yang kamu kenali sebagai pendaftar ASLI, berhenti
-- dan kabari — berarti polanya terlalu lebar dan harus dipersempit.
-- ===================================================================

select
  r.registration_number as nomor_registrasi,
  c.full_name           as anak,
  cu.customer_number    as kode_peserta,
  cu.full_name          as pendamping,
  cu.whatsapp,
  r.payment_status      as status_bayar,
  p.invoice_number      as invoice,
  p.amount              as nominal,
  cert.number           as sertifikat,
  r.registration_date::date as dibuat
from registrations r
join children c     on c.id = r.child_id
join customers cu   on cu.id = r.customer_id
left join payments p      on p.registration_id = r.id
left join certificates cert on cert.registration_id = r.id
where
  c.full_name  ilike any (array['%TES%','%test%','%asep%','%asdasd%','%ASDASD%','%Anak Tiket%','%Anak Payment%'])
  or cu.full_name ilike any (array['%TES%','%test%','%asdasd%','%asfdasdfs%','%ASDASD%','%Tiket Uji%','%Test Wizard%','%Test Payment%','%Test Free%'])
order by r.registration_date;


-- ===================================================================
-- Peserta percobaan yang BELUM punya registrasi sama sekali
-- (tidak muncul di daftar atas, tapi tetap perlu dibersihkan)
-- ===================================================================

select
  cu.customer_number as kode_peserta,
  cu.full_name       as pendamping,
  cu.whatsapp,
  cu.domicile,
  (select count(*) from children ch where ch.customer_id = cu.id) as jumlah_anak
from customers cu
where not exists (select 1 from registrations r where r.customer_id = cu.id)
  and cu.full_name ilike any (array['%TES%','%test%','%asdasd%','%asfdasdfs%','%ASDASD%','%Tiket Uji%','%Test Wizard%','%Test Payment%','%Test Free%'])
order by cu.created_at;
