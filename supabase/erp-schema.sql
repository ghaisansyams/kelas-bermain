-- Kelas Bermain — ERP operasional (payments, finance, audit)
--
-- Run once in the Supabase SQL Editor AFTER admin-schema.sql. Safe to re-run.
--
-- The money-touching steps are SQL functions, not app code: confirming a
-- payment has to update the payment, its registration, the invoice number
-- and the finance ledger together or not at all. Doing that in one
-- SECURITY DEFINER function keeps those four facts from ever disagreeing,
-- and makes a double-click harmless.

-- ------------------------------------------------------------------
-- Payment columns the admin flow needs
-- ------------------------------------------------------------------

alter table payments add column if not exists invoice_number text;
alter table payments add column if not exists verified_at timestamptz;
alter table payments add column if not exists verified_by uuid references auth.users (id);
alter table payments add column if not exists notes text;
alter table payments add column if not exists refund_reason text;

create unique index if not exists payments_invoice_number_key
  on payments (invoice_number) where invoice_number is not null;
create index if not exists payments_status_idx on payments (status);
create index if not exists payments_created_idx on payments (created_at desc);
create index if not exists payments_event_idx on payments (event_id);

create index if not exists registrations_payment_status_idx on registrations (payment_status);
create index if not exists registrations_date_idx on registrations (registration_date desc);

-- ------------------------------------------------------------------
-- Finance ledger
-- ------------------------------------------------------------------

create table if not exists financial_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_number text unique not null default
    next_yearly_number('finance', 'FT', extract(year from now())::int),
  type text not null check (type in ('INCOME', 'REFUND', 'ADJUSTMENT')),
  category text not null default 'EVENT_REGISTRATION',
  reference_type text,
  reference_id uuid,
  description text not null default '',
  amount numeric not null default 0,
  transaction_date timestamptz not null default now(),
  payment_method text,
  status text not null default 'CONFIRMED',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index if not exists financial_transactions_date_idx
  on financial_transactions (transaction_date desc);
create index if not exists financial_transactions_type_idx on financial_transactions (type);
create index if not exists financial_transactions_ref_idx
  on financial_transactions (reference_type, reference_id);

alter table financial_transactions enable row level security;
drop policy if exists financial_transactions_admin on financial_transactions;
create policy financial_transactions_admin on financial_transactions
  for all to authenticated using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------------
-- Confirm a payment: payment + registration + invoice + ledger + audit
-- ------------------------------------------------------------------

create or replace function admin_confirm_payment(
  p_payment_id uuid,
  p_method text default null,
  p_notes text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_payment payments;
  v_invoice text;
  v_method text;
begin
  if not is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;

  select * into v_payment from payments where id = p_payment_id;
  if v_payment.id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Already settled: return as-is so a double click never writes a second
  -- ledger entry or burns another invoice number.
  if v_payment.status = 'PAID' then
    return jsonb_build_object('alreadyPaid', true, 'invoiceNumber', v_payment.invoice_number);
  end if;

  v_method := coalesce(nullif(p_method, ''), v_payment.method, 'TRANSFER_BANK');
  v_invoice := coalesce(
    v_payment.invoice_number,
    next_yearly_number('invoice', 'INV', extract(year from now())::int)
  );

  update payments set
    status = 'PAID',
    paid_at = now(),
    verified_at = now(),
    verified_by = auth.uid(),
    method = v_method,
    invoice_number = v_invoice,
    notes = coalesce(nullif(p_notes, ''), notes)
  where id = p_payment_id;

  update registrations set
    payment_status = 'PAID',
    status = case when status = 'CANCELLED' then status else 'CONFIRMED' end
  where id = v_payment.registration_id;

  insert into financial_transactions (
    type, category, reference_type, reference_id, description, amount,
    payment_method, created_by
  ) values (
    'INCOME', 'EVENT_REGISTRATION', 'payment', p_payment_id,
    format('Pembayaran %s', v_invoice), v_payment.amount, v_method, auth.uid()
  );

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (
    auth.uid(), 'CONFIRM_PAYMENT', 'payments', p_payment_id::text,
    jsonb_build_object('status', v_payment.status),
    jsonb_build_object('status', 'PAID', 'invoiceNumber', v_invoice, 'method', v_method)
  );

  return jsonb_build_object('alreadyPaid', false, 'invoiceNumber', v_invoice);
end;
$$;

-- ------------------------------------------------------------------
-- Refund: never deletes the original income, books a negative entry
-- ------------------------------------------------------------------

create or replace function admin_refund_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_payment payments;
begin
  if not is_admin() then
    raise exception 'FORBIDDEN' using errcode = 'P0005';
  end if;

  select * into v_payment from payments where id = p_payment_id;
  if v_payment.id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_payment.status <> 'PAID' then
    raise exception 'NOT_PAID' using errcode = 'P0006';
  end if;

  update payments set
    status = 'REFUNDED',
    refund_reason = p_reason
  where id = p_payment_id;

  update registrations set payment_status = 'REFUNDED' where id = v_payment.registration_id;

  insert into financial_transactions (
    type, category, reference_type, reference_id, description, amount,
    payment_method, created_by
  ) values (
    'REFUND', 'REFUND', 'payment', p_payment_id,
    format('Refund %s — %s', coalesce(v_payment.invoice_number, v_payment.payment_number), p_reason),
    -v_payment.amount, v_payment.method, auth.uid()
  );

  insert into activity_logs (user_id, action, entity, entity_id, old_value, new_value)
  values (
    auth.uid(), 'REFUND_PAYMENT', 'payments', p_payment_id::text,
    jsonb_build_object('status', 'PAID'),
    jsonb_build_object('status', 'REFUNDED', 'reason', p_reason)
  );
end;
$$;

grant execute on function admin_confirm_payment, admin_refund_payment to authenticated;
