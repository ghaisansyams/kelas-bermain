-- Tempat sampah admin: event, pendamping, dan anak yang dihapus disimpan
-- sebagai salinan di sini selama 30 hari, sehingga bisa dipulihkan utuh.
-- Setelah expires_at lewat, barisnya (dan berkas bukti transfernya) dibuang.
CREATE TABLE IF NOT EXISTS "recycle_bin" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "kind"            TEXT        NOT NULL,
  "label"           TEXT        NOT NULL,
  "code"            TEXT        NOT NULL DEFAULT '',
  "details"         JSONB       NOT NULL DEFAULT '{}',
  "snapshot"        JSONB       NOT NULL,
  "proof_files"     TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  "deleted_by_name" TEXT        NOT NULL DEFAULT '',
  "deleted_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expires_at"      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  CONSTRAINT "recycle_bin_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "recycle_bin_expires_idx" ON "recycle_bin" ("expires_at");
CREATE INDEX IF NOT EXISTS "recycle_bin_deleted_idx" ON "recycle_bin" ("deleted_at" DESC);
