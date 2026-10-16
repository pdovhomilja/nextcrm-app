import { prismadb } from "@/lib/prisma";
import { ExchangeRateSource } from "@prisma/client";
import currenciesJson from "./currencies-data.json";

export const DEFAULT_CURRENCYAPI_KEY =
  "cur_live_TowbrSkObPMkTPx2kY9muHbsXubRk9GoSa5lbgSy";

export interface CurrencyItem {
  code: string;
  name: string;
  symbol: string;
}

export interface CurrencyApiStatus {
  accountId?: number;
  plan?: string;
  status?: string;
  quotaTotal: number;
  quotaUsed: number;
  quotaRemaining: number;
}

/**
 * Resolve the CurrencyAPI key from environment variable, database system settings,
 * or the default live key provided for VenSai CRM.
 */
export async function getCurrencyApiKey(): Promise<string> {
  const envKey = process.env.CURRENCYAPI_KEY?.trim();
  if (envKey) return envKey;

  try {
    const setting = await prismadb.crm_SystemSettings.findUnique({
      where: { key: "currencyapi_key" },
    });
    if (setting?.value?.trim()) {
      return setting.value.trim();
    }
  } catch {
    // If database is unavailable, continue to default
  }

  return DEFAULT_CURRENCYAPI_KEY;
}

/**
 * Return stored offline catalog of all 171 ISO fiat currencies.
 */
export function getStoredCurrencies(): CurrencyItem[] {
  return (currenciesJson as CurrencyItem[]).map((c) => ({
    code: c.code.toUpperCase().slice(0, 3),
    name: c.name.slice(0, 100),
    symbol: (c.symbol || c.code).slice(0, 5),
  }));
}

/**
 * Query CurrencyAPI status endpoint to check quota and subscription status.
 */
export async function fetchCurrencyApiStatus(): Promise<CurrencyApiStatus | null> {
  try {
    const key = await getCurrencyApiKey();
    const res = await fetch(`https://api.currencyapi.com/v3/status?apikey=${encodeURIComponent(key)}`, {
      next: { revalidate: 300 },
    } as any);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return {
      accountId: data.account_id,
      plan: data.plan?.name ?? "free",
      status: data.plan?.status ?? "active",
      quotaTotal: data.quotas?.month?.total ?? 300,
      quotaUsed: data.quotas?.month?.used ?? 0,
      quotaRemaining: data.quotas?.month?.remaining ?? 300,
    };
  } catch (err) {
    console.error("[currencyapi] Failed to fetch status:", err);
    return null;
  }
}

/**
 * Fetch supported currencies from CurrencyAPI live, with fallback to local JSON catalog.
 */
export async function fetchCurrencyApiCurrencies(): Promise<CurrencyItem[]> {
  try {
    const key = await getCurrencyApiKey();
    const res = await fetch(`https://api.currencyapi.com/v3/currencies?apikey=${encodeURIComponent(key)}`, {
      next: { revalidate: 86400 },
    } as any);

    if (!res.ok) {
      return getStoredCurrencies();
    }

    const json = (await res.json()) as {
      data?: Record<
        string,
        {
          code?: string;
          name?: string;
          symbol?: string;
          type?: string;
        }
      >;
    };

    if (!json.data || typeof json.data !== "object") {
      return getStoredCurrencies();
    }

    const items: CurrencyItem[] = [];
    for (const [code, item] of Object.entries(json.data)) {
      if (item.type !== "fiat" && item.type !== undefined) continue;
      const cleanCode = (item.code || code).toUpperCase().trim();
      if (cleanCode.length !== 3) continue;

      items.push({
        code: cleanCode,
        name: (item.name || cleanCode).slice(0, 100),
        symbol: (item.symbol || cleanCode).slice(0, 5),
      });
    }

    return items.length > 0 ? items : getStoredCurrencies();
  } catch (err) {
    console.error("[currencyapi] Falling back to stored currencies data:", err);
    return getStoredCurrencies();
  }
}

/**
 * Synchronize all global currencies into the database.
 * Preserves existing enabled/default settings for already-configured currencies.
 */
export async function syncAllCurrenciesFromCurrencyApi(options?: {
  enableAllNew?: boolean;
}): Promise<{ total: number; added: number; updated: number }> {
  const currencies = await fetchCurrencyApiCurrencies();

  const existing = await prismadb.currency.findMany({
    select: { code: true, isEnabled: true, isDefault: true },
  });
  const existingMap = new Map(existing.map((c) => [c.code, c]));

  let added = 0;
  let updated = 0;

  for (const item of currencies) {
    const prev = existingMap.get(item.code);
    if (!prev) {
      await prismadb.currency.create({
        data: {
          code: item.code,
          name: item.name,
          symbol: item.symbol,
          isEnabled: options?.enableAllNew ?? true,
          isDefault: false,
        },
      });
      added++;
    } else {
      await prismadb.currency.update({
        where: { code: item.code },
        data: {
          name: item.name,
          symbol: item.symbol,
        },
      });
      updated++;
    }
  }

  return { total: currencies.length, added, updated };
}

/**
 * Fetch latest live exchange rates from CurrencyAPI and persist to ExchangeRate table.
 * Computes rates for all enabled currencies in a single API call to preserve quota.
 */
export async function syncExchangeRatesFromCurrencyApi(): Promise<{
  ok: boolean;
  updated: number;
  base: string;
  error?: string;
}> {
  try {
    const key = await getCurrencyApiKey();

    // Determine default base currency (e.g. USD or EUR)
    const defaultSetting = await prismadb.crm_SystemSettings.findUnique({
      where: { key: "default_currency" },
    });
    const base = defaultSetting?.value || "USD";

    // Fetch enabled currencies from DB
    const enabledCurrencies = await prismadb.currency.findMany({
      where: { isEnabled: true },
      select: { code: true },
    });
    const enabledCodes = new Set<string>(enabledCurrencies.map((c) => c.code));
    enabledCodes.add(base);

    // Single API call to CurrencyAPI for latest rates
    const res = await fetch(
      `https://api.currencyapi.com/v3/latest?apikey=${encodeURIComponent(key)}&base_currency=${encodeURIComponent(base)}`,
      { next: { revalidate: 3600 } } as any
    );

    if (!res.ok) {
      throw new Error(`CurrencyAPI error: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as {
      data?: Record<string, { code: string; value: number }>;
    };

    if (!json.data) {
      throw new Error("No rate data returned by CurrencyAPI");
    }

    const ratesFromBase: Record<string, { code: string; value: number }> = json.data;
    let updated = 0;
    const now = new Date();

    // Build list of codes we have rates for
    const activeCodes: string[] = Array.from(enabledCodes).filter(
      (code: string) => code === base || (ratesFromBase[code] && ratesFromBase[code].value > 0)
    );

    // Save pairwise rates between base and enabled currencies,
    // plus cross-rates among key enabled currencies
    for (const to of activeCodes) {
      if (to === base) continue;
      const rateToBase = ratesFromBase[to]?.value;
      if (!rateToBase || !Number.isFinite(rateToBase)) continue;

      // Base -> To
      const existingFwd = await prismadb.exchangeRate.findUnique({
        where: { fromCurrency_toCurrency: { fromCurrency: base, toCurrency: to } },
      });
      if (existingFwd?.source !== ExchangeRateSource.MANUAL) {
        await prismadb.exchangeRate.upsert({
          where: { fromCurrency_toCurrency: { fromCurrency: base, toCurrency: to } },
          update: { rate: rateToBase, source: ExchangeRateSource.FRANKFURTER, effectiveDate: now },
          create: { fromCurrency: base, toCurrency: to, rate: rateToBase, source: ExchangeRateSource.FRANKFURTER, effectiveDate: now },
        });
        updated++;
      }

      // To -> Base (inverse)
      const inverseRate = 1 / rateToBase;
      const existingRev = await prismadb.exchangeRate.findUnique({
        where: { fromCurrency_toCurrency: { fromCurrency: to, toCurrency: base } },
      });
      if (existingRev?.source !== ExchangeRateSource.MANUAL) {
        await prismadb.exchangeRate.upsert({
          where: { fromCurrency_toCurrency: { fromCurrency: to, toCurrency: base } },
          update: { rate: inverseRate, source: ExchangeRateSource.FRANKFURTER, effectiveDate: now },
          create: { fromCurrency: to, toCurrency: base, rate: inverseRate, source: ExchangeRateSource.FRANKFURTER, effectiveDate: now },
        });
        updated++;
      }
    }

    // Also calculate cross rates for top core currencies (e.g. EUR, USD, INR, GBP) if enabled
    const coreCodes = ["USD", "EUR", "INR", "GBP", "CAD", "AUD", "AED", "SGD", "JPY"].filter((c) =>
      enabledCodes.has(c)
    );
    for (const c1 of coreCodes) {
      for (const c2 of coreCodes) {
        if (c1 === c2 || c1 === base || c2 === base) continue;
        const rate1 = ratesFromBase[c1]?.value;
        const rate2 = ratesFromBase[c2]?.value;
        if (!rate1 || !rate2) continue;
        const crossRate = rate2 / rate1;

        const existing = await prismadb.exchangeRate.findUnique({
          where: { fromCurrency_toCurrency: { fromCurrency: c1, toCurrency: c2 } },
        });
        if (existing?.source !== ExchangeRateSource.MANUAL) {
          await prismadb.exchangeRate.upsert({
            where: { fromCurrency_toCurrency: { fromCurrency: c1, toCurrency: c2 } },
            update: { rate: crossRate, source: ExchangeRateSource.FRANKFURTER, effectiveDate: now },
            create: { fromCurrency: c1, toCurrency: c2, rate: crossRate, source: ExchangeRateSource.FRANKFURTER, effectiveDate: now },
          });
          updated++;
        }
      }
    }

    return { ok: true, updated, base };
  } catch (err: any) {
    console.error("[currencyapi] Sync exchange rates failed:", err);
    return { ok: false, updated: 0, base: "USD", error: err.message || "Failed to sync rates" };
  }
}
