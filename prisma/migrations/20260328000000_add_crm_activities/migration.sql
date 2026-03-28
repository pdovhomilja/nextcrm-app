-- Migration: Add crm_Activities and crm_ActivityLinks
-- Safe to re-run (IF NOT EXISTS guards)

-- CreateEnum: crm_Activity_Type
DO $$ BEGIN
  CREATE TYPE "crm_Activity_Type" AS ENUM ('call', 'meeting', 'note', 'email');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum: crm_Activity_Status
DO $$ BEGIN
  CREATE TYPE "crm_Activity_Status" AS ENUM ('scheduled', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: crm_Activities
CREATE TABLE IF NOT EXISTS "crm_Activities" (
    "id"          UUID                  NOT NULL DEFAULT gen_random_uuid(),
    "type"        "crm_Activity_Type"   NOT NULL,
    "title"       TEXT                  NOT NULL,
    "description" TEXT,
    "date"        TIMESTAMP(3)          NOT NULL,
    "duration"    INTEGER,
    "outcome"     TEXT,
    "status"      "crm_Activity_Status" NOT NULL DEFAULT 'scheduled',
    "metadata"    JSONB,
    "createdBy"   UUID,
    "updatedBy"   UUID,
    "createdAt"   TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3),

    CONSTRAINT "crm_Activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable: crm_ActivityLinks
CREATE TABLE IF NOT EXISTS "crm_ActivityLinks" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId"   UUID NOT NULL,

    CONSTRAINT "crm_ActivityLinks_pkey" PRIMARY KEY ("id")
);

-- Indexes on crm_Activities
CREATE INDEX IF NOT EXISTS "crm_Activities_date_idx"      ON "crm_Activities"("date");
CREATE INDEX IF NOT EXISTS "crm_Activities_type_idx"      ON "crm_Activities"("type");
CREATE INDEX IF NOT EXISTS "crm_Activities_status_idx"    ON "crm_Activities"("status");
CREATE INDEX IF NOT EXISTS "crm_Activities_createdBy_idx" ON "crm_Activities"("createdBy");
CREATE INDEX IF NOT EXISTS "crm_Activities_createdAt_idx" ON "crm_Activities"("createdAt");

-- Indexes on crm_ActivityLinks
CREATE INDEX IF NOT EXISTS "crm_ActivityLinks_activityId_idx"
    ON "crm_ActivityLinks"("activityId");
CREATE INDEX IF NOT EXISTS "crm_ActivityLinks_entityType_entityId_activityId_idx"
    ON "crm_ActivityLinks"("entityType", "entityId", "activityId");

-- Foreign keys (crm_Activities → Users)
DO $$ BEGIN
  ALTER TABLE "crm_Activities"
    ADD CONSTRAINT "crm_Activities_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "Users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "crm_Activities"
    ADD CONSTRAINT "crm_Activities_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "Users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Foreign key (crm_ActivityLinks → crm_Activities, cascade delete)
DO $$ BEGIN
  ALTER TABLE "crm_ActivityLinks"
    ADD CONSTRAINT "crm_ActivityLinks_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "crm_Activities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
