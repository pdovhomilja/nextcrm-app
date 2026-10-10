-- AlterTable
ALTER TABLE "crm_Orders" ADD COLUMN     "orderDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "crm_Orders_accountId_orderDate_idx" ON "crm_Orders"("accountId", "orderDate");

-- Backfill: existing orders take the UTC day they were created
UPDATE "crm_Orders" SET "orderDate" = "createdAt"::date;
