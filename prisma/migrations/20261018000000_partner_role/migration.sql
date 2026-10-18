-- AlterEnum
ALTER TYPE "AppRole" ADD VALUE 'partner';

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "partnerAccountId" UUID;

-- AlterTable
ALTER TABLE "crm_Accounts" ADD COLUMN     "partnerUserId" UUID;

-- CreateIndex
CREATE INDEX "Users_partnerAccountId_idx" ON "Users"("partnerAccountId");

-- CreateIndex
CREATE INDEX "crm_Accounts_partnerUserId_idx" ON "crm_Accounts"("partnerUserId");

-- AddForeignKey
ALTER TABLE "crm_Accounts" ADD CONSTRAINT "crm_Accounts_partnerUserId_fkey" FOREIGN KEY ("partnerUserId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_partnerAccountId_fkey" FOREIGN KEY ("partnerAccountId") REFERENCES "crm_Accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
