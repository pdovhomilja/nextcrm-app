/** Free FX API — European Central Bank daily rates (no API key required). */

import { CORE_CURRENCY_CODES } from "@/lib/currency";

export type FrankfurterRates = Record<string, number>;

/**
 * All 30 official currencies tracked and published daily by the European Central Bank (ECB) via Frankfurter API.
 */
export const FRANKFURTER_CURRENCY_CODES = [
  "AUD", "BRL", "CAD", "CHF", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD",
  "HUF", "IDR", "ILS", "INR", "ISK", "JPY", "KRW", "MXN", "MYR", "NOK",
  "NZD", "PHP", "PLN", "RON", "SEK", "SGD", "THB", "TRY", "USD", "ZAR",
] as const;

export type FrankfurterCurrencyCode = (typeof FRANKFURTER_CURRENCY_CODES)[number];

const FRANKFURTER_SET = new Set<string>(FRANKFURTER_CURRENCY_CODES);

export function isFrankfurterSupported(code: string): boolean {
  return FRANKFURTER_SET.has(code.toUpperCase());
}

/**
 * Fetch latest rates from Frankfurter API with fallback.
 */
export async function fetchFrankfurterLatest(
  base: string,
  symbols?: string[]
): Promise<FrankfurterRates> {
  const cleanBase = base.toUpperCase();
  const validBase = isFrankfurterSupported(cleanBase) ? cleanBase : "EUR";

  const cleanSymbols = symbols
    ?.map((s) => s.toUpperCase())
    .filter((s) => s !== validBase && isFrankfurterSupported(s));

  const url =
    cleanSymbols && cleanSymbols.length > 0
      ? `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(validBase)}&symbols=${encodeURIComponent(cleanSymbols.join(","))}`
      : `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(validBase)}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } } as any);
    if (!res.ok) {
      throw new Error(`Frankfurter primary API status: ${res.status}`);
    }
    const json = (await res.json()) as { rates?: FrankfurterRates };
    return json.rates ?? {};
  } catch {
    // Fallback to legacy endpoint
    const fallbackUrl =
      cleanSymbols && cleanSymbols.length > 0
        ? `https://api.frankfurter.app/latest?from=${encodeURIComponent(validBase)}&to=${encodeURIComponent(cleanSymbols.join(","))}`
        : `https://api.frankfurter.app/latest?from=${encodeURIComponent(validBase)}`;

    const res2 = await fetch(fallbackUrl, { next: { revalidate: 3600 } } as any);
    if (!res2.ok) throw new Error(`Frankfurter API error: ${res2.status}`);
    const json2 = (await res2.json()) as { rates?: FrankfurterRates };
    return json2.rates ?? {};
  }
}

/**
 * Fetch all pairwise rates among given currencies (or core EUR, USD, INR by default).
 */
export async function fetchCoreCurrencyMatrix(
  customCodes?: string[]
): Promise<{ from: string; to: string; rate: number }[]> {
  const codes = (customCodes ?? [...CORE_CURRENCY_CODES]).filter(isFrankfurterSupported);
  if (codes.length === 0) return [];

  // Pick first valid code as base to get all rates in one single request
  const base = codes[0];
  const rates = await fetchFrankfurterLatest(base, codes);
  const pairs: { from: string; to: string; rate: number }[] = [];

  // Base -> Target
  for (const to of codes) {
    if (to === base) continue;
    const rate = rates[to];
    if (rate && Number.isFinite(rate)) {
      pairs.push({ from: base, to, rate });
      pairs.push({ from: to, to: base, rate: 1 / rate });
    }
  }

  // Cross rates between other pairs
  for (const from of codes) {
    if (from === base) continue;
    for (const to of codes) {
      if (to === base || to === from) continue;
      const rFrom = rates[from];
      const rTo = rates[to];
      if (rFrom && rTo && Number.isFinite(rFrom) && Number.isFinite(rTo) && rFrom > 0) {
        pairs.push({ from, to, rate: rTo / rFrom });
      }
    }
  }

  return pairs;
}
