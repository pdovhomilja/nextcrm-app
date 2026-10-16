import { prismadb } from "@/lib/prisma";
import {
  fetchCoreCurrencyMatrix,
  FRANKFURTER_CURRENCY_CODES,
  isFrankfurterSupported,
} from "@/lib/currency/frankfurter";
import { ExchangeRateSource } from "@prisma/client";

export async function persistFrankfurterRates(): Promise<number> {
  // Find all enabled currencies in the database that are supported by Frankfurter
  const enabledCurrencies = await prismadb.currency.findMany({
    where: { isEnabled: true },
    select: { code: true },
  });

  const enabledCodes = enabledCurrencies
    .map((c) => c.code.toUpperCase())
    .filter(isFrankfurterSupported);

  // If none or very few are enabled, include all 30 supported Frankfurter currencies
  const targetCodes =
    enabledCodes.length >= 2
      ? enabledCodes
      : Array.from(new Set([...enabledCodes, ...FRANKFURTER_CURRENCY_CODES]));

  const pairs = await fetchCoreCurrencyMatrix(targetCodes);
  const targetSet = new Set(targetCodes);

  let updated = 0;
  const now = new Date();

  for (const { from, to, rate } of pairs) {
    if (!targetSet.has(from) || !targetSet.has(to)) continue;

    const existing = await prismadb.exchangeRate.findUnique({
      where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
    });
    if (existing?.source === ExchangeRateSource.MANUAL) continue;

    await prismadb.exchangeRate.upsert({
      where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
      update: { rate, source: ExchangeRateSource.FRANKFURTER, effectiveDate: now },
      create: {
        fromCurrency: from,
        toCurrency: to,
        rate,
        source: ExchangeRateSource.FRANKFURTER,
        effectiveDate: now,
      },
    });
    updated++;
  }

  return updated;
}
