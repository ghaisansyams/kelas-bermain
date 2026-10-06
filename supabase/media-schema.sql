-- Kelas Bermain — media library + hero slides CMS
--
-- Run once in the Supabase SQL Editor AFTER admin-schema.sql. Safe to re-run.
-- Images live in Supabase Storage (bucket `website`, public read); the table
-- below only stores metadata and the public URL — never base64.

create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null unique,
  public_url text not null,
  alt_text text not null default '',
  mime_type text not null default '',
  file_size bigint not null default 0,
  folder text not null default 'general',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);
create index if not exists media_folder_idx on media (folder);
create index if not exists media_created_idx on media (created_at desc);

alter table media enable row level security;

drop policy if exists media_admin on media;
create policy media_admin on media
  for all to authenticated using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------------
-- Storage bucket
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('website', 'website', true)
on conflict (id) do nothing;

-- Anyone may read (the site serves these images); only signed-in admins write.
drop policy if exists website_public_read on storage.objects;
create policy website_public_read on storage.objects
  for select using (bucket_id = 'website');

drop policy if exists website_admin_insert on storage.objects;
create policy website_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'website' and public.is_admin());

drop policy if exists website_admin_update on storage.objects;
create policy website_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'website' and public.is_admin())
  with check (bucket_id = 'website' and public.is_admin());

drop policy if exists website_admin_delete on storage.objects;
create policy website_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'website' and public.is_admin());

-- ------------------------------------------------------------------
-- Hero slides as CMS content (seeded from what the site ships with)
-- ------------------------------------------------------------------

insert into cms_sections (page_key, section_key, draft, published, published_at)
values (
  'home', 'hero_slides',
  jsonb_build_object('slides', jsonb_build_array(
    jsonb_build_object('id','pemadam-cilik','image','/images/event-pemadam-cilik.jpg','alt','Anak-anak mengenal profesi pemadam kebakaran dan berkeliling naik mobil damkar','title','Pemadam Cilik','date','4 Oktober 2026','location','Depok','eventSlug','pemadam-cilik-oktober-2026'),
    jsonb_build_object('id','decorate-mini-cake','image','/images/event-decorate-mini-cake.jpg','alt','Anak-anak menghias mini cake sendiri di meja kerja mereka','title','Decorate Mini Cake','date','11 Oktober 2026','location','Depok','eventSlug','decorate-mini-cake-oktober-2026'),
    jsonb_build_object('id','cocoa-maker','image','/images/event-cocoa-maker.jpg','alt','Anak-anak membuat cokelat dari biji kakao bersama fasilitator','title','Cocoa Maker','date','8 November 2026','location','Depok','eventSlug','cocoa-maker-november-2026'),
    jsonb_build_object('id','little-farmer','image','/images/event-little-farmer.jpg','alt','Anak-anak menanam dan memanen sayuran di kebun konservasi','title','Little Farmer','date','22 November 2026','location','Tangerang Selatan','eventSlug','little-farmer-november-2026')
  )),
  jsonb_build_object('slides', jsonb_build_array(
    jsonb_build_object('id','pemadam-cilik','image','/images/event-pemadam-cilik.jpg','alt','Anak-anak mengenal profesi pemadam kebakaran dan berkeliling naik mobil damkar','title','Pemadam Cilik','date','4 Oktober 2026','location','Depok','eventSlug','pemadam-cilik-oktober-2026'),
    jsonb_build_object('id','decorate-mini-cake','image','/images/event-decorate-mini-cake.jpg','alt','Anak-anak menghias mini cake sendiri di meja kerja mereka','title','Decorate Mini Cake','date','11 Oktober 2026','location','Depok','eventSlug','decorate-mini-cake-oktober-2026'),
    jsonb_build_object('id','cocoa-maker','image','/images/event-cocoa-maker.jpg','alt','Anak-anak membuat cokelat dari biji kakao bersama fasilitator','title','Cocoa Maker','date','8 November 2026','location','Depok','eventSlug','cocoa-maker-november-2026'),
    jsonb_build_object('id','little-farmer','image','/images/event-little-farmer.jpg','alt','Anak-anak menanam dan memanen sayuran di kebun konservasi','title','Little Farmer','date','22 November 2026','location','Tangerang Selatan','eventSlug','little-farmer-november-2026')
  )),
  now()
)
on conflict (page_key, section_key) do nothing;
