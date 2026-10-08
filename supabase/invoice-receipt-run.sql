-- Nomor invoice terlihat oleh pendaftar.
-- Salin SELURUH isi berkas ini, tempel di SQL Editor, tekan Run.

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
