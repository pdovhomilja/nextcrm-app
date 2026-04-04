-- Fix Better Auth model ID fields: add UUID defaults so DB can auto-generate
-- when Better Auth does not provide an explicit id value.

-- Session: add UUID default (column stays TEXT to avoid breaking existing data)
ALTER TABLE "session" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- Account: add UUID default (column stays TEXT to avoid breaking existing data)
ALTER TABLE "account" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;

-- Verification: change id from TEXT to UUID with default
-- (table is expected to be empty / newly created)
ALTER TABLE "verification" ALTER COLUMN "id" TYPE UUID USING "id"::UUID;
ALTER TABLE "verification" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Add banned fields to Users table (required by Better Auth admin plugin)
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "banned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "banReason" TEXT;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "banExpires" TIMESTAMP(3);
