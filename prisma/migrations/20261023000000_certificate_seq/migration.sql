-- admin_issue_certificate memanggil nextval('certificate_seq'), tetapi urutan ini
-- tidak ikut terbawa dari Supabase. Dimulai setelah nomor terbesar yang sudah ada.
DO $$
DECLARE
  v_start bigint;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(number, '^.*-', ''), '')::bigint), 0) + 1
    INTO v_start
  FROM certificates;
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS certificate_seq START WITH %s', v_start);
END $$;
