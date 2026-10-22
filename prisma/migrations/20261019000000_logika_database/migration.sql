-- Pengganti auth.uid(): id pengguna yang bertindak dibaca dari app.user_id.
--
-- Fungsi admin_* (uang, sertifikat, publikasi CMS) memeriksa is_admin() di
-- dalam database, dan itu sengaja dipertahankan: pemeriksaan hak akses yang
-- ada di dua lapis tidak hilang kalau satu lapisnya lupa dipanggil. Isi fungsi
-- admin dibawa apa adanya dari database yang hidup; yang berganti hanya sumber
-- "siapa yang sedang bertindak".
--
-- Aplikasi mengisinya per transaksi lewat set_config('app.user_id', ..., true).
-- Tanpa itu auth.uid() bernilai NULL, is_admin() salah, dan semua fungsi admin
-- menolak — gagal tertutup, bukan terbuka.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

-- ---- fungsi (definisi diambil dari database yang hidup) ----

CREATE OR REPLACE FUNCTION public.admin_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select role from admin_users where user_id = auth.uid() and status = 'ACTIVE';
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from admin_users where user_id = auth.uid() and status = 'ACTIVE');
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from admin_users
    where user_id = auth.uid() and status = 'ACTIVE' and role = 'SUPER_ADMIN'
  );
$function$;

CREATE OR REPLACE FUNCTION public.admin_affiliate_stats()
 RETURNS TABLE(code text, registrations integer, paid_registrations integer, revenue numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_confirm_payment(p_payment_id uuid, p_method text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_payment payments; v_invoice text; v_method text;
begin
  if not is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0005'; end if;
  select * into v_payment from payments where id = p_payment_id;
  if v_payment.id is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_payment.status = 'PAID' then
    return jsonb_build_object('alreadyPaid', true, 'invoiceNumber', v_payment.invoice_number);
  end if;

  v_method := coalesce(nullif(p_method, ''), v_payment.method, 'TRANSFER_BANK');
  v_invoice := coalesce(v_payment.invoice_number,
    next_yearly_number('invoice', 'INV', extract(year from now())::int));

  update payments set status = 'PAID', paid_at = now(), verified_at = now(),
    verified_by = auth.uid(), method = v_method, invoice_number = v_invoice,
    notes = coalesce(nullif(p_notes, ''), notes)
  where id = p_payment_id;

  update registrations set payment_status = 'PAID',
    status = case when status = 'CANCELLED' then status else 'CONFIRMED' end
  where id = v_payment.registration_id;

  insert into financial_transactions (type, category, reference_type, reference_id, description, amount, payment_method, created_by)
  values ('INCOME', 'EVENT_REGISTRATION', 'payment', p_payment_id,
          format('Pembayaran %s', v_invoice), v_payment.amount, v_method, auth.uid());

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (auth.uid(), 'CONFIRM_PAYMENT', 'payments', p_payment_id::text,
          jsonb_build_object('status', v_payment.status),
          jsonb_build_object('status', 'PAID', 'invoiceNumber', v_invoice, 'method', v_method));

  return jsonb_build_object('alreadyPaid', false, 'invoiceNumber', v_invoice);
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_issue_certificate(p_registration_id uuid, p_template text DEFAULT 'classic'::text, p_signatory_name text DEFAULT ''::text, p_signatory_role text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_publish_collection(p_collection_key text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_publish_page(p_page_key text, p_note text DEFAULT ''::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_refund_payment(p_payment_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_payment payments;
begin
  if not is_admin() then raise exception 'FORBIDDEN' using errcode = 'P0005'; end if;
  select * into v_payment from payments where id = p_payment_id;
  if v_payment.id is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_payment.status <> 'PAID' then raise exception 'NOT_PAID' using errcode = 'P0006'; end if;

  update payments set status = 'REFUNDED', refund_reason = p_reason where id = p_payment_id;
  update registrations set payment_status = 'REFUNDED' where id = v_payment.registration_id;

  insert into financial_transactions (type, category, reference_type, reference_id, description, amount, payment_method, created_by)
  values ('REFUND', 'REFUND', 'payment', p_payment_id,
          format('Refund %s — %s', coalesce(v_payment.invoice_number, v_payment.payment_number), p_reason),
          -v_payment.amount, v_payment.method, auth.uid());

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (auth.uid(), 'REFUND_PAYMENT', 'payments', p_payment_id::text,
          jsonb_build_object('status', 'PAID'),
          jsonb_build_object('status', 'REFUNDED', 'reason', p_reason));
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_payment(p_payment_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_reorder_sections(p_page_key text, p_section_keys text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_restore_version(p_version_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_revoke_access(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_revoke_certificate(p_number text, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_affiliate_status(p_affiliate_id uuid, p_status text, p_notes text DEFAULT NULL::text, p_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_attendance(p_registration_id uuid, p_status text, p_method text DEFAULT 'MANUAL'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_default_certificate_template(p_template_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_user(p_user_id uuid, p_role text, p_status text, p_full_name text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.affiliate_stats(p_code text)
 RETURNS TABLE(referrals integer, paid_referrals integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*)::int,
         count(*) filter (where payment_status = 'PAID')::int
  from registrations
  where upper(affiliate_code) = upper(trim(p_code)) and status <> 'CANCELLED';
$function$;

CREATE OR REPLACE FUNCTION public.affiliates_assign_code()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
      exit when v_attempt > 50;
    end loop;
    new.code := v_candidate;
    if new.verified_at is null then
      new.verified_at := now();
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.generate_affiliate_code(p_full_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_payment_status(p_token uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_event_registered()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- ---- trigger ----

DROP TRIGGER IF EXISTS trg_affiliates_assign_code ON affiliates;
CREATE TRIGGER trg_affiliates_assign_code BEFORE INSERT OR UPDATE ON public.affiliates FOR EACH ROW EXECUTE FUNCTION affiliates_assign_code();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sync_event_registered ON registrations;
CREATE TRIGGER trg_sync_event_registered AFTER INSERT OR DELETE OR UPDATE ON public.registrations FOR EACH ROW EXECUTE FUNCTION sync_event_registered();

