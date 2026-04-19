-- CreateTable: crm_Target_Contact
-- Introduces multi-contact enrichment records attached to crm_Targets.
-- Idempotent: safe to re-run on databases that already have the table
-- (e.g. environments synced via `prisma db push`).

CREATE TABLE IF NOT EXISTS "crm_Target_Contact" (
    "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
    "targetId"     UUID         NOT NULL,
    "contactId"    UUID,
    "name"         TEXT,
    "email"        TEXT,
    "title"        TEXT,
    "phone"        TEXT,
    "linkedinUrl"  TEXT,
    "source"       TEXT         NOT NULL DEFAULT 'manual',
    "enrichStatus" "crm_Enrichment_Status" NOT NULL DEFAULT 'PENDING',
    "enrichedAt"   TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "crm_Target_Contact_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "crm_Target_Contact_targetId_email_key"
    ON "crm_Target_Contact" ("targetId", "email");

CREATE UNIQUE INDEX IF NOT EXISTS "crm_Target_Contact_targetId_linkedinUrl_key"
    ON "crm_Target_Contact" ("targetId", "linkedinUrl");

-- Lookup indexes
CREATE INDEX IF NOT EXISTS "crm_Target_Contact_targetId_idx"
    ON "crm_Target_Contact" ("targetId");

CREATE INDEX IF NOT EXISTS "crm_Target_Contact_enrichStatus_idx"
    ON "crm_Target_Contact" ("enrichStatus");

-- Foreign keys (guarded so re-runs don't fail)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'crm_Target_Contact_targetId_fkey'
    ) THEN
        ALTER TABLE "crm_Target_Contact"
            ADD CONSTRAINT "crm_Target_Contact_targetId_fkey"
            FOREIGN KEY ("targetId") REFERENCES "crm_Targets"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'crm_Target_Contact_contactId_fkey'
    ) THEN
        ALTER TABLE "crm_Target_Contact"
            ADD CONSTRAINT "crm_Target_Contact_contactId_fkey"
            FOREIGN KEY ("contactId") REFERENCES "crm_Contacts"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
