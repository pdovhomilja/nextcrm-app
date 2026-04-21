-- Clean up failed migration record from previous attempt (if exists)
-- Guarded: the shadow DB may not have _prisma_migrations yet when replaying.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
  ) THEN
    DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260404120000_add_currency_support';
  END IF;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN CREATE TYPE "ExchangeRateSource" AS ENUM ('MANUAL', 'ECB'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Currency" (
    "code" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" VARCHAR(5) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExchangeRate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fromCurrency" VARCHAR(3) NOT NULL,
    "toCurrency" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "source" "ExchangeRateSource" NOT NULL DEFAULT 'MANUAL',
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "crm_SystemSettings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_SystemSettings_pkey" PRIMARY KEY ("key")
);

-- Seed default currencies (needed before FK constraints)
INSERT INTO "Currency" ("code", "name", "symbol", "isEnabled", "isDefault", "createdAt", "updatedAt")
VALUES
    ('EUR', 'Euro', '€', true, true, NOW(), NOW()),
    ('USD', 'US Dollar', '$', true, false, NOW(), NOW()),
    ('CZK', 'Czech Koruna', 'Kč', true, false, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

-- Seed default exchange rates
INSERT INTO "ExchangeRate" ("id", "fromCurrency", "toCurrency", "rate", "source", "effectiveDate", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid(), 'EUR', 'USD', 1.084, 'ECB', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'EUR', 'CZK', 25.315, 'ECB', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'USD', 'EUR', 0.92251, 'ECB', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'USD', 'CZK', 23.35, 'ECB', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'CZK', 'EUR', 0.0395, 'ECB', NOW(), NOW(), NOW()),
    (gen_random_uuid(), 'CZK', 'USD', 0.04283, 'ECB', NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Seed default system settings
INSERT INTO "crm_SystemSettings" ("key", "value", "updatedAt")
VALUES
    ('ecb_auto_update', 'false', NOW()),
    ('default_currency', 'EUR', NOW())
ON CONFLICT ("key") DO NOTHING;

-- Clean up existing currency values: truncate to 3 chars, nullify invalid ones
UPDATE "crm_Opportunities" SET "currency" = LEFT(TRIM("currency"), 3) WHERE "currency" IS NOT NULL;
UPDATE "crm_Opportunities" SET "currency" = NULL WHERE "currency" IS NOT NULL AND "currency" NOT IN (SELECT "code" FROM "Currency");

-- AlterTable: crm_Opportunities
ALTER TABLE "crm_Opportunities" ALTER COLUMN "budget" SET DATA TYPE DECIMAL(18,2);
ALTER TABLE "crm_Opportunities" ALTER COLUMN "expected_revenue" SET DATA TYPE DECIMAL(18,2);
ALTER TABLE "crm_Opportunities" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);
ALTER TABLE "crm_Opportunities" ADD COLUMN IF NOT EXISTS "snapshot_rate" DECIMAL(18,8);

-- AlterTable: crm_Contracts
ALTER TABLE "crm_Contracts" ALTER COLUMN "value" SET DATA TYPE DECIMAL(18,2);
ALTER TABLE "crm_Contracts" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3);
ALTER TABLE "crm_Contracts" ADD COLUMN IF NOT EXISTS "snapshot_rate" DECIMAL(18,8);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ExchangeRate_fromCurrency_toCurrency_key" ON "ExchangeRate"("fromCurrency", "toCurrency");
CREATE INDEX IF NOT EXISTS "ExchangeRate_fromCurrency_idx" ON "ExchangeRate"("fromCurrency");
CREATE INDEX IF NOT EXISTS "ExchangeRate_toCurrency_idx" ON "ExchangeRate"("toCurrency");

-- AddForeignKey (idempotent: drop if exists, then create)
DO $$ BEGIN
  ALTER TABLE "crm_Opportunities" DROP CONSTRAINT IF EXISTS "crm_Opportunities_currency_fkey";
  ALTER TABLE "crm_Opportunities" ADD CONSTRAINT "crm_Opportunities_currency_fkey" FOREIGN KEY ("currency") REFERENCES "Currency"("code") ON DELETE SET NULL ON UPDATE CASCADE;
  ALTER TABLE "crm_Contracts" DROP CONSTRAINT IF EXISTS "crm_Contracts_currency_fkey";
  ALTER TABLE "crm_Contracts" ADD CONSTRAINT "crm_Contracts_currency_fkey" FOREIGN KEY ("currency") REFERENCES "Currency"("code") ON DELETE SET NULL ON UPDATE CASCADE;
  ALTER TABLE "ExchangeRate" DROP CONSTRAINT IF EXISTS "ExchangeRate_fromCurrency_fkey";
  ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_fromCurrency_fkey" FOREIGN KEY ("fromCurrency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
  ALTER TABLE "ExchangeRate" DROP CONSTRAINT IF EXISTS "ExchangeRate_toCurrency_fkey";
  ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_toCurrency_fkey" FOREIGN KEY ("toCurrency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;
