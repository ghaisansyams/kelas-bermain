-- ===================================================================
-- KELAS BERMAIN — JALANKAN SEMUA MIGRATION SEKALIGUS
-- ===================================================================
--
-- Berkas ini adalah gabungan keempat migration, sudah dalam urutan yang
-- benar. Jalankan SEKALI di Supabase SQL Editor, lalu selesai.
--
-- Cara pakai:
--   1. Buka file ini di VS Code
--   2. Cmd+A lalu Cmd+C  (salin semuanya)
--   3. Supabase > SQL Editor > New query > Cmd+V
--   4. Tekan Run (atau Cmd+Enter)
--   5. Tunggu sampai muncul "Success. No rows returned"
--
-- Aman dijalankan berulang kali: tidak ada DROP TABLE, tidak ada
-- TRUNCATE, dan setiap pembuatan tabel/kolom/index memakai
-- "if not exists". Isi yang sudah kamu edit di admin tidak akan tertimpa.
--
-- Prasyarat: schema.sql, admin-schema.sql, media-schema.sql, dan
-- erp-schema.sql sudah dijalankan sebelumnya (sudah, menurut pengecekan
-- terakhir ke database produksi).
--
-- Setelah selesai, verifikasi dengan:  npm run check-db
-- ===================================================================


-- ===================================================================
-- 001 — events-schema.sql
-- Event: tabel events, status, trigger jumlah peserta, kehadiran, sertifikat
-- ===================================================================

-- Kelas Bermain — events in the database
--
-- Run once in the Supabase SQL Editor AFTER erp-schema.sql. Safe to re-run.
--
-- `id` stays text (evt-001, …) on purpose: registrations.event_id already
-- points at those ids, so moving the catalogue into Postgres keeps every
-- existing registration, payment and attendance row attached to its event.
-- Seeding is done from the admin ("Impor dari katalog"), not here, so the
-- 12 existing events keep their exact content without a 600-line insert.

create table if not exists events (
  id text primary key,
  slug text unique not null,
  title text not null,
  tagline text not null default '',
  summary text not null default '',
  description jsonb not null default '[]'::jsonb,
  about_event jsonb,
  category text not null,
  cover jsonb not null,
  poster jsonb,
  start_date date not null,
  end_date date not null,
  time_start text not null default '09:00',
  time_end text not null default '12:00',
  timezone text not null default 'WIB',
  location jsonb not null default '{}'::jsonb,
  organizer text not null default 'Kelas Bermain',
  age_min int not null default 3,
  age_max int not null default 15,
  capacity int not null default 0,
  registered int not null default 0,
  registration jsonb not null default '{}'::jsonb,
  agenda jsonb not null default '[]'::jsonb,
  speaker_ids jsonb not null default '[]'::jsonb,
  facilities jsonb not null default '[]'::jsonb,
  requirements jsonb not null default '[]'::jsonb,
  certificate jsonb not null default '{}'::jsonb,
  video jsonb,
  featured boolean not null default false,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_status_idx on events (status);
create index if not exists events_start_date_idx on events (start_date);
create index if not exists events_category_idx on events (category);

alter table events enable row level security;

drop policy if exists events_admin on events;
create policy events_admin on events
  for all to authenticated using (is_admin()) with check (is_admin());

-- Public reads go through a function, so DRAFT and ARCHIVED never leak.
create or replace function get_public_events()
returns setof events
language sql security definer set search_path = public as $$
  select * from events
  where status in ('PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED')
  order by start_date;
$$;

grant execute on function get_public_events to anon, authenticated;

-- Keeps events.registered honest without the app having to remember to
-- update it: the number of live registrations is the source of truth.
create or replace function sync_event_registered()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_event text := coalesce(new.event_id, old.event_id);
begin
  update events set
    registered = (
      select count(*) from registrations r
      where r.event_id = v_event and r.status <> 'CANCELLED'
    ),
    updated_at = now()
  where id = v_event;
  return null;
end;
$$;

drop trigger if exists trg_sync_event_registered on registrations;
create trigger trg_sync_event_registered
  after insert or update or delete on registrations
  for each row execute function sync_event_registered();

-- ------------------------------------------------------------------
-- Attendance check-in from the admin
-- ------------------------------------------------------------------

create index if not exists attendance_event_idx on attendance_records (event_id);
create index if not exists attendance_status_idx on attendance_records (status);

create or replace function admin_set_attendance(
  p_registration_id uuid,
  p_status text,
  p_method text default 'MANUAL'
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reg registrations;
begin
  if not is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;
  if p_status not in ('PRESENT', 'ABSENT', 'NOT_ATTENDED') then
    raise exception 'INVALID_STATUS' using errcode = 'P0007';
  end if;

  select * into v_reg from registrations where id = p_registration_id;
  if v_reg.id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into attendance_records (
    registration_id, event_id, child_id, status, checked_in_at, method, recorded_by
  ) values (
    v_reg.id, v_reg.event_id, v_reg.child_id, p_status,
    case when p_status = 'PRESENT' then now() else null end,
    lower(p_method), auth.uid()::text
  )
  on conflict (registration_id) do update set
    status = excluded.status,
    checked_in_at = excluded.checked_in_at,
    method = excluded.method,
    recorded_by = excluded.recorded_by;

  update registrations set
    attendance_status = p_status,
    certificate_status = case
      when p_status = 'PRESENT' and certificate_status = 'NOT_ELIGIBLE' then 'AVAILABLE'
      else certificate_status
    end
  where id = p_registration_id;

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (
    auth.uid(), 'SET_ATTENDANCE', 'registrations', p_registration_id::text,
    jsonb_build_object('attendanceStatus', v_reg.attendance_status),
    jsonb_build_object('attendanceStatus', p_status, 'method', lower(p_method))
  );
end;
$$;

grant execute on function admin_set_attendance to authenticated;

-- ------------------------------------------------------------------
-- Sertifikat — issue / revoke, in one transaction each
-- ------------------------------------------------------------------

-- Per-year sequence so numbering stays unique under concurrent writes
-- (replaces the in-memory nextCertificateNumber helper).
create sequence if not exists certificate_seq;

-- Mint KB-<year>-<00000>. Re-issuing an already-issued registration returns
-- the existing certificate instead of minting a second number.
create or replace function admin_issue_certificate(
  p_registration_id uuid,
  p_template text default 'classic',
  p_signatory_name text default '',
  p_signatory_role text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg record;
  v_existing certificates;
  v_event record;
  v_number text;
begin
  if not is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;

  select r.*, c.full_name as child_name
    into v_reg
  from registrations r
  join children c on c.id = r.child_id
  where r.id = p_registration_id;

  if not found then
    raise exception 'REGISTRATION_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into v_existing from certificates where registration_id = p_registration_id limit 1;
  if found then
    return jsonb_build_object('number', v_existing.number, 'alreadyIssued', true);
  end if;

  -- A certificate is proof of attendance; it is never issued for a no-show.
  if v_reg.attendance_status <> 'PRESENT' then
    raise exception 'NOT_ATTENDED' using errcode = 'P0006';
  end if;

  select title, start_date, organizer into v_event from events where id = v_reg.event_id;

  v_number := 'KB-' || to_char(now(), 'YYYY') || '-'
    || lpad(nextval('certificate_seq')::text, 5, '0');

  insert into certificates (
    number, registration_id, child_id, event_id, participant_name,
    event_title, event_date, organizer, template, status,
    signatory_name, signatory_role
  ) values (
    v_number, v_reg.id, v_reg.child_id, v_reg.event_id, v_reg.child_name,
    coalesce(v_event.title, v_reg.event_id),
    coalesce(v_event.start_date, current_date),
    coalesce(v_event.organizer, 'Kelas Bermain'),
    coalesce(nullif(p_template, ''), 'classic'), 'issued',
    coalesce(p_signatory_name, ''), coalesce(p_signatory_role, '')
  );

  update registrations set certificate_status = 'ISSUED' where id = p_registration_id;

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (
    auth.uid(), 'ISSUE_CERTIFICATE', 'certificates', v_number,
    jsonb_build_object('certificateStatus', v_reg.certificate_status),
    jsonb_build_object('certificateStatus', 'ISSUED', 'number', v_number)
  );

  return jsonb_build_object('number', v_number, 'alreadyIssued', false);
end;
$$;

-- Revoking keeps the row (the number stays burned, so it can never be reused)
-- and puts the registration back to AVAILABLE so it can be re-issued.
create or replace function admin_revoke_certificate(p_number text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cert certificates;
begin
  if not is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;

  select * into v_cert from certificates where number = p_number;
  if not found then
    raise exception 'CERTIFICATE_NOT_FOUND' using errcode = 'P0001';
  end if;

  update certificates set status = 'revoked' where number = p_number;
  update registrations set certificate_status = 'AVAILABLE' where id = v_cert.registration_id;

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (
    auth.uid(), 'REVOKE_CERTIFICATE', 'certificates', p_number,
    jsonb_build_object('status', v_cert.status),
    jsonb_build_object('status', 'revoked', 'reason', p_reason)
  );
end;
$$;

grant execute on function admin_issue_certificate to authenticated;
grant execute on function admin_revoke_certificate to authenticated;

create index if not exists certificates_registration_idx on certificates (registration_id);
create index if not exists certificates_event_idx on certificates (event_id);


-- ===================================================================
-- 002 — voucher-users-schema.sql
-- Voucher, aturan diskon, dan manajemen pengguna admin
-- ===================================================================

-- Kelas Bermain — voucher, diskon, dan manajemen pengguna
--
-- Run once in the Supabase SQL Editor AFTER schema.sql, admin-schema.sql,
-- erp-schema.sql, and events-schema.sql. Safe to re-run.
--
-- Same posture as everything else here: no service-role key. The public site
-- can only validate a voucher through one SECURITY DEFINER function that
-- never returns the catalogue; admins read and write the table through RLS.

-- ------------------------------------------------------------------
-- Voucher
-- ------------------------------------------------------------------

create table if not exists vouchers (
  code text primary key,
  description text not null default '',
  type text not null check (type in ('FIXED', 'PERCENTAGE')),
  -- Rupiah for FIXED, percent (1-100) for PERCENTAGE.
  value numeric(12, 2) not null check (value > 0),
  -- Caps a PERCENTAGE voucher so "10%" can never exceed a set rupiah amount.
  max_discount numeric(12, 2),
  -- null = unlimited.
  max_uses int,
  used_count int not null default 0,
  min_children int not null default 1,
  -- null = berlaku untuk semua event.
  event_id text,
  valid_from date,
  valid_until date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create index if not exists vouchers_status_idx on vouchers (status);

-- One row per successful use, so "dipakai 12x" is auditable rather than just
-- a counter someone could have edited.
create table if not exists voucher_redemptions (
  id uuid primary key default gen_random_uuid(),
  voucher_code text not null references vouchers (code) on delete cascade,
  registration_id uuid not null references registrations (id) on delete cascade,
  amount numeric(12, 2) not null default 0,
  redeemed_at timestamptz not null default now(),
  unique (voucher_code, registration_id)
);

create index if not exists voucher_redemptions_code_idx on voucher_redemptions (voucher_code);

alter table vouchers enable row level security;
alter table voucher_redemptions enable row level security;

drop policy if exists vouchers_admin on vouchers;
create policy vouchers_admin on vouchers
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists voucher_redemptions_admin on voucher_redemptions;
create policy voucher_redemptions_admin on voucher_redemptions
  for all to authenticated using (is_admin()) with check (is_admin());

-- Public validator. Returns the one code asked for, never a list, and only
-- when it is genuinely usable right now — so the catalogue stays private and
-- the browser can't be talked into a discount the rules don't allow.
create or replace function find_voucher(
  p_code text,
  p_children_count int default 1,
  p_event_id text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v vouchers;
begin
  select * into v from vouchers where code = upper(trim(p_code));

  if not found or v.status <> 'ACTIVE' then
    return jsonb_build_object('ok', false, 'reason', 'INVALID');
  end if;
  if v.valid_from is not null and current_date < v.valid_from then
    return jsonb_build_object('ok', false, 'reason', 'NOT_STARTED');
  end if;
  if v.valid_until is not null and current_date > v.valid_until then
    return jsonb_build_object('ok', false, 'reason', 'EXPIRED');
  end if;
  if v.max_uses is not null and v.used_count >= v.max_uses then
    return jsonb_build_object('ok', false, 'reason', 'EXHAUSTED');
  end if;
  if p_children_count < v.min_children then
    return jsonb_build_object('ok', false, 'reason', 'MIN_CHILDREN', 'minChildren', v.min_children);
  end if;
  if v.event_id is not null and (p_event_id is null or v.event_id <> p_event_id) then
    return jsonb_build_object('ok', false, 'reason', 'OTHER_EVENT');
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', v.code,
    'type', v.type,
    'value', v.value,
    'maxDiscount', v.max_discount,
    'description', v.description
  );
end;
$$;

-- Called once the registration row exists. Idempotent per registration, and
-- it refuses to push a voucher past its own quota.
create or replace function redeem_voucher(
  p_code text,
  p_registration_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v vouchers;
begin
  select * into v from vouchers where code = upper(trim(p_code)) for update;
  if not found or v.status <> 'ACTIVE' then
    return;
  end if;
  if v.max_uses is not null and v.used_count >= v.max_uses then
    return;
  end if;

  insert into voucher_redemptions (voucher_code, registration_id, amount)
  values (v.code, p_registration_id, coalesce(p_amount, 0))
  on conflict (voucher_code, registration_id) do nothing;

  if found then
    update vouchers set used_count = used_count + 1 where code = v.code;
  end if;
end;
$$;

grant execute on function find_voucher to anon, authenticated;
grant execute on function redeem_voucher to anon, authenticated;

-- ------------------------------------------------------------------
-- Diskon — the pricing rules live in site_settings, not in the code
-- ------------------------------------------------------------------

insert into site_settings (key, value)
values (
  'pricing',
  jsonb_build_object(
    'siblingDiscountPerChild', 5000,
    'groupMinChildren', 5,
    'groupDiscountPerChild', 10000
  )
)
on conflict (key) do nothing;

-- Admin writes settings through RLS, but the public side reads through the
-- existing get_site_setting(), so anon never touches the table.

-- ------------------------------------------------------------------
-- Manajemen pengguna
-- ------------------------------------------------------------------

-- admin_users holds the rights; the email lives in auth.users. This joins
-- the two so the admin screen can show who an account actually is. Only an
-- admin may call it, and it exposes nothing but name/email/role/status.
create or replace function admin_list_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  role text,
  status text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;

  return query
  select a.user_id, u.email::text, a.full_name, a.role, a.status, a.created_at, u.last_sign_in_at
  from admin_users a
  join auth.users u on u.id = a.user_id
  order by a.created_at;
end;
$$;

-- Grants admin rights to an account that already exists in Supabase Auth.
-- Creating the login itself stays in the Supabase dashboard on purpose: doing
-- it from here would need a service-role key, which this app never holds.
create or replace function admin_grant_access(
  p_email text,
  p_full_name text,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_existing admin_users;
begin
  if not is_super_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;
  if p_role not in ('SUPER_ADMIN', 'ADMIN', 'STAFF') then
    raise exception 'INVALID_ROLE' using errcode = 'P0007';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));
  if v_user_id is null then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into v_existing from admin_users where user_id = v_user_id;

  insert into admin_users (user_id, full_name, role, status)
  values (v_user_id, coalesce(nullif(trim(p_full_name), ''), split_part(p_email, '@', 1)), p_role, 'ACTIVE')
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    role = excluded.role,
    status = 'ACTIVE';

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (
    auth.uid(), case when v_existing is null then 'GRANT_ADMIN' else 'UPDATE_ADMIN' end,
    'admin_users', v_user_id::text,
    case when v_existing is null then null
         else jsonb_build_object('role', v_existing.role, 'status', v_existing.status) end,
    jsonb_build_object('role', p_role, 'status', 'ACTIVE', 'email', lower(trim(p_email)))
  );

  return jsonb_build_object('userId', v_user_id, 'created', v_existing is null);
end;
$$;

-- Role / status change. Guards against an account locking itself out and
-- against removing the last active super admin.
create or replace function admin_update_user(
  p_user_id uuid,
  p_role text,
  p_status text,
  p_full_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing admin_users;
  v_super_count int;
begin
  if not is_super_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;
  if p_role not in ('SUPER_ADMIN', 'ADMIN', 'STAFF') then
    raise exception 'INVALID_ROLE' using errcode = 'P0007';
  end if;
  if p_status not in ('ACTIVE', 'INACTIVE') then
    raise exception 'INVALID_STATUS' using errcode = 'P0007';
  end if;

  select * into v_existing from admin_users where user_id = p_user_id;
  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if p_user_id = auth.uid() and (p_role <> 'SUPER_ADMIN' or p_status <> 'ACTIVE') then
    raise exception 'CANNOT_DEMOTE_SELF' using errcode = 'P0008';
  end if;

  if v_existing.role = 'SUPER_ADMIN' and v_existing.status = 'ACTIVE'
     and (p_role <> 'SUPER_ADMIN' or p_status <> 'ACTIVE') then
    select count(*) into v_super_count from admin_users
      where role = 'SUPER_ADMIN' and status = 'ACTIVE';
    if v_super_count <= 1 then
      raise exception 'LAST_SUPER_ADMIN' using errcode = 'P0008';
    end if;
  end if;

  update admin_users set
    role = p_role,
    status = p_status,
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name)
  where user_id = p_user_id;

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (
    auth.uid(), 'UPDATE_ADMIN', 'admin_users', p_user_id::text,
    jsonb_build_object('role', v_existing.role, 'status', v_existing.status),
    jsonb_build_object('role', p_role, 'status', p_status)
  );
end;
$$;

-- Removes admin rights. The Supabase Auth login survives — it simply stops
-- being an admin — so nothing is destroyed that can't be granted again.
create or replace function admin_revoke_access(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing admin_users;
  v_super_count int;
begin
  if not is_super_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'CANNOT_REVOKE_SELF' using errcode = 'P0008';
  end if;

  select * into v_existing from admin_users where user_id = p_user_id;
  if not found then
    return;
  end if;

  if v_existing.role = 'SUPER_ADMIN' and v_existing.status = 'ACTIVE' then
    select count(*) into v_super_count from admin_users
      where role = 'SUPER_ADMIN' and status = 'ACTIVE';
    if v_super_count <= 1 then
      raise exception 'LAST_SUPER_ADMIN' using errcode = 'P0008';
    end if;
  end if;

  delete from admin_users where user_id = p_user_id;

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (
    auth.uid(), 'REVOKE_ADMIN', 'admin_users', p_user_id::text,
    jsonb_build_object('role', v_existing.role, 'status', v_existing.status), null
  );
end;
$$;

grant execute on function admin_list_users, admin_grant_access,
  admin_update_user, admin_revoke_access to authenticated;


-- ===================================================================
-- 003 — affiliate-certificate-schema.sql
-- Verifikasi sertifikat publik dan persetujuan affiliate
-- ===================================================================

-- Kelas Bermain — verifikasi sertifikat publik & pengelolaan affiliate
--
-- Run once in the Supabase SQL Editor AFTER the earlier schema files.
-- Safe to re-run.
--
-- Fixes two features that were wired to nothing: the public certificate
-- checker read an in-memory store the ERP never writes to, and affiliate
-- applications landed in a table with no screen and no way to ever be
-- approved (status defaults to PENDING, code stays null).

-- ------------------------------------------------------------------
-- Verifikasi sertifikat (publik)
-- ------------------------------------------------------------------

-- Accepts a certificate number (KB-2026-00001) or the registration number
-- the parent already has. Returns only what a certificate itself prints —
-- never the child id, the parent, or anything about payment.
create or replace function verify_certificate(p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_query text := upper(trim(p_query));
  v_cert certificates;
begin
  if length(v_query) < 6 then
    return jsonb_build_object('ok', false, 'reason', 'TOO_SHORT');
  end if;

  select * into v_cert from certificates where upper(number) = v_query;

  if not found then
    select c.* into v_cert
    from certificates c
    join registrations r on r.id = c.registration_id
    where upper(r.registration_number) = v_query
    order by c.issued_at desc
    limit 1;
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  end if;
  if v_cert.status = 'revoked' then
    return jsonb_build_object('ok', false, 'reason', 'REVOKED');
  end if;

  return jsonb_build_object(
    'ok', true,
    'number', v_cert.number,
    'registrationId', v_cert.registration_id,
    'childId', v_cert.child_id,
    'eventId', v_cert.event_id,
    'participantName', v_cert.participant_name,
    'eventTitle', v_cert.event_title,
    'eventDate', v_cert.event_date,
    'organizer', v_cert.organizer,
    'template', v_cert.template,
    'issuedAt', v_cert.issued_at,
    'status', v_cert.status,
    'signatoryName', v_cert.signatory_name,
    'signatoryRole', v_cert.signatory_role
  );
end;
$$;

grant execute on function verify_certificate to anon, authenticated;

-- ------------------------------------------------------------------
-- Affiliate — persetujuan dan penerbitan kode
-- ------------------------------------------------------------------

-- Derives a readable code from the applicant's name (BUDI01, BUDI02 …) and
-- keeps trying until it finds one nothing else holds, so two applicants with
-- the same first name can both be approved.
create or replace function generate_affiliate_code(p_full_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_candidate text;
  v_suffix int := 1;
begin
  v_base := upper(regexp_replace(split_part(trim(p_full_name), ' ', 1), '[^a-zA-Z]', '', 'g'));
  if length(v_base) < 3 then
    v_base := 'KB' || v_base;
  end if;
  v_base := left(v_base, 8);

  loop
    v_candidate := v_base || lpad(v_suffix::text, 2, '0');
    exit when not exists (select 1 from affiliates where upper(code) = v_candidate);
    v_suffix := v_suffix + 1;
    if v_suffix > 99 then
      v_candidate := v_base || to_char(now(), 'SSSS');
      exit;
    end if;
  end loop;

  return v_candidate;
end;
$$;

-- Approving mints the code if the affiliate does not have one yet. Rejecting
-- or deactivating keeps the code on the row, so a code is never reassigned to
-- a different person later.
create or replace function admin_set_affiliate_status(
  p_affiliate_id uuid,
  p_status text,
  p_notes text default null,
  p_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing affiliates;
  v_code text;
begin
  if not is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;
  if p_status not in ('PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED') then
    raise exception 'INVALID_STATUS' using errcode = 'P0007';
  end if;

  select * into v_existing from affiliates where id = p_affiliate_id;
  if not found then
    raise exception 'AFFILIATE_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_code := v_existing.code;

  if p_status = 'ACTIVE' then
    if p_code is not null and trim(p_code) <> '' then
      v_code := upper(regexp_replace(trim(p_code), '\s', '', 'g'));
      if exists (
        select 1 from affiliates where upper(code) = v_code and id <> p_affiliate_id
      ) then
        raise exception 'CODE_TAKEN' using errcode = 'P0009';
      end if;
    elsif v_code is null then
      v_code := generate_affiliate_code(v_existing.full_name);
    end if;
  end if;

  update affiliates set
    status = p_status,
    code = v_code,
    notes = coalesce(nullif(trim(p_notes), ''), notes),
    verified_at = case when p_status = 'ACTIVE' then now() else verified_at end,
    verified_by = case when p_status = 'ACTIVE' then auth.uid()::text else verified_by end
  where id = p_affiliate_id;

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (
    auth.uid(), 'SET_AFFILIATE_STATUS', 'affiliates', p_affiliate_id::text,
    jsonb_build_object('status', v_existing.status, 'code', v_existing.code),
    jsonb_build_object('status', p_status, 'code', v_code)
  );

  return jsonb_build_object('status', p_status, 'code', v_code);
end;
$$;

-- Per-affiliate performance, for the admin list. Counts only registrations
-- that were not cancelled, and revenue only from payments actually settled.
create or replace function admin_affiliate_stats()
returns table (
  code text,
  registrations int,
  paid_registrations int,
  revenue numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;

  return query
  select
    upper(r.affiliate_code)::text,
    count(*)::int,
    count(*) filter (where r.payment_status = 'PAID')::int,
    coalesce(sum(p.amount) filter (where p.status = 'PAID'), 0)::numeric
  from registrations r
  left join payments p on p.registration_id = r.id
  where r.affiliate_code is not null
    and r.affiliate_code <> ''
    and r.status <> 'CANCELLED'
  group by upper(r.affiliate_code);
end;
$$;

grant execute on function admin_set_affiliate_status, admin_affiliate_stats to authenticated;
grant execute on function generate_affiliate_code to authenticated;


-- ===================================================================
-- 004 — cms-website-schema.sql
-- CMS Website: section, koleksi, riwayat versi, builder
-- ===================================================================

-- Kelas Bermain — CMS Website (website builder)
--
-- Run once in the Supabase SQL Editor AFTER admin-schema.sql. Safe to re-run.
--
-- Extends the cms_sections table that already exists rather than replacing it,
-- so the hero, hero slides and events teaser the team already edited keep
-- their content and their publish state. Nothing here drops a table.

-- ------------------------------------------------------------------
-- 1. cms_sections gains ordering, visibility and a human label
-- ------------------------------------------------------------------

alter table cms_sections add column if not exists sort_order int not null default 0;
alter table cms_sections add column if not exists is_visible boolean not null default true;
alter table cms_sections add column if not exists label text not null default '';

create index if not exists cms_sections_order_idx on cms_sections (page_key, sort_order);

-- ------------------------------------------------------------------
-- 2. Repeatable content (Yang Diasah, testimoni, galeri, berita, update)
-- ------------------------------------------------------------------

create table if not exists cms_collections (
  id uuid primary key default gen_random_uuid(),
  collection_key text not null,
  item_key text not null,
  draft jsonb not null default '{}'::jsonb,
  published jsonb,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  published_at timestamptz,
  unique (collection_key, item_key)
);

create index if not exists cms_collections_key_idx
  on cms_collections (collection_key, sort_order);

-- ------------------------------------------------------------------
-- 3. Version history — one snapshot per publish, so a bad edit is undoable
-- ------------------------------------------------------------------

create table if not exists cms_versions (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  scope_key text not null,
  snapshot jsonb not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create index if not exists cms_versions_scope_idx
  on cms_versions (scope, scope_key, created_at desc);

-- ------------------------------------------------------------------
-- 4. RLS — admins only, same posture as the rest of the CMS
-- ------------------------------------------------------------------

alter table cms_collections enable row level security;
alter table cms_versions enable row level security;

drop policy if exists cms_collections_admin on cms_collections;
create policy cms_collections_admin on cms_collections
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists cms_versions_admin on cms_versions;
create policy cms_versions_admin on cms_versions
  for all to authenticated using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------------
-- 5. Public read — published + visible only, never drafts
-- ------------------------------------------------------------------

-- Replaces the older get_cms_sections for callers that need order and
-- visibility. The old function stays so nothing already deployed breaks.
-- `create or replace` cannot change a function's return type, and this file
-- defines get_cms_page twice: once here and again in section 11, which adds
-- the `presentation` column. Dropping first is what makes the file re-runnable
-- whichever version the database already holds. Nothing depends on it but the
-- grant re-issued below, so the drop is safe.
drop function if exists get_cms_page(text);
create or replace function get_cms_page(p_page_key text)
returns table (section_key text, content jsonb, sort_order int)
language sql
stable
security definer
set search_path = public
as $$
  select s.section_key, s.published, s.sort_order
  from cms_sections s
  where s.page_key = p_page_key
    and s.published is not null
    and s.is_visible
  order by s.sort_order, s.section_key;
$$;

create or replace function get_cms_collection(p_collection_key text)
returns table (item_key text, content jsonb, sort_order int)
language sql
stable
security definer
set search_path = public
as $$
  select c.item_key, c.published, c.sort_order
  from cms_collections c
  where c.collection_key = p_collection_key
    and c.published is not null
    and c.is_visible
  order by c.sort_order, c.item_key;
$$;

grant execute on function get_cms_page, get_cms_collection to anon, authenticated;

-- ------------------------------------------------------------------
-- 6. Publish in one transaction: draft -> published, plus a version snapshot
-- ------------------------------------------------------------------

create or replace function admin_publish_page(p_page_key text, p_note text default '')
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_snapshot jsonb;
begin
  if not is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;

  -- Snapshot what is live right now, so Publish is reversible.
  select coalesce(jsonb_agg(jsonb_build_object(
    'sectionKey', section_key, 'published', published,
    'sortOrder', sort_order, 'isVisible', is_visible
  )), '[]'::jsonb)
  into v_snapshot
  from cms_sections where page_key = p_page_key;

  insert into cms_versions (scope, scope_key, snapshot, note, created_by)
  values ('page', p_page_key, v_snapshot, coalesce(p_note, ''), auth.uid());

  update cms_sections
  set published = draft, published_at = now(), updated_by = auth.uid()
  where page_key = p_page_key and draft is distinct from published;

  get diagnostics v_count = row_count;

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (auth.uid(), 'CMS_PUBLISH', 'cms_sections', p_page_key, null,
          jsonb_build_object('sections', v_count));

  return v_count;
end;
$$;

create or replace function admin_publish_collection(p_collection_key text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_snapshot jsonb;
begin
  if not is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'itemKey', item_key, 'published', published,
    'sortOrder', sort_order, 'isVisible', is_visible
  )), '[]'::jsonb)
  into v_snapshot
  from cms_collections where collection_key = p_collection_key;

  insert into cms_versions (scope, scope_key, snapshot, note, created_by)
  values ('collection', p_collection_key, v_snapshot, '', auth.uid());

  update cms_collections
  set published = draft, published_at = now(), updated_by = auth.uid()
  where collection_key = p_collection_key and draft is distinct from published;

  get diagnostics v_count = row_count;

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (auth.uid(), 'CMS_PUBLISH', 'cms_collections', p_collection_key, null,
          jsonb_build_object('items', v_count));

  return v_count;
end;
$$;

-- Restores a snapshot into the DRAFT columns only. The live site is not
-- touched: the admin previews the restored version and publishes it like any
-- other change, so "restore" can never surprise a visitor.
create or replace function admin_restore_version(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version cms_versions;
  v_item jsonb;
begin
  if not is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;

  select * into v_version from cms_versions where id = p_version_id;
  if not found then
    raise exception 'VERSION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_version.scope = 'page' then
    for v_item in select * from jsonb_array_elements(v_version.snapshot) loop
      update cms_sections set
        draft = coalesce(v_item->'published', draft),
        sort_order = coalesce((v_item->>'sortOrder')::int, sort_order),
        is_visible = coalesce((v_item->>'isVisible')::boolean, is_visible),
        updated_at = now()
      where page_key = v_version.scope_key
        and section_key = v_item->>'sectionKey';
    end loop;
  elsif v_version.scope = 'collection' then
    for v_item in select * from jsonb_array_elements(v_version.snapshot) loop
      update cms_collections set
        draft = coalesce(v_item->'published', draft),
        sort_order = coalesce((v_item->>'sortOrder')::int, sort_order),
        is_visible = coalesce((v_item->>'isVisible')::boolean, is_visible),
        updated_at = now()
      where collection_key = v_version.scope_key
        and item_key = v_item->>'itemKey';
    end loop;
  end if;

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (auth.uid(), 'CMS_RESTORE', 'cms_versions', p_version_id::text, null,
          jsonb_build_object('scope', v_version.scope, 'key', v_version.scope_key));
end;
$$;

grant execute on function admin_publish_page, admin_publish_collection,
  admin_restore_version to authenticated;

-- ------------------------------------------------------------------
-- 7. Seed — the copy the site ships with today
--
-- Publishing from the admin therefore starts from exactly what is already
-- live, and nobody has to retype content that already exists. Every insert
-- is ON CONFLICT DO NOTHING so re-running never overwrites an edit.
-- ------------------------------------------------------------------

-- Give the three sections that already exist their label and order.
update cms_sections set label = 'Hero', sort_order = 10
  where page_key = 'home' and section_key = 'hero' and label = '';
update cms_sections set label = 'Gambar Hero', sort_order = 20
  where page_key = 'home' and section_key = 'hero_slides' and label = '';
update cms_sections set label = 'Jadwal Kegiatan', sort_order = 40
  where page_key = 'home' and section_key = 'events_teaser' and label = '';

insert into cms_sections (page_key, section_key, label, sort_order, draft, published, published_at)
values
  ('home', 'pillars', 'Yang Diasah', 30, jsonb_build_object(
    'eyebrow', 'Yang diasah',
    'title', 'Empat kemampuan yang kami bangun',
    'description', 'Setiap kegiatan dirancang untuk melatih keempat hal ini sekaligus, tanpa terasa seperti pelajaran.'
  ), jsonb_build_object(
    'eyebrow', 'Yang diasah',
    'title', 'Empat kemampuan yang kami bangun',
    'description', 'Setiap kegiatan dirancang untuk melatih keempat hal ini sekaligus, tanpa terasa seperti pelajaran.'
  ), now()),

  ('home', 'join_steps', 'Cara Ikut', 50, jsonb_build_object(
    'eyebrow', 'Cara ikut',
    'title', 'Empat langkah sampai anak ikut kelas',
    'description', 'Pendaftaran dibuat sesederhana mungkin supaya orang tua tidak perlu bolak-balik bertanya.'
  ), jsonb_build_object(
    'eyebrow', 'Cara ikut',
    'title', 'Empat langkah sampai anak ikut kelas',
    'description', 'Pendaftaran dibuat sesederhana mungkin supaya orang tua tidak perlu bolak-balik bertanya.'
  ), now()),

  ('home', 'activities', 'Yang Sudah Kami Jalankan', 60, jsonb_build_object(
    'eyebrow', 'Yang sudah kami jalankan',
    'title', 'Kegiatan yang sudah berjalan',
    'description', 'Dokumentasi kelas yang sudah kami selenggarakan bersama anak-anak dan mitra.',
    'limit', 3
  ), jsonb_build_object(
    'eyebrow', 'Yang sudah kami jalankan',
    'title', 'Kegiatan yang sudah berjalan',
    'description', 'Dokumentasi kelas yang sudah kami selenggarakan bersama anak-anak dan mitra.',
    'limit', 3
  ), now()),

  ('home', 'gallery', 'Sekilas Keseruan', 70, jsonb_build_object(
    'eyebrow', 'Galeri',
    'title', 'Sekilas keseruan di kelas',
    'description', 'Momen yang sempat kami abadikan di beberapa kegiatan terakhir.',
    'limit', 6
  ), jsonb_build_object(
    'eyebrow', 'Galeri',
    'title', 'Sekilas keseruan di kelas',
    'description', 'Momen yang sempat kami abadikan di beberapa kegiatan terakhir.',
    'limit', 6
  ), now()),

  ('home', 'testimonials', 'Cerita Ayah & Bunda', 80, jsonb_build_object(
    'eyebrow', 'Cerita orang tua',
    'title', 'Cerita dari Ayah & Bunda',
    'description', 'Cerita langsung dari orang tua yang anaknya sudah ikut kelas bersama kami.'
  ), jsonb_build_object(
    'eyebrow', 'Cerita orang tua',
    'title', 'Cerita dari Ayah & Bunda',
    'description', 'Cerita langsung dari orang tua yang anaknya sudah ikut kelas bersama kami.'
  ), now()),

  ('home', 'social_feed', 'Ikuti Keseruan', 90, jsonb_build_object(
    'eyebrow', 'Update terbaru',
    'title', 'Ikuti keseruan Kelas Bermain',
    'description', 'Kabar kegiatan, pengumuman, dan dokumentasi kelas terbaru kami.',
    'buttonLabel', 'Lihat Semua Update',
    'buttonHref', '/update',
    'instagramUrl', 'https://instagram.com/kelasbermain.id',
    'limit', 6
  ), jsonb_build_object(
    'eyebrow', 'Update terbaru',
    'title', 'Ikuti keseruan Kelas Bermain',
    'description', 'Kabar kegiatan, pengumuman, dan dokumentasi kelas terbaru kami.',
    'buttonLabel', 'Lihat Semua Update',
    'buttonHref', '/update',
    'instagramUrl', 'https://instagram.com/kelasbermain.id',
    'limit', 6
  ), now()),

  ('home', 'cta', 'Ajakan Daftar', 100, jsonb_build_object(
    'title', 'Siap mencoba kelas pertama?',
    'description', 'Pilih kegiatan yang paling sesuai untuk si kecil, lalu daftar langsung dari halaman kelasnya.',
    'buttonLabel', 'Lihat Semua Event',
    'buttonHref', '/event'
  ), jsonb_build_object(
    'title', 'Siap mencoba kelas pertama?',
    'description', 'Pilih kegiatan yang paling sesuai untuk si kecil, lalu daftar langsung dari halaman kelasnya.',
    'buttonLabel', 'Lihat Semua Event',
    'buttonHref', '/event'
  ), now())
on conflict (page_key, section_key) do nothing;

-- Global website settings: identity, footer, SEO, theme.
insert into cms_sections (page_key, section_key, label, sort_order, draft, published, published_at)
values
  ('global', 'identity', 'Identitas Website', 10, jsonb_build_object(
    'name', 'Kelas Bermain',
    'tagline', 'Tempat anak bermain, belajar, dan bertumbuh.',
    'description', 'Kelas Bermain menghadirkan aktivitas kreatif dan edukatif untuk anak usia 3–15 tahun di Jabodetabek.',
    'logoUrl', '', 'logoMobileUrl', '', 'faviconUrl', '',
    'email', 'kelasbermain.id@gmail.com',
    'whatsapp', '081774918611',
    'instagramUrl', 'https://instagram.com/kelasbermain.id',
    'youtubeUrl', '',
    'tiktokUrl', 'https://www.tiktok.com/@kelasbermain.id',
    'facebookUrl', '',
    'threadsUrl', 'https://www.threads.net/@kelasbermain.id'
  ), jsonb_build_object(
    'name', 'Kelas Bermain',
    'tagline', 'Tempat anak bermain, belajar, dan bertumbuh.',
    'description', 'Kelas Bermain menghadirkan aktivitas kreatif dan edukatif untuk anak usia 3–15 tahun di Jabodetabek.',
    'logoUrl', '', 'logoMobileUrl', '', 'faviconUrl', '',
    'email', 'kelasbermain.id@gmail.com',
    'whatsapp', '081774918611',
    'instagramUrl', 'https://instagram.com/kelasbermain.id',
    'youtubeUrl', '',
    'tiktokUrl', 'https://www.tiktok.com/@kelasbermain.id',
    'facebookUrl', '',
    'threadsUrl', 'https://www.threads.net/@kelasbermain.id'
  ), now()),

  ('global', 'footer', 'Footer', 20, jsonb_build_object(
    'description', 'Tempat anak bermain, belajar, dan bertumbuh bersama teman baru di Jabodetabek.',
    'copyright', '© 2026 Kelas Bermain. Seluruh hak cipta dilindungi.',
    'contactTitle', 'Hubungi kami',
    'showWhatsapp', false
  ), jsonb_build_object(
    'description', 'Tempat anak bermain, belajar, dan bertumbuh bersama teman baru di Jabodetabek.',
    'copyright', '© 2026 Kelas Bermain. Seluruh hak cipta dilindungi.',
    'contactTitle', 'Hubungi kami',
    'showWhatsapp', false
  ), now()),

  ('global', 'seo', 'SEO', 30, jsonb_build_object(
    'siteTitle', 'Kelas Bermain — Tempat anak bermain, belajar, dan bertumbuh.',
    'description', 'Aktivitas kreatif dan edukatif untuk anak usia 3–15 tahun di Jabodetabek.',
    'ogImageUrl', '',
    'keywords', 'kelas anak, aktivitas anak, jabodetabek, playdate, edukasi anak'
  ), jsonb_build_object(
    'siteTitle', 'Kelas Bermain — Tempat anak bermain, belajar, dan bertumbuh.',
    'description', 'Aktivitas kreatif dan edukatif untuk anak usia 3–15 tahun di Jabodetabek.',
    'ogImageUrl', '',
    'keywords', 'kelas anak, aktivitas anak, jabodetabek, playdate, edukasi anak'
  ), now()),

  ('global', 'theme', 'Tampilan', 40, jsonb_build_object(
    'brand', '', 'brandInk', '', 'accent', '', 'canvas', '', 'surface', '',
    'ink', '', 'muted', '', 'line', '',
    'radiusButton', '', 'radiusCard', '', 'containerWidth', ''
  ), jsonb_build_object(
    'brand', '', 'brandInk', '', 'accent', '', 'canvas', '', 'surface', '',
    'ink', '', 'muted', '', 'line', '',
    'radiusButton', '', 'radiusCard', '', 'containerWidth', ''
  ), now())
on conflict (page_key, section_key) do nothing;

-- Yang Diasah — the four pillars that were hardcoded in src/data/site.ts.
insert into cms_collections (collection_key, item_key, sort_order, draft, published, published_at)
values
  ('pillars', 'kemandirian', 10, jsonb_build_object(
    'title', 'Kemandirian',
    'description', 'Anak belajar memulai dan menyelesaikan aktivitasnya sendiri — dari memakai apron sampai merapikan alat setelah selesai.',
    'icon', 'compass', 'accent', 'sky'
  ), jsonb_build_object(
    'title', 'Kemandirian',
    'description', 'Anak belajar memulai dan menyelesaikan aktivitasnya sendiri — dari memakai apron sampai merapikan alat setelah selesai.',
    'icon', 'compass', 'accent', 'sky'
  ), now()),
  ('pillars', 'keberanian', 20, jsonb_build_object(
    'title', 'Keberanian',
    'description', 'Mencoba hal baru dan mengeksplorasi lingkungan yang belum pernah didatangi, dengan pendampingan yang membuat anak merasa aman.',
    'icon', 'sparkles', 'accent', 'brand'
  ), jsonb_build_object(
    'title', 'Keberanian',
    'description', 'Mencoba hal baru dan mengeksplorasi lingkungan yang belum pernah didatangi, dengan pendampingan yang membuat anak merasa aman.',
    'icon', 'sparkles', 'accent', 'brand'
  ), now()),
  ('pillars', 'motorik', 30, jsonb_build_object(
    'title', 'Motorik',
    'description', 'Bergerak, memanen, mengaduk, dan merakit. Aktivitas fisik yang melatih koordinasi tangan dan tubuh tanpa terasa seperti latihan.',
    'icon', 'footprints', 'accent', 'leaf'
  ), jsonb_build_object(
    'title', 'Motorik',
    'description', 'Bergerak, memanen, mengaduk, dan merakit. Aktivitas fisik yang melatih koordinasi tangan dan tubuh tanpa terasa seperti latihan.',
    'icon', 'footprints', 'accent', 'leaf'
  ), now()),
  ('pillars', 'komunikasi', 40, jsonb_build_object(
    'title', 'Komunikasi',
    'description', 'Kegiatan selalu dikerjakan berkelompok, sehingga anak terbiasa berbicara, bergantian, dan bekerja sama dengan teman baru.',
    'icon', 'message', 'accent', 'grape'
  ), jsonb_build_object(
    'title', 'Komunikasi',
    'description', 'Kegiatan selalu dikerjakan berkelompok, sehingga anak terbiasa berbicara, bergantian, dan bekerja sama dengan teman baru.',
    'icon', 'message', 'accent', 'grape'
  ), now())
on conflict (collection_key, item_key) do nothing;

-- ------------------------------------------------------------------
-- 8. Navigasi — Berita kini punya halamannya sendiri
--
-- "/kegiatan" sempat diberi label "Berita" karena belum ada halaman berita.
-- Sekarang keduanya ada dan isinya memang berbeda: Kegiatan adalah katalog
-- aktivitas (jumlah peserta, highlight, timeline), Berita adalah artikel.
-- ------------------------------------------------------------------

update navigation_items set label = 'Kegiatan' where href = '/kegiatan' and label = 'Berita';

insert into navigation_items (label, href, sort_order, is_visible, open_in_new_tab)
values ('Berita', '/berita', 35, true, false)
on conflict (href) do nothing;

-- ------------------------------------------------------------------
-- 9. Event — di mana tiap event ditampilkan
--
-- DEPENDS ON events-schema.sql. Run that first.
--
-- The events table stays the single source of truth; these three columns only
-- say where an event is shown. No event data is duplicated into the CMS.
-- ------------------------------------------------------------------

alter table events add column if not exists show_on_event_page boolean not null default true;
alter table events add column if not exists show_in_history boolean not null default true;

-- Replaces the version in events-schema.sql so the public listing respects
-- the new switch. Same signature, so nothing that calls it needs changing.
create or replace function get_public_events()
returns setof events
language sql
stable
security definer
set search_path = public
as $$
  select * from events
  where status in ('PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED')
    and show_on_event_page
  order by start_date;
$$;

grant execute on function get_public_events to anon, authenticated;

-- Homepage needs featured and history flags too, so it gets its own reader
-- rather than filtering a list that was built for the event page.
create or replace function get_homepage_events()
returns setof events
language sql
stable
security definer
set search_path = public
as $$
  select * from events
  where status in ('PUBLISHED', 'ONGOING')
  order by featured desc, start_date;
$$;

create or replace function get_history_events()
returns setof events
language sql
stable
security definer
set search_path = public
as $$
  select * from events
  where status = 'COMPLETED' and show_in_history
  order by start_date desc;
$$;

grant execute on function get_homepage_events, get_history_events to anon, authenticated;

-- ------------------------------------------------------------------
-- 10. Certificate Designer
--
-- DEPENDS ON schema.sql (certificates) and admin-schema.sql (is_admin).
--
-- Templates are additive: certificates already issued keep the template name
-- they were issued with, and creating a new template changes nothing that
-- has already been handed out.
-- ------------------------------------------------------------------

create table if not exists certificate_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  background_url text not null default '',
  logo_url text not null default '',
  orientation text not null default 'LANDSCAPE'
    check (orientation in ('LANDSCAPE', 'PORTRAIT')),
  -- Element positions, fonts and colours. Shape is owned by the app.
  config jsonb not null default '{"elements": []}'::jsonb,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create index if not exists certificate_templates_status_idx on certificate_templates (status);

-- At most one default, enforced by the database rather than by the UI.
create unique index if not exists certificate_templates_one_default
  on certificate_templates (is_default) where is_default;

alter table certificate_templates enable row level security;

drop policy if exists certificate_templates_admin on certificate_templates;
create policy certificate_templates_admin on certificate_templates
  for all to authenticated using (is_admin()) with check (is_admin());

-- The public verification page needs to render an issued certificate, so it
-- may read PUBLISHED templates only — never drafts.
create or replace function get_certificate_template(p_name text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', t.id, 'name', t.name, 'backgroundUrl', t.background_url,
    'logoUrl', t.logo_url, 'orientation', t.orientation, 'config', t.config
  )
  from certificate_templates t
  where t.status = 'PUBLISHED'
    and (p_name is null or t.name = p_name)
  order by (t.name = p_name) desc, t.is_default desc
  limit 1;
$$;

grant execute on function get_certificate_template to anon, authenticated;

-- Setting a default clears the previous one in the same transaction, so the
-- unique index above can never be violated by two separate updates.
create or replace function admin_set_default_certificate_template(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;

  update certificate_templates set is_default = false where is_default;
  update certificate_templates
    set is_default = true, status = 'PUBLISHED', updated_at = now()
  where id = p_template_id;

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (auth.uid(), 'CERTIFICATE_TEMPLATE_PUBLISH', 'certificate_templates',
          p_template_id::text, null, jsonb_build_object('isDefault', true));
end;
$$;

grant execute on function admin_set_default_certificate_template to authenticated;

-- ------------------------------------------------------------------
-- 11. Website Builder — section type, archiving, and presentation presets
--
-- Extends cms_sections rather than adding homepage_sections / theme_settings
-- tables: everything below is per-section configuration, which is what this
-- table already holds.
-- ------------------------------------------------------------------

-- Which template a section renders with. Sections that shipped with the site
-- keep their own key as the type, so nothing needs backfilling by hand.
alter table cms_sections add column if not exists section_type text not null default '';
update cms_sections set section_type = section_key where section_type = '';

-- Soft delete. Archived sections keep their content and stay out of both the
-- public site and the builder list, so "delete" is never destructive.
alter table cms_sections add column if not exists archived boolean not null default false;
alter table cms_collections add column if not exists archived boolean not null default false;

-- Per-section presentation, chosen from presets only. No free-form CSS
-- reaches the database, which is what keeps the mobile layout safe.
alter table cms_sections add column if not exists presentation jsonb not null default '{}'::jsonb;

create index if not exists cms_sections_active_idx
  on cms_sections (page_key, sort_order) where not archived;

-- Public readers must skip archived rows. Drop first: the definition above
-- returns three columns, this one adds `presentation`.
drop function if exists get_cms_page(text);
create or replace function get_cms_page(p_page_key text)
returns table (section_key text, content jsonb, sort_order int, presentation jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select s.section_key, s.published, s.sort_order, s.presentation
  from cms_sections s
  where s.page_key = p_page_key
    and s.published is not null
    and s.is_visible
    and not s.archived
  order by s.sort_order, s.section_key;
$$;

create or replace function get_cms_collection(p_collection_key text)
returns table (item_key text, content jsonb, sort_order int)
language sql
stable
security definer
set search_path = public
as $$
  select c.item_key, c.published, c.sort_order
  from cms_collections c
  where c.collection_key = p_collection_key
    and c.published is not null
    and c.is_visible
    and not c.archived
  order by c.sort_order, c.item_key;
$$;

grant execute on function get_cms_page, get_cms_collection to anon, authenticated;

-- Reordering is one statement so a drag can never leave two sections sharing
-- a position, or half-applied if the browser disconnects mid-way.
create or replace function admin_reorder_sections(p_page_key text, p_section_keys text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;

  update cms_sections s
  set sort_order = (idx.ord * 10)
  from unnest(p_section_keys) with ordinality as idx(key, ord)
  where s.page_key = p_page_key and s.section_key = idx.key;

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (auth.uid(), 'SECTION_REORDER', 'cms_sections', p_page_key, null,
          jsonb_build_object('order', to_jsonb(p_section_keys)));
end;
$$;

grant execute on function admin_reorder_sections to authenticated;

