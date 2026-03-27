BEGIN;

-- Step 1: Create new config tables
CREATE TABLE IF NOT EXISTS "crm_Contact_Types" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "__v" INTEGER NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  CONSTRAINT "crm_Contact_Types_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_Contact_Types_name_key" UNIQUE ("name")
);
CREATE INDEX IF NOT EXISTS "crm_Contact_Types_name_idx" ON "crm_Contact_Types"("name");

CREATE TABLE IF NOT EXISTS "crm_Lead_Sources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "__v" INTEGER NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  CONSTRAINT "crm_Lead_Sources_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_Lead_Sources_name_key" UNIQUE ("name")
);
CREATE INDEX IF NOT EXISTS "crm_Lead_Sources_name_idx" ON "crm_Lead_Sources"("name");

CREATE TABLE IF NOT EXISTS "crm_Lead_Statuses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "__v" INTEGER NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  CONSTRAINT "crm_Lead_Statuses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_Lead_Statuses_name_key" UNIQUE ("name")
);
CREATE INDEX IF NOT EXISTS "crm_Lead_Statuses_name_idx" ON "crm_Lead_Statuses"("name");

CREATE TABLE IF NOT EXISTS "crm_Lead_Types" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "__v" INTEGER NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  CONSTRAINT "crm_Lead_Types_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "crm_Lead_Types_name_key" UNIQUE ("name")
);
CREATE INDEX IF NOT EXISTS "crm_Lead_Types_name_idx" ON "crm_Lead_Types"("name");

-- Step 2: Populate new tables from known current string values
INSERT INTO "crm_Contact_Types" ("name") VALUES
  ('Customer'), ('Partner'), ('Vendor'), ('Prospect')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "crm_Lead_Statuses" ("name") VALUES
  ('New'), ('Contacted'), ('Qualified'), ('Lost')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "crm_Lead_Types" ("name") VALUES
  ('Demo')
ON CONFLICT ("name") DO NOTHING;

-- crm_Lead_Sources: lead_source was free-text, no backfill needed
-- Seed rows will be added by seed.ts after migration

-- Step 3: Add new nullable FK columns alongside old columns
ALTER TABLE "crm_Contacts" ADD COLUMN IF NOT EXISTS "contact_type_id" UUID;
ALTER TABLE "crm_Leads"    ADD COLUMN IF NOT EXISTS "lead_source_id"  UUID;
ALTER TABLE "crm_Leads"    ADD COLUMN IF NOT EXISTS "lead_status_id"  UUID;
ALTER TABLE "crm_Leads"    ADD COLUMN IF NOT EXISTS "lead_type_id"    UUID;

-- Step 4: Backfill FK columns from old string values
UPDATE "crm_Contacts" c
SET "contact_type_id" = ct.id
FROM "crm_Contact_Types" ct
WHERE LOWER(c.type) = LOWER(ct.name) AND c.type IS NOT NULL;

-- Case-insensitive match: old values were uppercase ("NEW"), new rows are title-case ("New")
UPDATE "crm_Leads" l
SET "lead_status_id" = ls.id
FROM "crm_Lead_Statuses" ls
WHERE LOWER(l.status) = LOWER(ls.name) AND l.status IS NOT NULL;

UPDATE "crm_Leads" l
SET "lead_type_id" = lt.id
FROM "crm_Lead_Types" lt
WHERE LOWER(l.type) = LOWER(lt.name) AND l.type IS NOT NULL;

-- lead_source was free-text; no reliable backfill (values won't match seeded rows)

-- Step 5: Assert backfill is complete (rolls back transaction on failure)
DO $$ BEGIN
  ASSERT (
    SELECT COUNT(*) FROM "crm_Contacts"
    WHERE type IS NOT NULL AND "contact_type_id" IS NULL
  ) = 0, 'Contact type backfill incomplete — unmatched values exist';

  ASSERT (
    SELECT COUNT(*) FROM "crm_Leads"
    WHERE status IS NOT NULL AND "lead_status_id" IS NULL
  ) = 0, 'Lead status backfill incomplete — unmatched values exist';

  ASSERT (
    SELECT COUNT(*) FROM "crm_Leads"
    WHERE type IS NOT NULL AND "lead_type_id" IS NULL
  ) = 0, 'Lead type backfill incomplete — unmatched values exist';
END $$;

-- Step 6: Drop old string columns
ALTER TABLE "crm_Contacts" DROP COLUMN IF EXISTS "type";
ALTER TABLE "crm_Leads"    DROP COLUMN IF EXISTS "status";
ALTER TABLE "crm_Leads"    DROP COLUMN IF EXISTS "type";
ALTER TABLE "crm_Leads"    DROP COLUMN IF EXISTS "lead_source";

-- Step 7: Drop orphaned enum types (they were unused by any model field)
DROP TYPE IF EXISTS "crm_Contact_Type";
DROP TYPE IF EXISTS "crm_Lead_Status";
DROP TYPE IF EXISTS "crm_Lead_Type";

-- Step 8: Add FK constraints
ALTER TABLE "crm_Contacts" ADD CONSTRAINT "fk_contact_type"
  FOREIGN KEY ("contact_type_id") REFERENCES "crm_Contact_Types"("id") ON DELETE SET NULL;

ALTER TABLE "crm_Leads" ADD CONSTRAINT "fk_lead_source"
  FOREIGN KEY ("lead_source_id") REFERENCES "crm_Lead_Sources"("id") ON DELETE SET NULL;

ALTER TABLE "crm_Leads" ADD CONSTRAINT "fk_lead_status"
  FOREIGN KEY ("lead_status_id") REFERENCES "crm_Lead_Statuses"("id") ON DELETE SET NULL;

ALTER TABLE "crm_Leads" ADD CONSTRAINT "fk_lead_type"
  FOREIGN KEY ("lead_type_id") REFERENCES "crm_Lead_Types"("id") ON DELETE SET NULL;

-- Indexes for new FK columns
CREATE INDEX IF NOT EXISTS "crm_Contacts_contact_type_id_idx" ON "crm_Contacts"("contact_type_id");
CREATE INDEX IF NOT EXISTS "crm_Leads_lead_source_id_idx"     ON "crm_Leads"("lead_source_id");
CREATE INDEX IF NOT EXISTS "crm_Leads_lead_status_id_idx"     ON "crm_Leads"("lead_status_id");
CREATE INDEX IF NOT EXISTS "crm_Leads_lead_type_id_idx"       ON "crm_Leads"("lead_type_id");

COMMIT;
