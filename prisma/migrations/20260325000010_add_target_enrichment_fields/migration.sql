-- AddColumn: new enrichment fields on crm_Targets (safe, additive, idempotent)
ALTER TABLE "crm_Targets"
  ADD COLUMN IF NOT EXISTS "personal_email"       TEXT,
  ADD COLUMN IF NOT EXISTS "company_email"        TEXT,
  ADD COLUMN IF NOT EXISTS "company_phone"        TEXT,
  ADD COLUMN IF NOT EXISTS "city"                 TEXT,
  ADD COLUMN IF NOT EXISTS "country"              TEXT,
  ADD COLUMN IF NOT EXISTS "industry"             TEXT,
  ADD COLUMN IF NOT EXISTS "employees"            TEXT,
  ADD COLUMN IF NOT EXISTS "description"          TEXT,
  ADD COLUMN IF NOT EXISTS "converted_at"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "converted_account_id" UUID,
  ADD COLUMN IF NOT EXISTS "converted_contact_id" UUID;

CREATE INDEX IF NOT EXISTS "crm_Targets_converted_account_id_idx" ON "crm_Targets"("converted_account_id");
CREATE INDEX IF NOT EXISTS "crm_Targets_converted_contact_id_idx" ON "crm_Targets"("converted_contact_id");
