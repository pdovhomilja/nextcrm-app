-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "crm_AuditLog_Action" AS ENUM ('created', 'updated', 'deleted', 'restored', 'relation_added', 'relation_removed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "crm_AuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "action" "crm_AuditLog_Action" NOT NULL,
    "changes" JSONB,
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "crm_AuditLog_entityType_entityId_createdAt_idx" ON "crm_AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "crm_AuditLog_userId_idx" ON "crm_AuditLog"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "crm_AuditLog_createdAt_idx" ON "crm_AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "crm_AuditLog_entityType_createdAt_idx" ON "crm_AuditLog"("entityType", "createdAt");

-- AddForeignKey
ALTER TABLE "crm_AuditLog" ADD CONSTRAINT "crm_AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
