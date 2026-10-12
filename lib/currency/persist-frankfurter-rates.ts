import { prismadb } from "@/lib/prisma";
import { fetchCoreCurrencyMatrix } from "@/lib/currency/frankfurter";
import { CORE_CURRENCY_CODES } from "@/lib/currency";
import { ExchangeRateSource } from "@prisma/client";
export async function persistFrankfurterRates(): Promise<number> {
  const pairs = await fetchCoreCurrencyMatrix();
  const enabled = new Set(
    (
      await prismadb.currency.findMany({
        where: { code: { in: [...CORE_CURRENCY_CODES] }, isEnabled: true },
        select: { code: true },
      })
    ).map((c) => c.code)
  );

  let updated = 0;
  const now = new Date();

  for (const { from, to, rate } of pairs) {
    if (!enabled.has(from) || !enabled.has(to)) continue;
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
