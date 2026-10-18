-- CEK UKURAN DATABASE
-- Query ini HANYA MEMBACA.
--
-- Batas free tier Supabase 500 MB, dan 40–60 MB sudah terpakai bawaan
-- Postgres sendiri. Angka di bawah menjawab seberapa mendesak pindahnya.

select
  pg_size_pretty(pg_database_size(current_database())) as total_database,
  (select pg_size_pretty(sum(pg_total_relation_size(c.oid)))
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r')     as tabel_aplikasi,
  (select count(*) from information_schema.tables
    where table_schema = 'public')                      as jumlah_tabel;
