import { PrismaClient, ExchangeRateSource } from "@prisma/client";
import currenciesData from "../../lib/currency/currencies-data.json";

const defaultEnabledCodes = new Set([
  "USD", "EUR", "INR", "GBP", "CAD", "AUD", "AED", "SGD", "JPY", "CHF", "CNY", "CZK"
]);

const initialRates = [
  { fromCurrency: "EUR", toCurrency: "USD", rate: 1.084, source: ExchangeRateSource.ECB },
  { fromCurrency: "EUR", toCurrency: "CZK", rate: 25.315, source: ExchangeRateSource.ECB },
  { fromCurrency: "USD", toCurrency: "EUR", rate: 0.92251, source: ExchangeRateSource.ECB },
  { fromCurrency: "USD", toCurrency: "CZK", rate: 23.35, source: ExchangeRateSource.ECB },
  { fromCurrency: "CZK", toCurrency: "EUR", rate: 0.0395, source: ExchangeRateSource.ECB },
  { fromCurrency: "CZK", toCurrency: "USD", rate: 0.04283, source: ExchangeRateSource.ECB },
  { fromCurrency: "USD", toCurrency: "INR", rate: 86.85, source: ExchangeRateSource.FRANKFURTER },
  { fromCurrency: "EUR", toCurrency: "INR", rate: 94.50, source: ExchangeRateSource.FRANKFURTER },
];

export async function seedCurrencies(prisma: PrismaClient) {
  console.log(`Seeding ${currenciesData.length} global currencies...`);

  for (const item of currenciesData) {
    const isDefault = item.code === "EUR";
    const isEnabled = defaultEnabledCodes.has(item.code) || isDefault;

    await prisma.currency.upsert({
      where: { code: item.code },
      update: { name: item.name, symbol: item.symbol },
      create: {
        code: item.code,
        name: item.name,
        symbol: item.symbol,
        isEnabled,
        isDefault,
      },
    });
  }


  for (const rate of initialRates) {
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
