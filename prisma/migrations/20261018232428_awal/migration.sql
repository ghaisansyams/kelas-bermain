-- Sequence penomoran. Introspeksi Prisma menangkap pemakaiannya di default
-- kolom tapi tidak objek sequence-nya sendiri, jadi dibuat eksplisit di sini
-- sebelum tabel mana pun berdiri.
CREATE SEQUENCE IF NOT EXISTS "affiliate_number_seq";
CREATE SEQUENCE IF NOT EXISTS "child_number_seq";
CREATE SEQUENCE IF NOT EXISTS "customer_number_seq";

-- Penomoran tahunan (KB-REG-2026-00001 dan kerabatnya). Dipakai sebagai
-- default kolom, jadi harus ada sebelum tabelnya berdiri. Badan plpgsql
-- tidak divalidasi saat dibuat, jadi boleh menyebut number_counters yang
-- baru lahir beberapa baris di bawah.
CREATE OR REPLACE FUNCTION next_yearly_number(p_scope text, p_prefix text, p_year int)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_value int;
BEGIN
  INSERT INTO number_counters (scope, year, value)
  VALUES (p_scope, p_year, 1)
  ON CONFLICT (scope, year) DO UPDATE SET value = number_counters.value + 1
  RETURNING value INTO v_value;
  RETURN format('%s-%s-%s', p_prefix, p_year, lpad(v_value::text, 5, '0'));
END;
$$;

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255),
    "encrypted_password" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "user_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "affiliates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "affiliate_number" TEXT NOT NULL DEFAULT ('KB-AFF-'::text || lpad((nextval('affiliate_number_seq'::regclass))::text, 5, '0'::text)),
    "code" TEXT,
    "full_name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "domicile" TEXT NOT NULL DEFAULT '',
    "bank_name" TEXT NOT NULL,
    "bank_account_number" TEXT NOT NULL,
    "bank_account_name" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMPTZ(6),
    "verified_by" TEXT,
    "notes" TEXT,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "registration_id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "child_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_ATTENDED',
    "checked_in_at" TIMESTAMPTZ(6),
    "method" TEXT NOT NULL DEFAULT 'form',
    "recorded_by" TEXT,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "background_url" TEXT NOT NULL DEFAULT '',
    "logo_url" TEXT NOT NULL DEFAULT '',
    "orientation" TEXT NOT NULL DEFAULT 'LANDSCAPE',
    "config" JSONB NOT NULL DEFAULT '{"elements": []}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "number" TEXT NOT NULL,
    "registration_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "participant_name" TEXT NOT NULL,
    "event_title" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "organizer" TEXT NOT NULL DEFAULT 'Kelas Bermain',
    "template" TEXT NOT NULL DEFAULT 'classic',
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "signatory_name" TEXT NOT NULL DEFAULT '',
    "signatory_role" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("number")
);

-- CreateTable
CREATE TABLE "children" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "child_number" TEXT NOT NULL DEFAULT ('KB-CHD-'::text || lpad((nextval('child_number_seq'::regclass))::text, 5, '0'::text)),
    "customer_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "gender" TEXT NOT NULL DEFAULT '',
    "date_of_birth" DATE,
    "age_years" INTEGER,
    "age_months" INTEGER,
    "age_recorded_at" TIMESTAMPTZ(6),
    "school" TEXT NOT NULL DEFAULT '',
    "grade" TEXT NOT NULL DEFAULT '—',
    "special_notes" TEXT,
    "emergency_contact" TEXT NOT NULL DEFAULT '—',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_collections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collection_key" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "draft" JSONB NOT NULL DEFAULT '{}',
    "published" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "published_at" TIMESTAMPTZ(6),
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cms_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "page_key" TEXT NOT NULL,
    "section_key" TEXT NOT NULL,
    "draft" JSONB NOT NULL DEFAULT '{}',
    "published" JSONB,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "published_at" TIMESTAMPTZ(6),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT NOT NULL DEFAULT '',
    "section_type" TEXT NOT NULL DEFAULT '',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "presentation" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "cms_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope" TEXT NOT NULL,
    "scope_key" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "cms_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_number" TEXT NOT NULL DEFAULT ('KB-CUS-'::text || lpad((nextval('customer_number_seq'::regclass))::text, 5, '0'::text)),
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL,
    "domicile" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "occupation" TEXT NOT NULL DEFAULT '—',
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "description" JSONB NOT NULL DEFAULT '[]',
    "about_event" JSONB,
    "category" TEXT NOT NULL,
    "cover" JSONB NOT NULL,
    "poster" JSONB,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "time_start" TEXT NOT NULL DEFAULT '09:00',
    "time_end" TEXT NOT NULL DEFAULT '12:00',
    "timezone" TEXT NOT NULL DEFAULT 'WIB',
    "location" JSONB NOT NULL DEFAULT '{}',
    "organizer" TEXT NOT NULL DEFAULT 'Kelas Bermain',
    "age_min" INTEGER NOT NULL DEFAULT 3,
    "age_max" INTEGER NOT NULL DEFAULT 15,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "registered" INTEGER NOT NULL DEFAULT 0,
    "registration" JSONB NOT NULL DEFAULT '{}',
    "agenda" JSONB NOT NULL DEFAULT '[]',
    "speaker_ids" JSONB NOT NULL DEFAULT '[]',
    "facilities" JSONB NOT NULL DEFAULT '[]',
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "certificate" JSONB NOT NULL DEFAULT '{}',
    "video" JSONB,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "show_on_event_page" BOOLEAN NOT NULL DEFAULT true,
    "show_in_history" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_number" TEXT NOT NULL DEFAULT next_yearly_number('finance'::text, 'FT'::text, (EXTRACT(year FROM now()))::integer),
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'EVENT_REGISTRATION',
    "reference_type" TEXT,
    "reference_id" UUID,
    "description" TEXT NOT NULL DEFAULT '',
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "transaction_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "file_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "alt_text" TEXT NOT NULL DEFAULT '',
    "mime_type" TEXT NOT NULL DEFAULT '',
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "folder" TEXT NOT NULL DEFAULT 'general',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "open_in_new_tab" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "navigation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "number_counters" (
    "scope" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "number_counters_pkey" PRIMARY KEY ("scope","year")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_number" TEXT NOT NULL DEFAULT next_yearly_number('payment'::text, 'KB-PAY'::text, (EXTRACT(year FROM now()))::integer),
    "registration_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'Manual Transfer',
    "reference" TEXT,
    "proof_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "invoice_number" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "verified_by" UUID,
    "notes" TEXT,
    "refund_reason" TEXT,
    "proof_submitted_at" TIMESTAMPTZ(6),
    "rejected_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "registration_number" TEXT NOT NULL DEFAULT next_yearly_number('registration'::text, 'KB-REG'::text, (EXTRACT(year FROM now()))::integer),
    "access_token" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "registration_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "attendance_status" TEXT NOT NULL DEFAULT 'NOT_ATTENDED',
    "certificate_status" TEXT NOT NULL DEFAULT 'NOT_ELIGIBLE',
    "payment_method" TEXT NOT NULL DEFAULT 'NONE',
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "qr_source" TEXT,
    "affiliate_code" TEXT,
    "age_override" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "voucher_redemptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "voucher_code" TEXT NOT NULL,
    "registration_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "redeemed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "max_discount" DECIMAL(12,2),
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "min_children" INTEGER NOT NULL DEFAULT 1,
    "event_id" TEXT,
    "valid_from" DATE,
    "valid_until" DATE,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "activity_logs_created_idx" ON "activity_logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_affiliate_number_key" ON "affiliates"("affiliate_number");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_code_key" ON "affiliates"("code");

-- CreateIndex
CREATE INDEX "affiliates_whatsapp_idx" ON "affiliates"("whatsapp");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_registration_idx" ON "attendance_records"("registration_id");

-- CreateIndex
CREATE INDEX "attendance_event_idx" ON "attendance_records"("event_id");

-- CreateIndex
CREATE INDEX "attendance_status_idx" ON "attendance_records"("status");

-- CreateIndex
CREATE INDEX "certificate_templates_status_idx" ON "certificate_templates"("status");

-- CreateIndex
CREATE INDEX "certificates_event_idx" ON "certificates"("event_id");

-- CreateIndex
CREATE INDEX "certificates_registration_idx" ON "certificates"("registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "children_child_number_key" ON "children"("child_number");

-- CreateIndex
CREATE INDEX "children_customer_idx" ON "children"("customer_id");

-- CreateIndex
CREATE INDEX "cms_collections_key_idx" ON "cms_collections"("collection_key", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "cms_collections_collection_key_item_key_key" ON "cms_collections"("collection_key", "item_key");

-- CreateIndex
CREATE INDEX "cms_sections_order_idx" ON "cms_sections"("page_key", "sort_order");

-- CreateIndex
CREATE INDEX "cms_sections_page_idx" ON "cms_sections"("page_key");

-- CreateIndex
CREATE UNIQUE INDEX "cms_sections_page_key_section_key_key" ON "cms_sections"("page_key", "section_key");

-- CreateIndex
CREATE INDEX "cms_versions_scope_idx" ON "cms_versions"("scope", "scope_key", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_number_key" ON "customers"("customer_number");

-- CreateIndex
CREATE INDEX "customers_whatsapp_idx" ON "customers"("whatsapp");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_category_idx" ON "events"("category");

-- CreateIndex
CREATE INDEX "events_start_date_idx" ON "events"("start_date");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_transaction_number_key" ON "financial_transactions"("transaction_number");

-- CreateIndex
CREATE INDEX "financial_transactions_date_idx" ON "financial_transactions"("transaction_date" DESC);

-- CreateIndex
CREATE INDEX "financial_transactions_ref_idx" ON "financial_transactions"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "financial_transactions_type_idx" ON "financial_transactions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "media_storage_path_key" ON "media"("storage_path");

-- CreateIndex
CREATE INDEX "media_created_idx" ON "media"("created_at" DESC);

-- CreateIndex
CREATE INDEX "media_folder_idx" ON "media"("folder");

-- CreateIndex
CREATE UNIQUE INDEX "navigation_items_href_key" ON "navigation_items"("href");

-- CreateIndex
CREATE INDEX "navigation_items_order_idx" ON "navigation_items"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_number_key" ON "payments"("payment_number");

-- CreateIndex
CREATE INDEX "payments_created_idx" ON "payments"("created_at" DESC);

-- CreateIndex
CREATE INDEX "payments_event_idx" ON "payments"("event_id");

-- CreateIndex
CREATE INDEX "payments_registration_idx" ON "payments"("registration_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_registration_number_key" ON "registrations"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_access_token_idx" ON "registrations"("access_token");

-- CreateIndex
CREATE INDEX "registrations_child_idx" ON "registrations"("child_id");

-- CreateIndex
CREATE INDEX "registrations_customer_idx" ON "registrations"("customer_id");

-- CreateIndex
CREATE INDEX "registrations_date_idx" ON "registrations"("registration_date" DESC);

-- CreateIndex
CREATE INDEX "registrations_event_idx" ON "registrations"("event_id");

-- CreateIndex
CREATE INDEX "registrations_payment_status_idx" ON "registrations"("payment_status");

-- CreateIndex
CREATE INDEX "voucher_redemptions_code_idx" ON "voucher_redemptions"("voucher_code");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_redemptions_voucher_code_registration_id_key" ON "voucher_redemptions"("voucher_code", "registration_id");

-- CreateIndex
CREATE INDEX "vouchers_status_idx" ON "vouchers"("status");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cms_collections" ADD CONSTRAINT "cms_collections_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cms_sections" ADD CONSTRAINT "cms_sections_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cms_versions" ADD CONSTRAINT "cms_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "voucher_redemptions" ADD CONSTRAINT "voucher_redemptions_voucher_code_fkey" FOREIGN KEY ("voucher_code") REFERENCES "vouchers"("code") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
