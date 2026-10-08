-- Siapa 3 pendaftar affiliate ini? HANYA MEMBACA.

select
  affiliate_number as nomor,
  full_name        as nama,
  whatsapp,
  email,
  domicile         as domisili,
  bank_name        as bank,
  bank_account_name as atas_nama,
  status,
  code             as kode_rujukan,
  applied_at::date as mendaftar
from affiliates
order by applied_at;
