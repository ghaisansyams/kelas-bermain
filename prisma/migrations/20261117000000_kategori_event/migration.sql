-- Kategori event yang bisa diatur dari admin (sebelumnya daftar tetap di kode).
-- Setiap kategori punya warna lencana dan foto cadangan untuk event yang
-- belum punya foto "Tentang Event".
CREATE TABLE IF NOT EXISTS "event_categories" (
  "name"       TEXT        NOT NULL,
  "tone"       TEXT        NOT NULL DEFAULT 'neutral',
  "image_url"  TEXT        NOT NULL DEFAULT '',
  "image_alt"  TEXT        NOT NULL DEFAULT '',
  "sort_order" INTEGER     NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "event_categories_pkey" PRIMARY KEY ("name")
);

-- Enam kategori bawaan, persis seperti yang selama ini tampil.
INSERT INTO "event_categories" ("name", "tone", "image_url", "image_alt", "sort_order") VALUES
  ('Profesi',    'brand', '/images/galeri-08.jpg', 'Anak kecil berjaket kuning berjalan membawa ransel', 1),
  ('Kuliner',    'sun',   '/images/galeri-14.jpg', 'Kue bundar yang sudah dihias dengan krim dan hiasan', 2),
  ('Alam',       'leaf',  '/images/galeri-13.jpg', 'Aneka sayuran segar hasil panen ditata dalam wadah', 3),
  ('Kreatif',    'grape', '/images/galeri-03.jpg', 'Tangan anak melukis di atas kertas dengan cat warna-warni', 4),
  ('Eksplorasi', 'sky',   '/images/galeri-01.jpg', 'Tiga anak kecil berpelukan sambil tertawa', 5),
  ('Outdoor',    'pine',  '/images/galeri-06.jpg', 'Anak laki-laki tertawa sambil memegang buku di bangku taman', 6)
ON CONFLICT ("name") DO NOTHING;

-- Kategori yang sudah dipakai event tetapi tidak ada di daftar bawaan tidak boleh
-- hilang dari pilihan; dimasukkan dengan warna abu-abu.
INSERT INTO "event_categories" ("name", "sort_order")
SELECT DISTINCT e."category", 100 FROM "events" e
WHERE e."category" <> '' AND e."category" NOT IN (SELECT "name" FROM "event_categories")
ON CONFLICT ("name") DO NOTHING;
