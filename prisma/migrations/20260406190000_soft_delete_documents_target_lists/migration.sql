-- Add deletedAt/deletedBy to Documents
ALTER TABLE "Documents" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Documents" ADD COLUMN "deletedBy" UUID;
CREATE INDEX "Documents_deletedAt_idx" ON "Documents"("deletedAt");

-- Add deletedAt/deletedBy to crm_TargetLists
ALTER TABLE "crm_TargetLists" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "crm_TargetLists" ADD COLUMN "deletedBy" UUID;
CREATE INDEX "crm_TargetLists_deletedAt_idx" ON "crm_TargetLists"("deletedAt");

-- Backfill: Documents with status = 'DELETED'
UPDATE "Documents"
SET "deletedAt" = COALESCE("updatedAt", NOW())
WHERE "status" = 'DELETED'
  AND "deletedAt" IS NULL;

-- Backfill: TargetLists with status = false (soft-deleted)
UPDATE "crm_TargetLists"
SET "deletedAt" = COALESCE("updatedAt", NOW())
WHERE "status" = false
  AND "deletedAt" IS NULL;
