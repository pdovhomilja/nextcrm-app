-- CreateTable
CREATE TABLE "crm_Assistant_Inquiries" (
    "id" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sessionId" TEXT,
    "leadId" UUID,
    "activityId" UUID,
    "leadCreated" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_Assistant_Inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crm_Assistant_Inquiries_idempotencyKey_key" ON "crm_Assistant_Inquiries"("idempotencyKey");

-- CreateIndex
CREATE INDEX "crm_Assistant_Inquiries_leadId_idx" ON "crm_Assistant_Inquiries"("leadId");

-- CreateIndex
CREATE INDEX "crm_Assistant_Inquiries_createdAt_idx" ON "crm_Assistant_Inquiries"("createdAt");

