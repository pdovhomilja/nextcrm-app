-- Migration: Add deletedAt / deletedBy soft-delete columns to CRM entity tables
-- Safe to re-run (IF NOT EXISTS / IF NOT EXISTS guards via DO blocks)
-- Backfills existing rows with NULL (no data loss).

ALTER TABLE "crm_Accounts"      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "crm_Accounts"      ADD COLUMN IF NOT EXISTS "deletedBy" UUID;

ALTER TABLE "crm_Leads"         ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "crm_Leads"         ADD COLUMN IF NOT EXISTS "deletedBy" UUID;

ALTER TABLE "crm_Opportunities" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "crm_Opportunities" ADD COLUMN IF NOT EXISTS "deletedBy" UUID;

ALTER TABLE "crm_Contacts"      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "crm_Contacts"      ADD COLUMN IF NOT EXISTS "deletedBy" UUID;

ALTER TABLE "crm_Contracts"     ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "crm_Contracts"     ADD COLUMN IF NOT EXISTS "deletedBy" UUID;

-- Indexes for efficient soft-delete filtering
CREATE INDEX IF NOT EXISTS "crm_Accounts_deletedAt_idx"      ON "crm_Accounts"("deletedAt");
CREATE INDEX IF NOT EXISTS "crm_Leads_deletedAt_idx"         ON "crm_Leads"("deletedAt");
CREATE INDEX IF NOT EXISTS "crm_Opportunities_deletedAt_idx" ON "crm_Opportunities"("deletedAt");
CREATE INDEX IF NOT EXISTS "crm_Contacts_deletedAt_idx"      ON "crm_Contacts"("deletedAt");
CREATE INDEX IF NOT EXISTS "crm_Contracts_deletedAt_idx"     ON "crm_Contracts"("deletedAt");
