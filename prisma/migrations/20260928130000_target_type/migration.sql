-- Target type: Individual vs Company discriminator on crm_Targets (additive, idempotent).
-- The ADD COLUMN ... DEFAULT 'COMPANY' backfills every existing row, so no separate
-- type backfill is needed.

DO $$ BEGIN
  CREATE TYPE "crm_Target_Type" AS ENUM ('INDIVIDUAL', 'COMPANY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "crm_Targets"
  ADD COLUMN IF NOT EXISTS "type" "crm_Target_Type" NOT NULL DEFAULT 'COMPANY';

CREATE INDEX IF NOT EXISTS "crm_Targets_type_idx" ON "crm_Targets"("type");

-- Retire the last_name = company duplication from the initial MCP load of the
-- 28 company prospects. Idempotent: only rows where the two still match.
UPDATE "crm_Targets" SET "last_name" = '' WHERE "last_name" = "company";
