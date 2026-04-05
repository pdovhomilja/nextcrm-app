-- CreateEnum
CREATE TYPE "crm_Product_Type" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "crm_Product_Status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "crm_Billing_Period" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "crm_AccountProduct_Status" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING');

-- CreateTable
CREATE TABLE "crm_ProductCategories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "crm_ProductCategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Products" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "type" "crm_Product_Type" NOT NULL,
    "status" "crm_Product_Status" NOT NULL DEFAULT 'DRAFT',
    "unit_price" DECIMAL(18,2) NOT NULL,
    "unit_cost" DECIMAL(18,2),
    "currency" VARCHAR(3) NOT NULL,
    "tax_rate" DECIMAL(5,2),
    "unit" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "billing_period" "crm_Billing_Period",
    "categoryId" UUID,
    "__v" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" UUID,

    CONSTRAINT "crm_Products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_AccountProducts" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "custom_price" DECIMAL(18,2),
    "currency" VARCHAR(3) NOT NULL,
    "snapshot_rate" DECIMAL(18,8),
    "status" "crm_AccountProduct_Status" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "renewal_date" TIMESTAMP(3),
    "notes" TEXT,
    "__v" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "crm_AccountProducts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_ProductCategories_isActive_idx" ON "crm_ProductCategories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "crm_Products_sku_key" ON "crm_Products"("sku");

-- CreateIndex
CREATE INDEX "crm_Products_status_idx" ON "crm_Products"("status");

-- CreateIndex
CREATE INDEX "crm_Products_type_idx" ON "crm_Products"("type");

-- CreateIndex
CREATE INDEX "crm_Products_categoryId_idx" ON "crm_Products"("categoryId");

-- CreateIndex
CREATE INDEX "crm_Products_createdBy_idx" ON "crm_Products"("createdBy");

-- CreateIndex
CREATE INDEX "crm_Products_deletedAt_idx" ON "crm_Products"("deletedAt");

-- CreateIndex
CREATE INDEX "crm_AccountProducts_accountId_idx" ON "crm_AccountProducts"("accountId");

-- CreateIndex
CREATE INDEX "crm_AccountProducts_productId_idx" ON "crm_AccountProducts"("productId");

-- CreateIndex
CREATE INDEX "crm_AccountProducts_status_idx" ON "crm_AccountProducts"("status");

-- CreateIndex
CREATE INDEX "crm_AccountProducts_accountId_productId_idx" ON "crm_AccountProducts"("accountId", "productId");

-- AddForeignKey
ALTER TABLE "crm_Products" ADD CONSTRAINT "crm_Products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "crm_ProductCategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Products" ADD CONSTRAINT "crm_Products_currency_fkey" FOREIGN KEY ("currency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Products" ADD CONSTRAINT "crm_Products_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_AccountProducts" ADD CONSTRAINT "crm_AccountProducts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "crm_Accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_AccountProducts" ADD CONSTRAINT "crm_AccountProducts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "crm_Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_AccountProducts" ADD CONSTRAINT "crm_AccountProducts_currency_fkey" FOREIGN KEY ("currency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

