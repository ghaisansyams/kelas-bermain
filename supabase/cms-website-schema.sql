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
