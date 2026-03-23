-- CreateEnum
CREATE TYPE "crm_Enrichment_Status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "crm_Contact_Enrichment" (
    "id" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "status" "crm_Enrichment_Status" NOT NULL DEFAULT 'PENDING',
    "fields" TEXT[],
    "result" JSONB,
    "error" TEXT,
    "triggeredBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_Contact_Enrichment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_Contact_Enrichment_contactId_idx" ON "crm_Contact_Enrichment"("contactId");

-- CreateIndex
CREATE INDEX "crm_Contact_Enrichment_status_idx" ON "crm_Contact_Enrichment"("status");

-- CreateIndex
CREATE INDEX "crm_Contact_Enrichment_createdAt_idx" ON "crm_Contact_Enrichment"("createdAt");

-- CreateIndex
CREATE INDEX "crm_Contact_Enrichment_triggeredBy_idx" ON "crm_Contact_Enrichment"("triggeredBy");

-- AddForeignKey
ALTER TABLE "crm_Contact_Enrichment" ADD CONSTRAINT "crm_Contact_Enrichment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm_Contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Contact_Enrichment" ADD CONSTRAINT "crm_Contact_Enrichment_triggeredBy_fkey" FOREIGN KEY ("triggeredBy") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
