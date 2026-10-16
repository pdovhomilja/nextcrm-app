CREATE TYPE "VentureDatabaseConnectionStatus" AS ENUM ('unknown', 'connected', 'failed');

ALTER TABLE "VentureApp" ADD COLUMN IF NOT EXISTS "databaseUrl" TEXT;
ALTER TABLE "VentureApp" ADD COLUMN IF NOT EXISTS "databaseConnectionStatus" "VentureDatabaseConnectionStatus" NOT NULL DEFAULT 'unknown';
ALTER TABLE "VentureApp" ADD COLUMN IF NOT EXISTS "lastDatabaseConnectionTestAt" TIMESTAMP(3);
