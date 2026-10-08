-- LANGKAH 1c — DAFTAR BARIS YANG AKAN DIHAPUS
-- Query ini HANYA MEMBACA. Tidak ada satu baris pun yang terhapus.
--
-- Langkah 1 hanya menghitung jumlahnya. Yang ini menunjukkan baris per baris,
-- supaya terlihat jelas data mana yang dianggap trial sebelum ada yang
-- dihapus. Periksa dulu daftarnya; kalau ada satu saja nama sungguhan di
-- sini, JANGAN jalankan langkah 2.
--
-- Catatan: event, katalog kelas, dan isi CMS tidak ikut di daftar ini dan
-- tidak dihapus langkah 2.

select
  r.registration_number                       as nomor_registrasi,
  c.full_name                                 as pendamping,
  c.whatsapp,
  c.email,
  ch.full_name                                as anak,
  e.title                                     as kelas,
  r.status                                    as status_registrasi,
  p.status                                    as status_pembayaran,
  p.invoice_number                            as invoice,
  p.amount                                    as nominal,
  r.registration_date                         as didaftarkan
from registrations r
  left join customers c on c.id = r.customer_id
  left join children  ch on ch.id = r.child_id
  left join events    e on e.id = r.event_id
  left join payments  p on p.registration_id = r.id
order by r.registration_date desc;
