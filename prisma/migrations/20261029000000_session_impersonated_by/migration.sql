-- better-auth 1.7 validates its schema at startup; the admin plugin writes
-- session.impersonatedBy, which this table never had. Nullable, no backfill.
ALTER TABLE "session" ADD COLUMN "impersonatedBy" TEXT;
