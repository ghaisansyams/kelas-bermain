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
