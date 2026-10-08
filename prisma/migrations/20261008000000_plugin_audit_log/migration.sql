-- AlterEnum
ALTER TYPE "crm_AuditLog_Action" ADD VALUE 'installed';
ALTER TYPE "crm_AuditLog_Action" ADD VALUE 'uninstalled';
ALTER TYPE "crm_AuditLog_Action" ADD VALUE 'enabled';
ALTER TYPE "crm_AuditLog_Action" ADD VALUE 'disabled';
ALTER TYPE "crm_AuditLog_Action" ADD VALUE 'settings_changed';
ALTER TYPE "crm_AuditLog_Action" ADD VALUE 'upgraded';

-- Plugin ids are not UUIDs (entityType "plugin")
ALTER TABLE "crm_AuditLog" ALTER COLUMN "entityId" SET DATA TYPE TEXT;
