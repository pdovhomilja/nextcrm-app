-- AlterTable: add company details to Invoice_Settings
ALTER TABLE "Invoice_Settings"
  ADD COLUMN "companyName"    TEXT,
  ADD COLUMN "companyAddress" TEXT,
  ADD COLUMN "companyCity"    TEXT,
  ADD COLUMN "companyZip"     TEXT,
  ADD COLUMN "companyCountry" TEXT,
  ADD COLUMN "companyVatId"   TEXT,
  ADD COLUMN "companyTaxId"   TEXT,
  ADD COLUMN "companyRegNo"   TEXT,
  ADD COLUMN "companyEmail"   TEXT,
  ADD COLUMN "companyPhone"   TEXT,
  ADD COLUMN "companyWebsite" TEXT;
