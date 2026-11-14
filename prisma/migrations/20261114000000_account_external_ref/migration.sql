-- AlterTable
ALTER TABLE "crm_Accounts" ADD COLUMN "external_ref" TEXT;

-- CreateIndex
CREATE INDEX "crm_Accounts_external_ref_idx" ON "crm_Accounts"("external_ref");
