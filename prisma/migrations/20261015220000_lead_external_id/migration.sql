-- AlterTable
ALTER TABLE "crm_Leads" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "crm_Leads_externalId_key" ON "crm_Leads"("externalId");
