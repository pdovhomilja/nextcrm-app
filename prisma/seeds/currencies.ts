import { PrismaClient, ExchangeRateSource } from "@prisma/client";

const currencies = [
  { code: "EUR", name: "Euro", symbol: "€", isEnabled: true, isDefault: true },
  { code: "USD", name: "US Dollar", symbol: "$", isEnabled: true, isDefault: false },
  { code: "ZAR", name: "South African Rand", symbol: "R", isEnabled: true, isDefault: false },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", isEnabled: true, isDefault: false },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", isEnabled: true, isDefault: false },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", isEnabled: true, isDefault: false },
  { code: "GBP", name: "British Pound", symbol: "£", isEnabled: true, isDefault: false },
];

const rates = [
  { fromCurrency: "EUR", toCurrency: "USD", rate: 1.084, source: ExchangeRateSource.ECB },
  { fromCurrency: "USD", toCurrency: "EUR", rate: 0.92251, source: ExchangeRateSource.ECB },
];

export async function seedCurrencies(prisma: PrismaClient) {
  console.log("Seeding currencies...");

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: { name: currency.name, symbol: currency.symbol },
      create: currency,
    });
  }

  for (const rate of rates) {
    await prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: rate.fromCurrency,
          toCurrency: rate.toCurrency,
        },
      },
      update: { rate: rate.rate, source: rate.source },
      create: rate,
    });
  }

  await prisma.crm_SystemSettings.upsert({
    where: { key: "ecb_auto_update" },
    update: {},
    create: { key: "ecb_auto_update", value: "false" },
  });

  await prisma.crm_SystemSettings.upsert({
    where: { key: "default_currency" },
    update: {},
    create: { key: "default_currency", value: "EUR" },
  });

  console.log("Currencies seeded.");
}
