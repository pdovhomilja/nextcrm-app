-- Target triage: pre-conversion review gate on crm_Targets (additive, idempotent).
-- Enums guarded so re-runs are safe; columns/indexes use IF NOT EXISTS to match
-- this repo's additive migration convention.

DO $$ BEGIN
  CREATE TYPE "crm_Triage_Status" AS ENUM ('NEW', 'APPROVED', 'PASSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "crm_Pass_Reason" AS ENUM ('SCOPE_TOO_LARGE', 'NOT_A_FIT', 'BAD_TIMING', 'ALREADY_MODERN', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "crm_Targets"
  ADD COLUMN IF NOT EXISTS "triage_status" "crm_Triage_Status" NOT NULL DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS "pass_reason"   "crm_Pass_Reason",
  ADD COLUMN IF NOT EXISTS "pass_note"     TEXT,
  ADD COLUMN IF NOT EXISTS "revisit_at"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "triaged_at"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "triaged_by"    UUID;

CREATE INDEX IF NOT EXISTS "crm_Targets_triage_status_idx" ON "crm_Targets"("triage_status");
CREATE INDEX IF NOT EXISTS "crm_Targets_revisit_at_idx" ON "crm_Targets"("revisit_at");
