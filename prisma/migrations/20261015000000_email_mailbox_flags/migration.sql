-- AlterTable
ALTER TABLE "Email" ADD COLUMN IF NOT EXISTS "isSpam" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Email" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Email" ADD COLUMN IF NOT EXISTS "isStarred" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Email_userId_emailAccountId_isSpam_isDeleted_idx" ON "Email"("userId", "emailAccountId", "isSpam", "isDeleted");
CREATE INDEX IF NOT EXISTS "Email_userId_emailAccountId_isArchived_isDeleted_idx" ON "Email"("userId", "emailAccountId", "isArchived", "isDeleted");
