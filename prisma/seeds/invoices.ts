import { PrismaClient } from "@prisma/client";

// Stable deterministic UUIDs for idempotent re-runs
const SERIES_ID = "00000000-0000-4000-a000-000000000001";
const SETTINGS_ID = "00000000-0000-4000-a000-000000000002";
const TAX_RATE_21_ID = "00000000-0000-4000-a000-000000000010";
const TAX_RATE_12_ID = "00000000-0000-4000-a000-000000000011";
const TAX_RATE_0_ID = "00000000-0000-4000-a000-000000000012";

const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "\u20ac" },
  { code: "CZK", name: "Czech Koruna", symbol: "K\u010d" },
  { code: "GBP", name: "British Pound", symbol: "\u00a3" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "JPY", name: "Japanese Yen", symbol: "\u00a5" },
  { code: "PLN", name: "Polish Zloty", symbol: "z\u0142" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
];

const TAX_RATES = [
  { id: TAX_RATE_21_ID, name: "Standard 21%", rate: 21, isDefault: true },
  { id: TAX_RATE_12_ID, name: "Reduced 12%", rate: 12, isDefault: false },
  { id: TAX_RATE_0_ID, name: "Zero 0%", rate: 0, isDefault: false },
];

export async function seedInvoices(prisma: PrismaClient) {
  console.log("Seeding invoice currencies...");
  for (const c of CURRENCIES) {
    await prisma.invoice_Currencies.upsert({
      where: { code: c.code },
      update: { name: c.name, symbol: c.symbol },
      create: { code: c.code, name: c.name, symbol: c.symbol },
    });
  }

  console.log("Seeding invoice series...");
  await prisma.invoice_Series.upsert({
    where: { id: SERIES_ID },
    update: { name: "Main", prefixTemplate: "INV-{YYYY}-{####}" },
    create: {
      id: SERIES_ID,
      name: "Main",
      prefixTemplate: "INV-{YYYY}-{####}",
      resetPolicy: "YEARLY",
      counter: 0,
      isDefault: true,
    },
  });

  console.log("Seeding invoice tax rates...");
  for (const tr of TAX_RATES) {
    await prisma.invoice_TaxRates.upsert({
      where: { id: tr.id },
      update: { name: tr.name, rate: tr.rate, isDefault: tr.isDefault },
      create: {
        id: tr.id,
        name: tr.name,
        rate: tr.rate,
        isDefault: tr.isDefault,
      },
    });
  }

  console.log("Seeding invoice settings...");
  await prisma.invoice_Settings.upsert({
    where: { id: SETTINGS_ID },
    update: {
      baseCurrency: "USD",
      defaultDueDays: 14,
      defaultSeriesId: SERIES_ID,
      defaultTaxRateId: TAX_RATE_21_ID,
    },
    create: {
      id: SETTINGS_ID,
      baseCurrency: "USD",
      defaultDueDays: 14,
      defaultSeriesId: SERIES_ID,
      defaultTaxRateId: TAX_RATE_21_ID,
    },
  });

  console.log("Invoice seed data completed.");
}
