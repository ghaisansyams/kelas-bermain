-- Kelas Bermain — pembayaran manual: bukti, penolakan, dan cek tiket publik
--
-- Jalankan sekali di Supabase SQL Editor. Aman dijalankan ulang.
-- Tidak ada tabel yang dibuat ulang dan tidak ada kolom yang dihapus.

-- ------------------------------------------------------------------
-- 1. Kolom bukti pembayaran
-- ------------------------------------------------------------------

alter table payments add column if not exists proof_url text;
alter table payments add column if not exists proof_submitted_at timestamptz;
alter table payments add column if not exists rejected_at timestamptz;
alter table payments add column if not exists rejection_reason text;

create index if not exists payments_proof_idx
  on payments (proof_submitted_at desc) where proof_submitted_at is not null;

-- ------------------------------------------------------------------
-- 2. Pendaftar menyerahkan bukti
-- ------------------------------------------------------------------
--
-- Pendaftar TIDAK BISA menandai pembayarannya lunas. Yang bisa dilakukan
-- hanya menaikkan status ke WAITING_VERIFICATION — artinya "bukti sudah
-- saya kirim, mohon diperiksa". Admin yang memutuskan.
--
-- Dipanggil dengan access_token yang acak, bukan nomor pendaftaran yang
-- berurutan, supaya tidak bisa ditembak dengan menebak nomor.

create or replace function submit_payment_proof(
  p_token uuid,
  p_proof_url text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg registrations;
  v_payment payments;
begin
  select * into v_reg from registrations where access_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;

  select * into v_payment from payments where registration_id = v_reg.id limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'NO_PAYMENT');
  end if;

  -- Sudah lunas, dibatalkan, atau direfund: tidak ada yang perlu diklaim,
  -- dan membuka kembali baris lunas akan membatalkan keputusan admin.
  if v_payment.status in ('PAID', 'REFUNDED', 'CANCELLED') then
    return jsonb_build_object('ok', true, 'status', v_payment.status, 'changed', false);
  end if;

  update payments set
    status = 'WAITING_VERIFICATION',
    proof_url = coalesce(nullif(trim(p_proof_url), ''), proof_url),
    proof_submitted_at = now(),
    -- Pengiriman bukti baru menghapus penolakan sebelumnya, supaya admin
    -- melihatnya sebagai antrean baru dan bukan kasus yang sudah selesai.
    rejected_at = null,
    rejection_reason = null,
    notes = coalesce(nullif(trim(p_note), ''), notes)
  where id = v_payment.id;

  update registrations set payment_status = 'WAITING_VERIFICATION' where id = v_reg.id;

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (
    null, 'PAYMENT_PROOF_SENT', 'payments', v_payment.id::text,
    jsonb_build_object('status', v_payment.status),
    jsonb_build_object('status', 'WAITING_VERIFICATION', 'hasFile', p_proof_url is not null)
  );

  return jsonb_build_object('ok', true, 'status', 'WAITING_VERIFICATION', 'changed', true);
end;
$$;

grant execute on function submit_payment_proof to anon, authenticated;

-- Jejak audit untuk tindakan ini saja. Tabel log tetap tertutup untuk
-- tulisan lain dari publik.
drop policy if exists activity_logs_proof_insert on activity_logs;
create policy activity_logs_proof_insert on activity_logs
  for insert to anon
  with check (action = 'PAYMENT_PROOF_SENT');

-- ------------------------------------------------------------------
-- 3. Admin menolak pembayaran
-- ------------------------------------------------------------------
--
-- Penolakan bukan pembatalan. Pendaftarannya tetap hidup supaya orang tua
-- bisa mengirim ulang bukti yang benar.

create or replace function admin_reject_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments;
begin
  if not is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'REASON_REQUIRED' using errcode = 'P0007';
  end if;

  select * into v_payment from payments where id = p_payment_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Menolak pembayaran yang sudah lunas akan meninggalkan pemasukan di buku
  -- kas tanpa pembayaran yang mendukungnya. Refund jalurnya sendiri.
  if v_payment.status = 'PAID' then
    raise exception 'ALREADY_PAID' using errcode = 'P0010';
  end if;

  update payments set
    status = 'REJECTED',
    rejected_at = now(),
    rejection_reason = trim(p_reason)
  where id = p_payment_id;

  update registrations set payment_status = 'REJECTED'
  where id = v_payment.registration_id;

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (
    auth.uid(), 'PAYMENT_REJECTED', 'payments', p_payment_id::text,
    jsonb_build_object('status', v_payment.status),
    jsonb_build_object('status', 'REJECTED', 'reason', trim(p_reason))
  );
end;
$$;

grant execute on function admin_reject_payment to authenticated;

-- ------------------------------------------------------------------
-- 4. Cek tiket publik
-- ------------------------------------------------------------------
--
-- Nomor pendaftaran berurutan, jadi siapa pun bisa menebaknya. Karena itu
-- fungsi ini hanya mengembalikan yang perlu dilihat orang tua: nama depan
-- pendamping, jumlah anak, dan status. Tidak ada nama anak, nomor telepon,
-- email, catatan admin, atau id internal.
--
-- Email bersifat opsional. Kalau diisi dan cocok, nama pendamping
-- ditampilkan utuh; kalau tidak, hanya nama depannya.

create or replace function check_ticket_status(
  p_registration_number text,
  p_contact text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_reg registrations;
  v_payment payments;
  v_customer customers;
  v_event text;
  v_children int;
  v_contact text := lower(trim(coalesce(p_contact, '')));
  v_verified boolean := false;
begin
  select * into v_reg from registrations
  where upper(registration_number) = upper(trim(p_registration_number));

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;

  select * into v_customer from customers where id = v_reg.customer_id;
  select * into v_payment from payments where registration_id = v_reg.id limit 1;
  select title into v_event from events where id = v_reg.event_id;

  -- Satu pendaftaran bisa punya beberapa anak lewat nomor yang berbeda,
  -- jadi hitung berdasarkan pendamping dan event yang sama.
  select count(*) into v_children from registrations r
  where r.customer_id = v_reg.customer_id
    and r.event_id = v_reg.event_id
    and r.status <> 'CANCELLED';

  if v_contact <> '' then
    v_verified := lower(coalesce(v_customer.email, '')) = v_contact
               or lower(coalesce(v_customer.whatsapp, '')) = v_contact;
  end if;

  return jsonb_build_object(
    'ok', true,
    'registrationNumber', v_reg.registration_number,
    'eventTitle', coalesce(v_event, v_reg.event_id),
    'companionName', case
      when v_verified then v_customer.full_name
      else split_part(v_customer.full_name, ' ', 1)
    end,
    'contactVerified', v_verified,
    'childrenCount', v_children,
    'registrationStatus', v_reg.status,
    'paymentStatus', coalesce(v_payment.status, v_reg.payment_status),
    'amount', v_payment.amount,
    'invoiceNumber', case when v_verified then v_payment.invoice_number else null end,
    'rejectionReason', v_payment.rejection_reason
  );
end;
$$;

grant execute on function check_ticket_status to anon, authenticated;

-- ------------------------------------------------------------------
-- 5. Penyimpanan berkas bukti
-- ------------------------------------------------------------------
--
-- Bukti diunggah pendaftar yang tidak login, jadi izin tulisnya dipersempit
-- sampai hanya cukup untuk itu: satu bucket, satu folder, dan tidak boleh
-- menimpa berkas yang sudah ada. Membaca tetap tertutup untuk publik —
-- hanya admin yang bisa melihat buktinya.

insert into storage.buckets (id, name, public)
values ('bukti-pembayaran', 'bukti-pembayaran', false)
on conflict (id) do nothing;

drop policy if exists bukti_anon_insert on storage.objects;
create policy bukti_anon_insert on storage.objects
  for insert to anon
  with check (
    bucket_id = 'bukti-pembayaran'
    and (storage.foldername(name))[1] = 'bukti'
  );

drop policy if exists bukti_admin_read on storage.objects;
create policy bukti_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'bukti-pembayaran' and public.is_admin());

drop policy if exists bukti_admin_delete on storage.objects;
create policy bukti_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'bukti-pembayaran' and public.is_admin());
