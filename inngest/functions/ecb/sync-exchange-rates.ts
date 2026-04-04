import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { ExchangeRateSource } from "@prisma/client";

export const syncExchangeRates = inngest.createFunction(
  {
    id: "ecb-sync-exchange-rates",
    name: "ECB Sync Exchange Rates",
    triggers: [{ cron: "0 17 * * 1-5" }],
  },
  async ({ step }: { step: any }) => {
    const enabled = await step.run("check-ecb-enabled", async () => {
      const setting = await prismadb.crm_SystemSettings.findUnique({
        where: { key: "ecb_auto_update" },
      });
      return setting?.value === "true";
    });

    if (!enabled) {
      return { skipped: true, reason: "ECB auto-update is disabled" };
    }

    const ecbRates = await step.run("fetch-ecb-rates", async () => {
      const response = await fetch(
        "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
      );
      if (!response.ok) {
        throw new Error(`ECB fetch failed: ${response.status}`);
      }
      const xml = await response.text();
      return parseEcbXml(xml);
    });

    const updated = await step.run("update-rates", async () => {
      const enabledCurrencies = await prismadb.currency.findMany({
        where: { isEnabled: true },
        select: { code: true },
      });
      const enabledCodes = new Set<string>(enabledCurrencies.map((c: { code: string }) => c.code));
      let count = 0;

      for (const [currency, rate] of Object.entries(ecbRates) as [string, number][]) {
        if (!enabledCodes.has(currency)) continue;

        // EUR → X
        await prismadb.exchangeRate.upsert({
          where: {
            fromCurrency_toCurrency: { fromCurrency: "EUR", toCurrency: currency },
          },
          update: { rate, source: ExchangeRateSource.ECB, effectiveDate: new Date() },
          create: {
            fromCurrency: "EUR",
            toCurrency: currency,
            rate,
            source: ExchangeRateSource.ECB,
            effectiveDate: new Date(),
          },
        });

        // X → EUR (inverse)
        const inverse = parseFloat((1 / rate).toFixed(8));
        await prismadb.exchangeRate.upsert({
          where: {
            fromCurrency_toCurrency: { fromCurrency: currency, toCurrency: "EUR" },
          },
          update: { rate: inverse, source: ExchangeRateSource.ECB, effectiveDate: new Date() },
          create: {
            fromCurrency: currency,
            toCurrency: "EUR",
            rate: inverse,
            source: ExchangeRateSource.ECB,
            effectiveDate: new Date(),
          },
        });
        count += 2;
      }

      // Cross rates between non-EUR currencies
      const nonEurCodes = Array.from(enabledCodes).filter((c) => c !== "EUR");
      for (const from of nonEurCodes) {
        for (const to of nonEurCodes) {
          if (from === to) continue;
          const fromRate = ecbRates[from];
          const toRate = ecbRates[to];
          if (!fromRate || !toRate) continue;

          const existing = await prismadb.exchangeRate.findUnique({
            where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
          });
          if (existing?.source === ExchangeRateSource.MANUAL) continue;

          const crossRate = parseFloat((toRate / fromRate).toFixed(8));
          await prismadb.exchangeRate.upsert({
            where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
            update: { rate: crossRate, source: ExchangeRateSource.ECB, effectiveDate: new Date() },
            create: {
              fromCurrency: from,
              toCurrency: to,
              rate: crossRate,
              source: ExchangeRateSource.ECB,
              effectiveDate: new Date(),
            },
          });
          count++;
        }
      }

      return count;
    });

    return { updated, ratesCount: Object.keys(ecbRates).length };
  }
);

function parseEcbXml(xml: string): Record<string, number> {
  const rates: Record<string, number> = {};
  const regex = /currency='([A-Z]{3})'\s+rate='([0-9.]+)'/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    rates[match[1]] = parseFloat(match[2]);
  }
  return rates;
}
