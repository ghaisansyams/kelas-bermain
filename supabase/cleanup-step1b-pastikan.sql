-- ===================================================================
-- PEMERIKSAAN TERAKHIR SEBELUM MENGHAPUS — hanya membaca
-- ===================================================================
-- Tujuannya satu: memastikan tidak ada pendaftar ASLI yang ikut
-- tersaring, dan tidak ada yang tertinggal.
-- ===================================================================

-- 1. Berapa total registrasi, dan berapa yang cocok pola percobaan?
select
  (select count(*) from registrations) as total_registrasi,
  (select count(*) from registrations r
     join children c   on c.id = r.child_id
     join customers cu on cu.id = r.customer_id
   where c.full_name  ilike any (array['%TES%','%test%','%asep%','%asdasd%','%ASDASD%','%Anak Tiket%','%Anak Payment%'])
      or cu.full_name ilike any (array['%TES%','%test%','%asdasd%','%asfdasdfs%','%ASDASD%','%Tiket Uji%','%Test Wizard%','%Test Payment%','%Test Free%'])
  ) as cocok_pola_percobaan;


-- 2. INI YANG PALING PENTING.
-- Registrasi yang TIDAK cocok pola percobaan — artinya mungkin pendaftar asli.
-- Hasil kosong = aman, semua isi database memang data percobaan.
-- Ada isinya = JANGAN hapus dulu, kirim hasilnya ke saya.

select
  r.registration_number as nomor_registrasi,
  c.full_name           as anak,
  cu.full_name          as pendamping,
  cu.whatsapp,
  r.payment_status      as status_bayar,
  r.registration_date::date as dibuat
from registrations r
join children c   on c.id = r.child_id
join customers cu on cu.id = r.customer_id
where not (
  c.full_name  ilike any (array['%TES%','%test%','%asep%','%asdasd%','%ASDASD%','%Anak Tiket%','%Anak Payment%'])
  or cu.full_name ilike any (array['%TES%','%test%','%asdasd%','%asfdasdfs%','%ASDASD%','%Tiket Uji%','%Test Wizard%','%Test Payment%','%Test Free%'])
)
order by r.registration_date;


-- 3. Uang sungguhan yang akan ikut terhapus dari buku kas.
select
  count(*)                as jumlah_catatan_kas,
  coalesce(sum(amount),0) as total_rupiah
from financial_transactions f
where f.reference_type = 'payment'
  and f.reference_id in (
    select p.id from payments p
    join registrations r on r.id = p.registration_id
    join children c   on c.id = r.child_id
    join customers cu on cu.id = r.customer_id
    where c.full_name  ilike any (array['%TES%','%test%','%asep%','%asdasd%','%ASDASD%','%Anak Tiket%','%Anak Payment%'])
       or cu.full_name ilike any (array['%TES%','%test%','%asdasd%','%asfdasdfs%','%ASDASD%','%Tiket Uji%','%Test Wizard%','%Test Payment%','%Test Free%'])
  );
