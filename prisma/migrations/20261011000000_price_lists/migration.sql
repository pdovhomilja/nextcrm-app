-- CreateEnum
CREATE TYPE "crm_PriceList_Source" AS ENUM ('CRM', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "crm_PriceRule_Target" AS ENUM ('ALL', 'CATEGORY', 'PRODUCT');

-- CreateEnum
CREATE TYPE "crm_PriceRule_Compute" AS ENUM ('FIXED', 'PERCENTAGE', 'FORMULA');

-- CreateEnum
CREATE TYPE "crm_PriceRule_Base" AS ENUM ('LIST_PRICE', 'COST', 'PRICE_LIST');

-- AlterTable
ALTER TABLE "crm_Accounts" ADD COLUMN     "pricelist_id" UUID;

-- AlterTable
ALTER TABLE "crm_ProductCategories" ADD COLUMN     "parentId" UUID;

-- CreateTable
CREATE TABLE "crm_PriceLists" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" "crm_PriceList_Source" NOT NULL DEFAULT 'CRM',
    "externalRef" TEXT,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_PriceLists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_PriceListRules" (
    "id" UUID NOT NULL,
    "priceListId" UUID NOT NULL,
    "appliesTo" "crm_PriceRule_Target" NOT NULL DEFAULT 'ALL',
    "categoryId" UUID,
    "productId" UUID,
    "minQuantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "dateStart" TIMESTAMP(3),
    "dateEnd" TIMESTAMP(3),
    "computePrice" "crm_PriceRule_Compute" NOT NULL DEFAULT 'FIXED',
    "fixedPrice" DECIMAL(18,4),
    "percentPrice" DECIMAL(7,4),
    "base" "crm_PriceRule_Base" NOT NULL DEFAULT 'LIST_PRICE',
    "basePriceListId" UUID,
    "priceDiscount" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "priceSurcharge" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "priceRound" DECIMAL(18,4),
    "priceMinMargin" DECIMAL(18,4),
    "priceMaxMargin" DECIMAL(18,4),
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_PriceListRules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_PriceLists_isActive_idx" ON "crm_PriceLists"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "crm_PriceLists_source_externalRef_key" ON "crm_PriceLists"("source", "externalRef");

-- CreateIndex
CREATE INDEX "crm_PriceListRules_priceListId_appliesTo_idx" ON "crm_PriceListRules"("priceListId", "appliesTo");

-- CreateIndex
CREATE INDEX "crm_PriceListRules_basePriceListId_idx" ON "crm_PriceListRules"("basePriceListId");

-- CreateIndex
CREATE INDEX "crm_Accounts_pricelist_id_idx" ON "crm_Accounts"("pricelist_id");

-- AddForeignKey
ALTER TABLE "crm_Accounts" ADD CONSTRAINT "crm_Accounts_pricelist_id_fkey" FOREIGN KEY ("pricelist_id") REFERENCES "crm_PriceLists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_ProductCategories" ADD CONSTRAINT "crm_ProductCategories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "crm_ProductCategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_PriceLists" ADD CONSTRAINT "crm_PriceLists_currency_fkey" FOREIGN KEY ("currency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_PriceListRules" ADD CONSTRAINT "crm_PriceListRules_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "crm_PriceLists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_PriceListRules" ADD CONSTRAINT "crm_PriceListRules_basePriceListId_fkey" FOREIGN KEY ("basePriceListId") REFERENCES "crm_PriceLists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_PriceListRules" ADD CONSTRAINT "crm_PriceListRules_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "crm_ProductCategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_PriceListRules" ADD CONSTRAINT "crm_PriceListRules_productId_fkey" FOREIGN KEY ("productId") REFERENCES "crm_Products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

