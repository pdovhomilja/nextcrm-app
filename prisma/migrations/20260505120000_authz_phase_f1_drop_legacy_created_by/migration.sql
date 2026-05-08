-- Phase F.1: consolidate dual created_by / createdBy on crm_Contacts and crm_Opportunities.
--
-- The Prisma relations crate_by_user (contacts) and created_by_user (opportunities)
-- previously joined on created_by; their FK target moves to createdBy in this same
-- deployment via the schema change. Relation names and labels are unchanged so
-- existing `include: { crate_by_user: ... }` and `include: { created_by_user: ... }`
-- callers continue to work without modification.

-- 1. crm_Contacts ---------------------------------------------------------

UPDATE "crm_Contacts"
   SET "createdBy" = "created_by"
 WHERE "createdBy" IS NULL AND "created_by" IS NOT NULL;

-- Defensive: scrub orphan FK references that the legacy ON DELETE SET NULL
-- did not catch. Some rows (notably those imported from MongoDB before the
-- FK existed) point at user ids that no longer exist in "Users". Without
-- this scrub the new FK ADD below fails with 23503.
UPDATE "crm_Contacts"
   SET "createdBy" = NULL
 WHERE "createdBy" IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM "Users" WHERE "id" = "crm_Contacts"."createdBy"
   );

ALTER TABLE "crm_Contacts" DROP CONSTRAINT IF EXISTS "crm_Contacts_created_by_fkey";

ALTER TABLE "crm_Contacts"
  ADD CONSTRAINT "crm_Contacts_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "Users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "crm_Contacts_created_by_idx";

ALTER TABLE "crm_Contacts" DROP COLUMN "created_by";

-- 2. crm_Opportunities ---------------------------------------------------

UPDATE "crm_Opportunities"
   SET "createdBy" = "created_by"
 WHERE "createdBy" IS NULL AND "created_by" IS NOT NULL;

-- Same defensive scrub as above for opportunities.
UPDATE "crm_Opportunities"
   SET "createdBy" = NULL
 WHERE "createdBy" IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM "Users" WHERE "id" = "crm_Opportunities"."createdBy"
   );

ALTER TABLE "crm_Opportunities" DROP CONSTRAINT IF EXISTS "crm_Opportunities_created_by_fkey";

ALTER TABLE "crm_Opportunities"
  ADD CONSTRAINT "crm_Opportunities_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "Users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "crm_Opportunities_created_by_idx";

ALTER TABLE "crm_Opportunities" DROP COLUMN "created_by";

-- crm_Opportunities did not previously have a createdBy index; add one so the
-- authz read-scope query (filter by createdBy) does not seq-scan.
CREATE INDEX IF NOT EXISTS "crm_Opportunities_createdBy_idx"
  ON "crm_Opportunities"("createdBy");
