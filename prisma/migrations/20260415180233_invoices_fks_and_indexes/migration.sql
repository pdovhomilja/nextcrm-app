-- CreateIndex
CREATE INDEX "Invoice_LineItems_productId_idx" ON "Invoice_LineItems"("productId");

-- CreateIndex
CREATE INDEX "Invoice_LineItems_taxRateId_idx" ON "Invoice_LineItems"("taxRateId");

-- CreateIndex
CREATE INDEX "Invoices_createdBy_idx" ON "Invoices"("createdBy");

-- CreateIndex
CREATE INDEX "Invoices_originalInvoiceId_idx" ON "Invoices"("originalInvoiceId");

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_currency_fkey" FOREIGN KEY ("currency") REFERENCES "Invoice_Currencies"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Payments" ADD CONSTRAINT "Invoice_Payments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Attachments" ADD CONSTRAINT "Invoice_Attachments_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Activity" ADD CONSTRAINT "Invoice_Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Settings" ADD CONSTRAINT "Invoice_Settings_defaultSeriesId_fkey" FOREIGN KEY ("defaultSeriesId") REFERENCES "Invoice_Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice_Settings" ADD CONSTRAINT "Invoice_Settings_defaultTaxRateId_fkey" FOREIGN KEY ("defaultTaxRateId") REFERENCES "Invoice_TaxRates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
