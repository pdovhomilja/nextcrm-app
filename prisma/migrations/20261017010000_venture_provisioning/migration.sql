-- Extend VentureApp + provisioning targets (CRM control plane)

CREATE TYPE "VentureLifecycleStatus" AS ENUM ('registered', 'domain_assigned', 'deploying', 'reachable', 'provisioning_ready', 'failed');
CREATE TYPE "VentureTargetHealth" AS ENUM ('unknown', 'reachable', 'unreachable', 'tls_error', 'provisioning_unavailable');
CREATE TYPE "VentureProvisioningStatus" AS ENUM ('not_configured', 'pending', 'succeeded', 'failed', 'already_exists');

ALTER TABLE "VentureApp" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "VentureApp" ADD COLUMN IF NOT EXISTS "assignedSubdomain" TEXT;
ALTER TABLE "VentureApp" ADD COLUMN IF NOT EXISTS "lifecycleStatus" "VentureLifecycleStatus" NOT NULL DEFAULT 'registered';

CREATE INDEX IF NOT EXISTS "VentureApp_lifecycleStatus_idx" ON "VentureApp"("lifecycleStatus");

CREATE TABLE "VentureApplicationTarget" (
    "id" UUID NOT NULL,
    "ventureId" UUID NOT NULL,
    "targetKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "applicationType" TEXT NOT NULL,
    "deploymentUrl" TEXT NOT NULL,
    "healthPath" TEXT NOT NULL DEFAULT '/api/health',
    "healthStatus" "VentureTargetHealth" NOT NULL DEFAULT 'unknown',
    "provisioningStatus" "VentureProvisioningStatus" NOT NULL DEFAULT 'not_configured',
    "administratorEmail" TEXT,
    "provisioningSecretEncrypted" TEXT,
    "lastConnectionTestAt" TIMESTAMP(3),
    "lastProvisioningAttemptAt" TIMESTAMP(3),
    "lastProvisioningSuccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VentureApplicationTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VentureApplicationTarget_ventureId_targetKey_key" ON "VentureApplicationTarget"("ventureId", "targetKey");
CREATE INDEX "VentureApplicationTarget_ventureId_idx" ON "VentureApplicationTarget"("ventureId");

ALTER TABLE "VentureApplicationTarget" ADD CONSTRAINT "VentureApplicationTarget_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "VentureApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProvisioningOperation" (
    "id" UUID NOT NULL,
    "ventureId" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "initiatedByUserId" UUID NOT NULL,
    "operationType" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "sanitizedResult" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProvisioningOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProvisioningOperation_idempotencyKey_key" ON "ProvisioningOperation"("idempotencyKey");
CREATE INDEX "ProvisioningOperation_targetId_idx" ON "ProvisioningOperation"("targetId");
CREATE INDEX "ProvisioningOperation_ventureId_idx" ON "ProvisioningOperation"("ventureId");

ALTER TABLE "ProvisioningOperation" ADD CONSTRAINT "ProvisioningOperation_ventureId_fkey" FOREIGN KEY ("ventureId") REFERENCES "VentureApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProvisioningOperation" ADD CONSTRAINT "ProvisioningOperation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "VentureApplicationTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProvisioningAuditLog" (
    "id" UUID NOT NULL,
    "targetId" UUID NOT NULL,
    "initiatedByUserId" UUID,
    "operation" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "correlationId" TEXT,
    "sanitizedMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProvisioningAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProvisioningAuditLog_targetId_idx" ON "ProvisioningAuditLog"("targetId");
CREATE INDEX "ProvisioningAuditLog_createdAt_idx" ON "ProvisioningAuditLog"("createdAt");

ALTER TABLE "ProvisioningAuditLog" ADD CONSTRAINT "ProvisioningAuditLog_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "VentureApplicationTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
