-- CreateEnum
CREATE TYPE "crm_Order_Status" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'READY', 'SENT', 'CONFIRMED', 'DELIVERED', 'INVOICED', 'PAID', 'CANCELLED', 'SYNC_FAILED');

-- CreateEnum
CREATE TYPE "crm_Order_Source" AS ENUM ('CRM', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "NumberSeries_Reset" AS ENUM ('YEARLY', 'NEVER');

-- CreateTable
CREATE TABLE "NumberSeries" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "resetPolicy" "NumberSeries_Reset" NOT NULL DEFAULT 'YEARLY',
    "currentYear" INTEGER,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_Orders" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "seriesId" UUID NOT NULL,
    "status" "crm_Order_Status" NOT NULL DEFAULT 'DRAFT',
    "source" "crm_Order_Source" NOT NULL DEFAULT 'CRM',
    "externalRef" TEXT,
    "accountId" UUID NOT NULL,
    "contactId" UUID,
    "ownerId" UUID,
    "priceListId" UUID,
    "currency" VARCHAR(3) NOT NULL,
    "shipping_street" TEXT,
    "shipping_city" TEXT,
    "shipping_state" TEXT,
    "shipping_postal_code" TEXT,
    "shipping_country" TEXT,
    "requestedDeliveryDate" DATE,
    "note" TEXT,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vatTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "approvalRequestedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" UUID,
    "approvalNote" TEXT,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_Orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_OrderLines" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "productId" UUID NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT,
    "unit" TEXT,
    "quantity" DECIMAL(14,4) NOT NULL,
    "listPrice" DECIMAL(18,2) NOT NULL,
    "priceRuleId" TEXT,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "unitPriceOverridden" BOOLEAN NOT NULL DEFAULT false,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "lineSubtotal" DECIMAL(14,2) NOT NULL,
    "lineVat" DECIMAL(14,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "crm_OrderLines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NumberSeries_scope_isDefault_idx" ON "NumberSeries"("scope", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "crm_Orders_number_key" ON "crm_Orders"("number");

-- CreateIndex
CREATE INDEX "crm_Orders_accountId_idx" ON "crm_Orders"("accountId");

-- CreateIndex
CREATE INDEX "crm_Orders_ownerId_idx" ON "crm_Orders"("ownerId");

-- CreateIndex
CREATE INDEX "crm_Orders_status_idx" ON "crm_Orders"("status");

-- CreateIndex
CREATE INDEX "crm_Orders_createdAt_idx" ON "crm_Orders"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "crm_Orders_source_externalRef_key" ON "crm_Orders"("source", "externalRef");

-- CreateIndex
CREATE INDEX "crm_OrderLines_orderId_idx" ON "crm_OrderLines"("orderId");

-- CreateIndex
CREATE INDEX "crm_OrderLines_productId_idx" ON "crm_OrderLines"("productId");

-- AddForeignKey
ALTER TABLE "crm_Orders" ADD CONSTRAINT "crm_Orders_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "NumberSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Orders" ADD CONSTRAINT "crm_Orders_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "crm_Accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Orders" ADD CONSTRAINT "crm_Orders_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "crm_Contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Orders" ADD CONSTRAINT "crm_Orders_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Orders" ADD CONSTRAINT "crm_Orders_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "crm_PriceLists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_Orders" ADD CONSTRAINT "crm_Orders_currency_fkey" FOREIGN KEY ("currency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_OrderLines" ADD CONSTRAINT "crm_OrderLines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "crm_Orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_OrderLines" ADD CONSTRAINT "crm_OrderLines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "crm_Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: default order number series
INSERT INTO "NumberSeries" ("id", "scope", "name", "template", "resetPolicy", "counter", "isDefault", "active", "updatedAt")
VALUES (gen_random_uuid(), 'order', 'Orders', 'ORD-{YYYY}-{####}', 'YEARLY', 0, true, true, now());
