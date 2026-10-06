-- Kelas Bermain — shared database schema
--
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query
-- → paste this whole file → Run). Safe to re-run: everything is IF NOT EXISTS
-- / CREATE OR REPLACE, except the DROP POLICY statements which only drop
-- policies this file itself defines.
--
-- Mirrors src/lib/repositories/types.ts table-for-table. Numbering
-- (KB-CUS-00001, KB-REG-2026-00001, …) is generated here by trigger, not in
-- the app, so two people registering at the same instant can never collide.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- Sequences + number formatting
-- ------------------------------------------------------------------

create sequence if not exists customer_number_seq;
create sequence if not exists child_number_seq;
create sequence if not exists affiliate_number_seq;
-- Registration/payment numbers are per-year (KB-REG-2026-00001), so they
-- can't be one global sequence; a small counter table keyed by year instead.
create table if not exists number_counters (
  scope text not null,
  year int not null,
  value int not null default 0,
  primary key (scope, year)
);

create or replace function next_yearly_number(p_scope text, p_prefix text, p_year int)
returns text
language plpgsql
as $$
declare
  v_value int;
begin
  insert into number_counters (scope, year, value)
  values (p_scope, p_year, 1)
  on conflict (scope, year) do update set value = number_counters.value + 1
  returning value into v_value;
  return format('%s-%s-%s', p_prefix, p_year, lpad(v_value::text, 5, '0'));
end;
$$;

-- ------------------------------------------------------------------
-- customers
-- ------------------------------------------------------------------

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  customer_number text unique not null default
    ('KB-CUS-' || lpad(nextval('customer_number_seq')::text, 5, '0')),
  full_name text not null,
  email text not null default '',
  whatsapp text not null,
  domicile text not null default '',
  address text not null default '',
  city text not null default '',
  occupation text not null default '—',
  source text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_whatsapp_idx on customers (whatsapp);
create index if not exists customers_email_idx on customers (lower(email)) where email <> '';

-- ------------------------------------------------------------------
-- children
-- ------------------------------------------------------------------

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  child_number text unique not null default
    ('KB-CHD-' || lpad(nextval('child_number_seq')::text, 5, '0')),
  customer_id uuid not null references customers (id) on delete cascade,
  full_name text not null,
  nickname text not null,
  gender text not null default '',
  date_of_birth date,
  age_years int,
  age_months int,
  age_recorded_at timestamptz,
  school text not null default '',
  grade text not null default '—',
  special_notes text,
  emergency_contact text not null default '—',
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create index if not exists children_customer_idx on children (customer_id);

-- ------------------------------------------------------------------
-- registrations
-- ------------------------------------------------------------------

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  registration_number text unique not null default
    next_yearly_number('registration', 'KB-REG', extract(year from now())::int),
  -- Opaque, unguessable identifier for public URLs (payment/attendance links).
  -- registration_number stays sequential and is fine to say out loud or put
  -- in a WhatsApp message; it must never be the only thing gating a page
  -- that shows a child's name, school or a parent's WhatsApp number.
  access_token uuid not null default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete restrict,
  child_id uuid not null references children (id) on delete restrict,
  event_id text not null,
  registration_date timestamptz not null default now(),
  status text not null default 'REGISTERED',
  payment_status text not null default 'PENDING',
  attendance_status text not null default 'NOT_ATTENDED',
  certificate_status text not null default 'NOT_ELIGIBLE',
  payment_method text not null default 'NONE',
  amount numeric not null default 0,
  source text not null,
  qr_source text,
  affiliate_code text,
  age_override boolean not null default false,
  notes text
);
create unique index if not exists registrations_access_token_idx on registrations (access_token);
create index if not exists registrations_customer_idx on registrations (customer_id);
create index if not exists registrations_child_idx on registrations (child_id);
create index if not exists registrations_event_idx on registrations (event_id);
create index if not exists registrations_affiliate_code_idx on registrations (affiliate_code) where affiliate_code is not null;

-- ------------------------------------------------------------------
-- payments
-- ------------------------------------------------------------------

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text unique not null default
    next_yearly_number('payment', 'KB-PAY', extract(year from now())::int),
  registration_id uuid not null references registrations (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete restrict,
  event_id text not null,
  amount numeric not null default 0,
  method text not null,
  status text not null default 'PENDING',
  provider text not null default 'Manual Transfer',
  reference text,
  proof_url text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  expires_at timestamptz
);
create index if not exists payments_registration_idx on payments (registration_id);

-- ------------------------------------------------------------------
-- attendance
-- ------------------------------------------------------------------

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations (id) on delete cascade,
  event_id text not null,
  child_id uuid not null references children (id) on delete cascade,
  status text not null default 'NOT_ATTENDED',
  checked_in_at timestamptz,
  method text not null default 'form',
  recorded_by text
);
create unique index if not exists attendance_registration_idx on attendance_records (registration_id);

-- ------------------------------------------------------------------
-- certificates (feature-flagged off; table kept ready)
-- ------------------------------------------------------------------

create table if not exists certificates (
  number text primary key,
  registration_id uuid not null references registrations (id) on delete cascade,
  child_id uuid not null references children (id) on delete cascade,
  event_id text not null,
  participant_name text not null,
  event_title text not null,
  event_date date not null,
  organizer text not null default 'Kelas Bermain',
  template text not null default 'classic',
  issued_at timestamptz not null default now(),
  status text not null default 'issued',
  signatory_name text not null default '',
  signatory_role text not null default ''
);

-- ------------------------------------------------------------------
-- affiliates
-- ------------------------------------------------------------------

create table if not exists affiliates (
  id uuid primary key default gen_random_uuid(),
  affiliate_number text unique not null default
    ('KB-AFF-' || lpad(nextval('affiliate_number_seq')::text, 5, '0')),
  code text unique,
  full_name text not null,
  whatsapp text not null,
  email text,
  domicile text not null default '',
  bank_name text not null,
  bank_account_number text not null,
  bank_account_name text not null,
  reason text,
  status text not null default 'PENDING',
  applied_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by text,
  notes text
);
create index if not exists affiliates_whatsapp_idx on affiliates (whatsapp);

-- Admin flips status PENDING -> ACTIVE in the Table Editor; this mints the
-- code automatically so nobody has to invent one by hand or check for
-- collisions themselves. Four letters from the name (padded with X), four
-- random characters from an alphabet that drops 0/O/1/I so a code is never
-- misread when dictated over the phone.
create or replace function affiliates_assign_code()
returns trigger
language plpgsql
as $$
declare
  v_alphabet text := 'ACDEFGHJKLMNPQRTUVWXY2346789';
  v_stem text;
  v_candidate text;
  v_attempt int := 0;
begin
  if new.status = 'ACTIVE' and (new.code is null or new.code = '') then
    v_stem := upper(regexp_replace(coalesce(new.full_name, ''), '[^A-Za-z]', '', 'g'));
    v_stem := rpad(left(coalesce(nullif(v_stem, ''), 'KLBM'), 4), 4, 'X');
    loop
      v_candidate := v_stem;
      for i in 1..4 loop
        v_candidate := v_candidate || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
      end loop;
      exit when not exists (select 1 from affiliates where code = v_candidate);
      v_attempt := v_attempt + 1;
      exit when v_attempt > 50; -- practically unreachable
    end loop;
    new.code := v_candidate;
    if new.verified_at is null then
      new.verified_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_affiliates_assign_code on affiliates;
create trigger trg_affiliates_assign_code
  before insert or update on affiliates
  for each row execute function affiliates_assign_code();

-- ------------------------------------------------------------------
-- updated_at bookkeeping for customers
-- ------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_customers_updated_at on customers;
create trigger trg_customers_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- ------------------------------------------------------------------
-- Row Level Security
--
-- Default-deny for direct table access from the browser (the `anon` role).
-- The public site never reads or writes these tables directly — every
-- operation goes through one of the SECURITY DEFINER functions below, each
-- scoped to exactly what that page needs. The project owner (you, logged
-- into supabase.com) bypasses RLS entirely in the Table Editor, which is
-- also how affiliate applications get reviewed — no custom admin screen.
-- ------------------------------------------------------------------

alter table customers enable row level security;
alter table children enable row level security;
alter table registrations enable row level security;
alter table payments enable row level security;
alter table attendance_records enable row level security;
alter table certificates enable row level security;
alter table affiliates enable row level security;

-- No policies are created for anon/authenticated — RLS with zero policies
-- means "no rows visible, no rows writable" for every role except the
-- table owner / service role, which is exactly the default-deny posture
-- described above.

-- ------------------------------------------------------------------
-- RPCs the public site calls instead of touching tables directly
-- ------------------------------------------------------------------

-- Registration flow: find-or-create the parent, add a child, create the
-- registration + payment for it. Called once per child in a submission, from
-- a client transaction the app coordinates (see src/lib/repositories/index.ts).

create or replace function upsert_customer(
  p_full_name text, p_whatsapp text, p_domicile text, p_email text,
  p_address text, p_city text, p_occupation text, p_source text
) returns customers
language plpgsql security definer set search_path = public as $$
declare
  v_customer customers;
begin
  select * into v_customer from customers where whatsapp = p_whatsapp limit 1;
  if v_customer.id is not null then
    update customers set
      full_name = p_full_name,
      domicile = coalesce(nullif(p_domicile, ''), domicile),
      email = coalesce(nullif(p_email, ''), email),
      occupation = coalesce(nullif(p_occupation, ''), occupation)
    where id = v_customer.id
    returning * into v_customer;
    return v_customer;
  end if;
  insert into customers (full_name, whatsapp, domicile, email, address, city, occupation, source)
  values (p_full_name, p_whatsapp, p_domicile, coalesce(p_email, ''), coalesce(p_address, ''),
          coalesce(nullif(p_city, ''), p_domicile), coalesce(nullif(p_occupation, ''), '—'), p_source)
  returning * into v_customer;
  return v_customer;
end;
$$;

create or replace function upsert_child(
  p_customer_id uuid, p_full_name text, p_nickname text,
  p_age_years int, p_age_months int
) returns children
language plpgsql security definer set search_path = public as $$
declare
  v_child children;
begin
  select * into v_child from children
    where customer_id = p_customer_id and lower(full_name) = lower(p_full_name)
    limit 1;
  if v_child.id is not null then
    return v_child;
  end if;
  insert into children (
    customer_id, full_name, nickname, age_years, age_months, age_recorded_at,
    emergency_contact
  )
  select p_customer_id, p_full_name, coalesce(nullif(p_nickname, ''), split_part(p_full_name, ' ', 1)),
         p_age_years, p_age_months, now(), c.whatsapp
  from customers c where c.id = p_customer_id
  returning * into v_child;
  return v_child;
end;
$$;

-- One call per child; returns the created registration (and its sibling
-- payment row id, created by create_payment below in the same client flow).
create or replace function create_registration(
  p_customer_id uuid, p_child_id uuid, p_event_id text, p_amount numeric,
  p_status text, p_payment_status text, p_payment_method text,
  p_source text, p_qr_source text, p_affiliate_code text, p_age_override boolean
) returns registrations
language plpgsql security definer set search_path = public as $$
declare
  v_existing registrations;
  v_reg registrations;
begin
  select * into v_existing from registrations
    where customer_id = p_customer_id and child_id = p_child_id
      and event_id = p_event_id and status <> 'CANCELLED'
    limit 1;
  if v_existing.id is not null then
    raise exception 'DUPLICATE_REGISTRATION' using errcode = 'P0001';
  end if;
  insert into registrations (
    customer_id, child_id, event_id, amount, status, payment_status,
    payment_method, source, qr_source, affiliate_code, age_override
  ) values (
    p_customer_id, p_child_id, p_event_id, p_amount, p_status, p_payment_status,
    p_payment_method, p_source, nullif(p_qr_source, ''), nullif(p_affiliate_code, ''), p_age_override
  ) returning * into v_reg;
  return v_reg;
end;
$$;

create or replace function create_payment(
  p_registration_id uuid, p_customer_id uuid, p_event_id text, p_amount numeric,
  p_method text, p_provider text, p_expires_at timestamptz
) returns payments
language plpgsql security definer set search_path = public as $$
declare
  v_payment payments;
begin
  insert into payments (registration_id, customer_id, event_id, amount, method, provider, expires_at)
  values (p_registration_id, p_customer_id, p_event_id, p_amount, p_method, p_provider, p_expires_at)
  returning * into v_payment;
  return v_payment;
end;
$$;

-- Payment / receipt page: looked up by the opaque access_token from the URL,
-- never by the human-readable registration_number, so a sequential number
-- typed into a URL bar can't be walked to read someone else's data.
create or replace function get_registration_by_token(p_token uuid)
returns table (
  registration_id uuid, registration_number text, event_id text,
  status text, payment_status text, payment_method text, amount numeric,
  child_full_name text, customer_full_name text, customer_whatsapp text,
  payment_id uuid, payment_status_live text, payment_expires_at timestamptz
)
language sql security definer set search_path = public as $$
  select r.id, r.registration_number, r.event_id, r.status, r.payment_status,
         r.payment_method, r.amount, c.full_name, cu.full_name, cu.whatsapp,
         p.id, p.status, p.expires_at
  from registrations r
  join children c on c.id = r.child_id
  join customers cu on cu.id = r.customer_id
  left join payments p on p.registration_id = r.id
  where r.access_token = p_token;
$$;

-- Deliberately NOT granted to anon/authenticated below. A customer must
-- never be able to mark their own payment PAID — that turns "I transferred"
-- into "I typed a network request", which is exactly the fraud a real
-- shared database (unlike the old per-browser localStorage) would actually
-- expose money to. Verifying a transfer is admin's job: open Table Editor,
-- confirm the WhatsApp proof, flip payments.status and registrations.
-- payment_status to PAID by hand. This function stays defined for a future
-- authenticated admin tool, not for today's public site.
create or replace function set_payment_status(p_token uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reg_id uuid;
begin
  select id into v_reg_id from registrations where access_token = p_token;
  if v_reg_id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  update payments set status = p_status, paid_at = case when p_status = 'PAID' then now() else paid_at end
    where registration_id = v_reg_id;
  update registrations set
    payment_status = p_status,
    status = case when p_status = 'PAID' then 'CONFIRMED' else status end
    where id = v_reg_id;
end;
$$;

-- Attendance check-in: registration number + the contact given at sign-up
-- must both match, exactly like the current localStorage-backed check —
-- knowing only the (sequential, guessable) registration number is not enough.
create or replace function check_in_registration(p_registration_number text, p_contact text, p_method text default 'form')
returns table (child_full_name text, event_id text, already_recorded boolean, certificate_available boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_reg registrations;
  v_customer customers;
  v_child children;
  v_contact text := lower(trim(p_contact));
begin
  select * into v_reg from registrations where upper(registration_number) = upper(trim(p_registration_number));
  if v_reg.id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  select * into v_customer from customers where id = v_reg.customer_id;
  if lower(v_customer.whatsapp) <> v_contact and lower(v_customer.email) <> v_contact then
    raise exception 'CONTACT_MISMATCH' using errcode = 'P0003';
  end if;
  select * into v_child from children where id = v_reg.child_id;

  insert into attendance_records (registration_id, event_id, child_id, status, checked_in_at, method)
  values (v_reg.id, v_reg.event_id, v_reg.child_id, 'PRESENT', now(), coalesce(nullif(p_method, ''), 'form'))
  on conflict (registration_id) do nothing;

  update registrations set attendance_status = 'PRESENT',
    certificate_status = case when certificate_status = 'NOT_ELIGIBLE' then 'AVAILABLE' else certificate_status end
    where id = v_reg.id;

  return query select v_child.full_name, v_reg.event_id,
    (v_reg.attendance_status = 'PRESENT'), true;
end;
$$;

-- Affiliate application (public form). Returns only what the confirmation
-- screen needs — never the row itself, so bank details never round-trip
-- back to the browser that just submitted them.
create or replace function apply_as_affiliate(
  p_full_name text, p_whatsapp text, p_email text, p_domicile text,
  p_bank_name text, p_bank_account_number text, p_bank_account_name text, p_reason text
) returns table (affiliate_number text, status text)
language plpgsql security definer set search_path = public as $$
declare
  v_existing affiliates;
  v_new affiliates;
begin
  select * into v_existing from affiliates where whatsapp = p_whatsapp limit 1;
  if v_existing.id is not null and v_existing.status in ('PENDING', 'ACTIVE') then
    raise exception 'ALREADY_APPLIED' using errcode = 'P0004';
  end if;
  insert into affiliates (full_name, whatsapp, email, domicile, bank_name, bank_account_number, bank_account_name, reason)
  values (p_full_name, p_whatsapp, nullif(p_email, ''), p_domicile, p_bank_name, p_bank_account_number, p_bank_account_name, nullif(p_reason, ''))
  returning * into v_new;
  return query select v_new.affiliate_number, v_new.status;
end;
$$;

-- Affiliate code lookup for the registration form's live "Kode FIKA7QM2
-- milik Yufika Agustyani ✓" hint. Deliberately excludes bank details,
-- WhatsApp, email and domicile — the only things a stranger who happens to
-- type someone else's code should ever learn are the name and whether it's
-- currently active.
create or replace function find_affiliate_by_code(p_code text)
returns table (code text, full_name text, status text)
language sql security definer set search_path = public as $$
  select a.code, a.full_name, a.status from affiliates a
  where upper(a.code) = upper(trim(p_code));
$$;

-- Affiliate self-serve stats, if a status page is ever built for it.
create or replace function affiliate_stats(p_code text)
returns table (referrals int, paid_referrals int)
language sql security definer set search_path = public as $$
  select count(*)::int,
         count(*) filter (where payment_status = 'PAID')::int
  from registrations
  where upper(affiliate_code) = upper(trim(p_code)) and status <> 'CANCELLED';
$$;

-- "Cek Tiket" lookup: registration number + the contact given at sign-up,
-- same verification rule as check_in_registration, but read-only — no
-- attendance side effect. Returns only the opaque access_token, so the
-- public site can hand the visitor straight to the existing
-- /payment/[accessToken] status page instead of a second status view.
create or replace function find_access_token(p_registration_number text, p_contact text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_reg registrations;
  v_customer customers;
  v_contact text := lower(trim(p_contact));
begin
  select * into v_reg from registrations where upper(registration_number) = upper(trim(p_registration_number));
  if v_reg.id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  select * into v_customer from customers where id = v_reg.customer_id;
  if lower(v_customer.whatsapp) <> v_contact and lower(v_customer.email) <> v_contact then
    raise exception 'CONTACT_MISMATCH' using errcode = 'P0003';
  end if;
  return v_reg.access_token;
end;
$$;

-- set_payment_status is intentionally absent from this list — see the note
-- above its definition.
grant execute on function
  upsert_customer, upsert_child, create_registration, create_payment,
  get_registration_by_token, check_in_registration, find_access_token,
  apply_as_affiliate, find_affiliate_by_code, affiliate_stats
  to anon, authenticated;

-- Admin notification for new affiliate applications and new registrations
-- runs on a wa.me deep link the customer/applicant clicks themselves (see
-- affiliate-application-form.tsx and bank-transfer.tsx) rather than a
-- server-side WhatsApp gateway — a Fonnte-based trigger was tried and
-- removed: third-party WA gateways risk the connected number getting
-- banned by WhatsApp, which isn't worth it for a notification.
