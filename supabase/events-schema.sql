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
