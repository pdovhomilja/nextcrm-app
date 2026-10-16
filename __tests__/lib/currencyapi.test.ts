import {
  getStoredCurrencies,
  fetchCurrencyApiCurrencies,
  DEFAULT_CURRENCYAPI_KEY,
} from "@/lib/currency/currencyapi";

describe("CurrencyAPI Module", () => {
  it("has default live API key configured", () => {
    expect(DEFAULT_CURRENCYAPI_KEY).toBe(
      "cur_live_TowbrSkObPMkTPx2kY9muHbsXubRk9GoSa5lbgSy"
    );
  });

  it("loads offline catalog of exactly 171 fiat currencies", () => {
    const list = getStoredCurrencies();
    expect(list.length).toBe(171);

    for (const item of list) {
      expect(item.code).toHaveLength(3);
      expect(item.code).toBe(item.code.toUpperCase());
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.symbol.length).toBeGreaterThan(0);
      expect(item.symbol.length).toBeLessThanOrEqual(5);
    }
  });

  it("contains major global currencies in the catalog", () => {
    const list = getStoredCurrencies();
    const codes = new Set(list.map((c) => c.code));

    expect(codes.has("USD")).toBe(true);
    expect(codes.has("EUR")).toBe(true);
    expect(codes.has("INR")).toBe(true);
    expect(codes.has("GBP")).toBe(true);
    expect(codes.has("JPY")).toBe(true);
    expect(codes.has("AED")).toBe(true);
    expect(codes.has("CAD")).toBe(true);
    expect(codes.has("AUD")).toBe(true);
    expect(codes.has("SGD")).toBe(true);
    expect(codes.has("CHF")).toBe(true);
    expect(codes.has("CNY")).toBe(true);
  });

  it("safely falls back to stored catalog on network error", async () => {
    // global fetch fails or is not available
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error("Network offline"));

    try {
      const currencies = await fetchCurrencyApiCurrencies();
      expect(currencies.length).toBe(171);
      expect(currencies.some((c) => c.code === "USD")).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
