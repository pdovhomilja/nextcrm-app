-- Consolidate Invoice_Currencies into the shared Currency table.
-- The Invoices.currency FK now references Currency(code), matching
-- crm_Products, crm_Opportunities, crm_Contracts, and crm_AccountProducts.

-- 1. Copy any Invoice_Currencies rows missing from Currency.
--    Currency.symbol is NOT NULL; fall back to the code when symbol is null.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Invoice_Currencies') THEN
    INSERT INTO "Currency" ("code", "name", "symbol", "isEnabled", "isDefault", "createdAt", "updatedAt")
    SELECT ic."code",
           ic."name",
           COALESCE(NULLIF(ic."symbol", ''), ic."code"),
           ic."active",
           false,
           ic."createdAt",
           NOW()
    FROM "Invoice_Currencies" ic
    LEFT JOIN "Currency" c ON c."code" = ic."code"
    WHERE c."code" IS NULL;
  END IF;
END $$;

-- 2. Drop the old FK pointing to Invoice_Currencies.
ALTER TABLE "Invoices" DROP CONSTRAINT IF EXISTS "Invoices_currency_fkey";

-- 3. Add the new FK pointing to the shared Currency table.
ALTER TABLE "Invoices"
  ADD CONSTRAINT "Invoices_currency_fkey"
  FOREIGN KEY ("currency") REFERENCES "Currency"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Drop the redundant Invoice_Currencies table.
DROP TABLE IF EXISTS "Invoice_Currencies";
