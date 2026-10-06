-- Kelas Bermain — admin / CMS schema
--
-- Run this once in the Supabase SQL Editor AFTER schema.sql. Safe to re-run.
--
-- Principle: the app never holds a service-role key. Admins are real Supabase
-- Auth users whose rights come from `admin_users` + RLS, so a stolen browser
-- token can only ever do what that person's role allows. The public site
-- keeps reading through SECURITY DEFINER functions, which is also how it
-- reads CMS content here — published columns only, never drafts.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- Admin accounts & roles
-- ------------------------------------------------------------------

create table if not exists admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'STAFF' check (role in ('SUPER_ADMIN', 'ADMIN', 'STAFF')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so the policies below can read admin_users without
-- recursing into its own RLS.
create or replace function admin_role()
returns text language sql stable security definer set search_path = public as $$
  select role from admin_users where user_id = auth.uid() and status = 'ACTIVE';
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_users where user_id = auth.uid() and status = 'ACTIVE'
  );
$$;

create or replace function is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_users
    where user_id = auth.uid() and status = 'ACTIVE' and role = 'SUPER_ADMIN'
  );
$$;

grant execute on function admin_role, is_admin, is_super_admin to authenticated;

-- ------------------------------------------------------------------
-- CMS content
-- ------------------------------------------------------------------

-- One row per editable section. `draft` is what admin is working on,
-- `published` is what the public site reads — so Preview and Publish are
-- just two columns, not two tables.
create table if not exists cms_sections (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  section_key text not null,
  draft jsonb not null default '{}'::jsonb,
  published jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  published_at timestamptz,
  unique (page_key, section_key)
);
create index if not exists cms_sections_page_idx on cms_sections (page_key);

create table if not exists navigation_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  href text not null,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  open_in_new_tab boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists navigation_items_order_idx on navigation_items (sort_order);
-- Keeps the seed below idempotent; one nav entry per destination.
create unique index if not exists navigation_items_href_key on navigation_items (href);

create table if not exists site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id),
  action text not null,
  entity text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_created_idx on activity_logs (created_at desc);

-- ------------------------------------------------------------------
-- RLS — admin tables
-- ------------------------------------------------------------------

alter table admin_users enable row level security;
alter table cms_sections enable row level security;
alter table navigation_items enable row level security;
alter table site_settings enable row level security;
alter table activity_logs enable row level security;

drop policy if exists admin_users_read on admin_users;
create policy admin_users_read on admin_users
  for select to authenticated using (is_admin());

drop policy if exists admin_users_write on admin_users;
create policy admin_users_write on admin_users
  for all to authenticated using (is_super_admin()) with check (is_super_admin());

drop policy if exists cms_sections_admin on cms_sections;
create policy cms_sections_admin on cms_sections
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists navigation_items_admin on navigation_items;
create policy navigation_items_admin on navigation_items
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists site_settings_admin on site_settings;
create policy site_settings_admin on site_settings
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists activity_logs_read on activity_logs;
create policy activity_logs_read on activity_logs
  for select to authenticated using (is_admin());

drop policy if exists activity_logs_insert on activity_logs;
create policy activity_logs_insert on activity_logs
  for insert to authenticated with check (is_admin());

-- ------------------------------------------------------------------
-- RLS — operational tables an admin needs to see
--
-- These tables were default-deny (RLS on, zero policies) so the public site
-- could only reach them through SECURITY DEFINER functions. That stays true
-- for anon; these policies only open them to signed-in admins.
-- ------------------------------------------------------------------

drop policy if exists customers_admin on customers;
create policy customers_admin on customers
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists children_admin on children;
create policy children_admin on children
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists registrations_admin on registrations;
create policy registrations_admin on registrations
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists payments_admin on payments;
create policy payments_admin on payments
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists attendance_admin on attendance_records;
create policy attendance_admin on attendance_records
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists certificates_admin on certificates;
create policy certificates_admin on certificates
  for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists affiliates_admin on affiliates;
create policy affiliates_admin on affiliates
  for all to authenticated using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------------
-- Public reads — published content only, never drafts
-- ------------------------------------------------------------------

create or replace function get_cms_sections(p_page_key text)
returns table (section_key text, content jsonb)
language sql security definer set search_path = public as $$
  select s.section_key, s.published
  from cms_sections s
  where s.page_key = p_page_key and s.published is not null;
$$;

create or replace function get_navigation()
returns table (label text, href text, open_in_new_tab boolean)
language sql security definer set search_path = public as $$
  select n.label, n.href, n.open_in_new_tab
  from navigation_items n
  where n.is_visible
  order by n.sort_order, n.label;
$$;

create or replace function get_site_setting(p_key text)
returns jsonb language sql security definer set search_path = public as $$
  select value from site_settings where key = p_key;
$$;

grant execute on function get_cms_sections, get_navigation, get_site_setting
  to anon, authenticated;

-- ------------------------------------------------------------------
-- Seed: the copy the site ships with today, so publishing from the admin
-- starts from exactly what's already live rather than a blank page.
-- ------------------------------------------------------------------

insert into cms_sections (page_key, section_key, draft, published, published_at)
values (
  'home', 'hero',
  jsonb_build_object(
    'eyebrow', 'Play • Learn • Grow',
    'title', 'Tempat anak belajar, bertumbuh, dan bermain bersama.',
    'highlight', 'bermain',
    'description', 'Aktivitas kreatif dan edukatif untuk anak usia 3–15 tahun di Jabodetabek. Satu hari penuh pengalaman baru — dari jadi pemadam cilik sampai membuat cokelat sendiri.',
    'primaryCtaLabel', 'Lihat Event',
    'primaryCtaHref', '/event',
    'secondaryCtaLabel', 'Daftar Kelas',
    'secondaryCtaHref', '/event',
    'statValue', 'Jabodetabek',
    'statLabel', 'Area kegiatan'
  ),
  jsonb_build_object(
    'eyebrow', 'Play • Learn • Grow',
    'title', 'Tempat anak belajar, bertumbuh, dan bermain bersama.',
    'highlight', 'bermain',
    'description', 'Aktivitas kreatif dan edukatif untuk anak usia 3–15 tahun di Jabodetabek. Satu hari penuh pengalaman baru — dari jadi pemadam cilik sampai membuat cokelat sendiri.',
    'primaryCtaLabel', 'Lihat Event',
    'primaryCtaHref', '/event',
    'secondaryCtaLabel', 'Daftar Kelas',
    'secondaryCtaHref', '/event',
    'statValue', 'Jabodetabek',
    'statLabel', 'Area kegiatan'
  ),
  now()
)
on conflict (page_key, section_key) do nothing;

insert into cms_sections (page_key, section_key, draft, published, published_at)
values (
  'home', 'events_teaser',
  jsonb_build_object(
    'eyebrow', 'Jadwal kegiatan',
    'title', 'Kelas yang bisa diikuti si kecil',
    'description', 'Pilih yang paling sesuai usia dan minat anak. Detail agenda, biaya, dan fasilitas ada di setiap halaman kelas.'
  ),
  jsonb_build_object(
    'eyebrow', 'Jadwal kegiatan',
    'title', 'Kelas yang bisa diikuti si kecil',
    'description', 'Pilih yang paling sesuai usia dan minat anak. Detail agenda, biaya, dan fasilitas ada di setiap halaman kelas.'
  ),
  now()
)
on conflict (page_key, section_key) do nothing;

insert into navigation_items (label, href, sort_order)
values
  ('Home', '/', 1),
  ('Event', '/event', 2),
  ('Update', '/update', 3),
  ('Berita', '/kegiatan', 4),
  ('Galeri', '/galeri', 5)
on conflict (href) do nothing;
