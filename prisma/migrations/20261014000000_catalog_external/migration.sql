-- CreateEnum
CREATE TYPE "crm_Product_Source" AS ENUM ('CRM', 'EXTERNAL');

-- AlterTable
ALTER TABLE "crm_Products" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "source" "crm_Product_Source" NOT NULL DEFAULT 'CRM',
ALTER COLUMN "createdBy" DROP NOT NULL;

-- AlterTable
ALTER TABLE "crm_ProductCategories" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "source" "crm_Product_Source" NOT NULL DEFAULT 'CRM',
ALTER COLUMN "createdBy" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "crm_Products_source_externalRef_key" ON "crm_Products"("source", "externalRef");

-- CreateIndex
CREATE UNIQUE INDEX "crm_ProductCategories_source_externalRef_key" ON "crm_ProductCategories"("source", "externalRef");

-- AlterForeignKey: the creator is optional now (rows written by a plugin have none)
ALTER TABLE "crm_Products" DROP CONSTRAINT "crm_Products_createdBy_fkey";
ALTER TABLE "crm_Products" ADD CONSTRAINT "crm_Products_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
