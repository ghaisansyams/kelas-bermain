-- Formulir pendaftaran tidak lagi menanyakan email pendamping.
ALTER TABLE "customers" DROP COLUMN IF EXISTS "email";

-- Jumlah pendamping tambahan yang dibawa satu kelompok. Dicatat pada
-- pendaftaran anak pertama kelompok itu; anak lain di kelompok yang sama
-- bernilai 0 supaya totalnya tidak terhitung dua kali.
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "extra_companions" INTEGER NOT NULL DEFAULT 0;
