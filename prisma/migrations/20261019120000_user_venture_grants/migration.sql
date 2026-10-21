-- Lightweight VenSai venture access from CRM user admin
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "crmEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "UserVentureGrant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "ventureSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserVentureGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserVentureGrant_userId_ventureSlug_key"
  ON "UserVentureGrant"("userId", "ventureSlug");
CREATE INDEX IF NOT EXISTS "UserVentureGrant_userId_idx" ON "UserVentureGrant"("userId");
CREATE INDEX IF NOT EXISTS "UserVentureGrant_ventureSlug_idx" ON "UserVentureGrant"("ventureSlug");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserVentureGrant_userId_fkey'
  ) THEN
    ALTER TABLE "UserVentureGrant"
      ADD CONSTRAINT "UserVentureGrant_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
