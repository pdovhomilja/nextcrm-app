-- Add deletedAt/deletedBy to crm_Targets
ALTER TABLE "crm_Targets" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "crm_Targets" ADD COLUMN "deletedBy" UUID;
CREATE INDEX "crm_Targets_deletedAt_idx" ON "crm_Targets"("deletedAt");

-- Add deletedAt/deletedBy to crm_Activities
ALTER TABLE "crm_Activities" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "crm_Activities" ADD COLUMN "deletedBy" UUID;
CREATE INDEX "crm_Activities_deletedAt_idx" ON "crm_Activities"("deletedAt");

-- Add deletedAt/deletedBy to crm_campaign_templates
ALTER TABLE "crm_campaign_templates" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "crm_campaign_templates" ADD COLUMN "deletedBy" UUID;
CREATE INDEX "crm_campaign_templates_deletedAt_idx" ON "crm_campaign_templates"("deletedAt");

-- Add deletedAt/deletedBy to crm_campaigns
ALTER TABLE "crm_campaigns" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "crm_campaigns" ADD COLUMN "deletedBy" UUID;
CREATE INDEX "crm_campaigns_deletedAt_idx" ON "crm_campaigns"("deletedAt");

-- Add deletedAt/deletedBy to Boards
ALTER TABLE "Boards" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Boards" ADD COLUMN "deletedBy" UUID;
CREATE INDEX "Boards_deletedAt_idx" ON "Boards"("deletedAt");

-- Backfill: Accounts that were soft-deleted via status
UPDATE "crm_Accounts"
SET "deletedAt" = COALESCE("updatedAt", NOW()),
    "deletedBy" = "updatedBy"
WHERE "status" = 'DELETED'
  AND "deletedAt" IS NULL;

-- Backfill: Campaigns that were soft-deleted via status
UPDATE "crm_campaigns"
SET "deletedAt" = COALESCE("updatedAt", NOW()),
    "deletedBy" = "created_by"
WHERE "status" = 'deleted'
  AND "deletedAt" IS NULL;
