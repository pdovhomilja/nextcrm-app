import { Decimal } from "@prisma/client/runtime/client";
import { prismadb } from "@/lib/prisma";

type Rate = { fromCurrency: string; toCurrency: string; rate: Decimal };

const currencyLocaleMap: Record<string, string> = {
  EUR: "fr-FR",
  USD: "en-US",
  CZK: "cs-CZ",
  GBP: "en-GB",
};

export function findRate(
  from: string,
  to: string,
  rates: Rate[]
): Decimal | null {
  if (from === to) return new Decimal("1");
  const direct = rates.find(
    (r) => r.fromCurrency === from && r.toCurrency === to
  );
  return direct ? new Decimal(direct.rate) : null;
}

export function convertAmount(
  amount: Decimal,
  from: string,
  to: string,
  rates: Rate[]
): Decimal | null {
  const rate = findRate(from, to, rates);
  if (!rate) return null;
  return amount.mul(rate).toDecimalPlaces(2);
}

export function formatCurrency(amount: Decimal, currencyCode: string): string {
  const num = amount.toNumber();
  const locale = currencyLocaleMap[currencyCode] || "en-US";
  const isWhole = num % 1 === 0;
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(num);
  // If the currency symbol doesn't show the ISO code, append it
  if (!formatted.includes(currencyCode)) {
    return `${formatted} ${currencyCode}`;
  }
  return formatted;
}

export async function getExchangeRates(): Promise<Rate[]> {
  const rates = await prismadb.exchangeRate.findMany();
  return rates.map((r) => ({
    fromCurrency: r.fromCurrency,
    toCurrency: r.toCurrency,
    rate: r.rate,
  }));
}

export async function getSnapshotRate(
  from: string,
  to: string
): Promise<Decimal | null> {
  if (from === to) return new Decimal("1");
  const rate = await prismadb.exchangeRate.findUnique({
    where: {
      fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to },
    },
  });
  return rate ? rate.rate : null;
}

export async function getDefaultCurrency(): Promise<string> {
  const setting = await prismadb.crm_SystemSettings.findUnique({
    where: { key: "default_currency" },
  });
  return setting?.value || "EUR";
}

export async function getEnabledCurrencies() {
  return prismadb.currency.findMany({
    where: { isEnabled: true },
    orderBy: { code: "asc" },
  });
}
