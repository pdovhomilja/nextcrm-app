-- CreateEnum
CREATE TYPE "crm_Discount_Type" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateTable
CREATE TABLE "crm_OpportunityLineItems" (
    "id" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "productId" UUID,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "discount_type" "crm_Discount_Type" NOT NULL DEFAULT 'PERCENTAGE',
    "discount_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "__v" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "crm_OpportunityLineItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_ContractLineItems" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "productId" UUID,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "discount_type" "crm_Discount_Type" NOT NULL DEFAULT 'PERCENTAGE',
    "discount_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(18,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "__v" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "crm_ContractLineItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_OpportunityLineItems_opportunityId_idx" ON "crm_OpportunityLineItems"("opportunityId");

-- CreateIndex
CREATE INDEX "crm_OpportunityLineItems_productId_idx" ON "crm_OpportunityLineItems"("productId");

-- CreateIndex
CREATE INDEX "crm_ContractLineItems_contractId_idx" ON "crm_ContractLineItems"("contractId");

-- CreateIndex
CREATE INDEX "crm_ContractLineItems_productId_idx" ON "crm_ContractLineItems"("productId");

-- AddForeignKey
ALTER TABLE "crm_OpportunityLineItems" ADD CONSTRAINT "crm_OpportunityLineItems_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "crm_Opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_OpportunityLineItems" ADD CONSTRAINT "crm_OpportunityLineItems_productId_fkey" FOREIGN KEY ("productId") REFERENCES "crm_Products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_ContractLineItems" ADD CONSTRAINT "crm_ContractLineItems_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "crm_Contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_ContractLineItems" ADD CONSTRAINT "crm_ContractLineItems_productId_fkey" FOREIGN KEY ("productId") REFERENCES "crm_Products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
