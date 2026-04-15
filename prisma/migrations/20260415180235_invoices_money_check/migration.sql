ALTER TABLE "Invoices"
  ADD CONSTRAINT invoices_base_currency_fx_both_or_neither
  CHECK ((("baseCurrency" IS NULL) = ("fxRateToBase" IS NULL)));
