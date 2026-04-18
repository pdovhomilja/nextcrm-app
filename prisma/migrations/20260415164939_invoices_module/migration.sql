-- CreateEnum
CREATE TYPE "Invoice_Status" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'DISPUTED', 'REFUNDED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "Invoice_Type" AS ENUM ('INVOICE', 'CREDIT_NOTE', 'PROFORMA');

-- CreateTable
CREATE TABLE "Invoices" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID NOT NULL,
    "type" "Invoice_Type" NOT NULL DEFAULT 'INVOICE',
    "status" "Invoice_Status" NOT NULL DEFAULT 'DRAFT',
    "number" TEXT,
    "numberOverridden" BOOLEAN NOT NULL DEFAULT false,
    "seriesId" UUID,
    "accountId" UUID NOT NULL,
    "billingSnapshot" JSONB,
    "issueDate" TIMESTAMP(3),
    "taxableSupplyDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "currency" VARCHAR(3) NOT NULL,
    "baseCurrency" VARCHAR(3),
    "fxRateToBase" DECIMAL(18,8),
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vatTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paidTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balanceDue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "iban" TEXT,
    "swift" TEXT,
    "variableSymbol" TEXT,
    "publicNotes" TEXT,
    "internalNotes" TEXT,
    "originalInvoiceId" UUID,
    "pdfStorageKey" TEXT,
    "pdfGeneratedAt" TIMESTAMP(3),
    "search_vector" tsvector,

    CONSTRAINT "Invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_LineItems" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "productId" UUID,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxRateId" UUID,
    "taxRateSnapshot" DECIMAL(5,2),
    "lineSubtotal" DECIMAL(14,2) NOT NULL,
    "lineVat" DECIMAL(14,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "Invoice_LineItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_Payments" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_Payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_Attachments" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedBy" UUID NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPrimaryPdf" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Invoice_Attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_Activity" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_TaxRates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_TaxRates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_Series" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "prefixTemplate" TEXT NOT NULL,
    "resetPolicy" TEXT NOT NULL DEFAULT 'YEARLY',
    "currentYear" INTEGER,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice_Currencies" (
    "code" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_Currencies_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Invoice_Settings" (
    "id" UUID NOT NULL,
    "baseCurrency" VARCHAR(3) NOT NULL,
    "defaultSeriesId" UUID,
    "defaultTaxRateId" UUID,
    "defaultDueDays" INTEGER NOT NULL DEFAULT 14,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "iban" TEXT,
    "swift" TEXT,
    "footerText" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invoices_accountId_idx" ON "Invoices"("accountId");

-- CreateIndex
CREATE INDEX "Invoices_status_idx" ON "Invoices"("status");

-- CreateIndex
CREATE INDEX "Invoices_issueDate_idx" ON "Invoices"("issueDate");

-- CreateIndex
CREATE INDEX "Invoices_dueDate_idx" ON "Invoices"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoices_seriesId_number_key" ON "Invoices"("seriesId", "number");

-- CreateIndex
CREATE INDEX "Invoice_LineItems_invoiceId_idx" ON "Invoice_LineItems"("invoiceId");

-- CreateIndex
CREATE INDEX "Invoice_Payments_invoiceId_idx" ON "Invoice_Payments"("invoiceId");

-- CreateIndex
CREATE INDEX "Invoice_Attachments_invoiceId_idx" ON "Invoice_Attachments"("invoiceId");

-- CreateIndex
CREATE INDEX "Invoice_Activity_invoiceId_idx" ON "Invoice_Activity"("invoiceId");

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Invoice_Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "crm_Accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "Invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_LineItems" ADD CONSTRAINT "Invoice_LineItems_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_LineItems" ADD CONSTRAINT "Invoice_LineItems_productId_fkey" FOREIGN KEY ("productId") REFERENCES "crm_Products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_LineItems" ADD CONSTRAINT "Invoice_LineItems_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "Invoice_TaxRates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Payments" ADD CONSTRAINT "Invoice_Payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Attachments" ADD CONSTRAINT "Invoice_Attachments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Activity" ADD CONSTRAINT "Invoice_Activity_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

