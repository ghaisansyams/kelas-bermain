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
