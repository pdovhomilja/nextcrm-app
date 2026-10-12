/** Free FX API — https://www.frankfurter.app/docs (no API key). */

import { CORE_CURRENCY_CODES } from "@/lib/currency";

export type FrankfurterRates = Record<string, number>;

export async function fetchFrankfurterLatest(
  base: string,
  symbols: string[]
): Promise<FrankfurterRates> {
  const to = symbols.filter((c) => c !== base).join(",");
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(to)}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);
  const json = (await res.json()) as { rates?: FrankfurterRates };
  return json.rates ?? {};
}

/** Fetch all pairwise rates among core currencies (EUR, USD, INR). */
export async function fetchCoreCurrencyMatrix(): Promise<
  { from: string; to: string; rate: number }[]
> {
  const codes = [...CORE_CURRENCY_CODES];
  const pairs: { from: string; to: string; rate: number }[] = [];

  for (const base of codes) {
    const rates = await fetchFrankfurterLatest(base, codes);
    for (const to of codes) {
      if (to === base) continue;
      const rate = rates[to];
      if (rate && Number.isFinite(rate)) {
        pairs.push({ from: base, to, rate });
      }
    }
  }

  return pairs;
}
