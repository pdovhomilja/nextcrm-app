-- CreateEnum
CREATE TYPE "ExchangeRateSource" AS ENUM ('MANUAL', 'ECB');

-- CreateTable
CREATE TABLE "Currency" (
    "code" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" VARCHAR(5) NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fromCurrency" VARCHAR(3) NOT NULL,
    "toCurrency" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "source" "ExchangeRateSource" NOT NULL DEFAULT 'MANUAL',
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_SystemSettings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_SystemSettings_pkey" PRIMARY KEY ("key")
);

-- AlterTable: crm_Opportunities
ALTER TABLE "crm_Opportunities" ALTER COLUMN "budget" SET DATA TYPE DECIMAL(18,2);
ALTER TABLE "crm_Opportunities" ALTER COLUMN "expected_revenue" SET DATA TYPE DECIMAL(18,2);
ALTER TABLE "crm_Opportunities" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);
ALTER TABLE "crm_Opportunities" ADD COLUMN "snapshot_rate" DECIMAL(18,8);

-- AlterTable: crm_Contracts
ALTER TABLE "crm_Contracts" ALTER COLUMN "value" SET DATA TYPE DECIMAL(18,2);
ALTER TABLE "crm_Contracts" ADD COLUMN "currency" VARCHAR(3);
ALTER TABLE "crm_Contracts" ADD COLUMN "snapshot_rate" DECIMAL(18,8);

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_fromCurrency_toCurrency_key" ON "ExchangeRate"("fromCurrency", "toCurrency");
CREATE INDEX "ExchangeRate_fromCurrency_idx" ON "ExchangeRate"("fromCurrency");
CREATE INDEX "ExchangeRate_toCurrency_idx" ON "ExchangeRate"("toCurrency");

-- AddForeignKey
ALTER TABLE "crm_Opportunities" ADD CONSTRAINT "crm_Opportunities_currency_fkey" FOREIGN KEY ("currency") REFERENCES "Currency"("code") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crm_Contracts" ADD CONSTRAINT "crm_Contracts_currency_fkey" FOREIGN KEY ("currency") REFERENCES "Currency"("code") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_fromCurrency_fkey" FOREIGN KEY ("fromCurrency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_toCurrency_fkey" FOREIGN KEY ("toCurrency") REFERENCES "Currency"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
