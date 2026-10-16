import {
  FRANKFURTER_CURRENCY_CODES,
  isFrankfurterSupported,
  fetchCoreCurrencyMatrix,
} from "@/lib/currency/frankfurter";

describe("Frankfurter Module", () => {
  it("defines exactly 30 official ECB currencies", () => {
    expect(FRANKFURTER_CURRENCY_CODES.length).toBe(30);
    const set = new Set(FRANKFURTER_CURRENCY_CODES);
    expect(set.size).toBe(30);
  });

  it("recognizes supported and unsupported currencies", () => {
    expect(isFrankfurterSupported("USD")).toBe(true);
    expect(isFrankfurterSupported("EUR")).toBe(true);
    expect(isFrankfurterSupported("INR")).toBe(true);
    expect(isFrankfurterSupported("GBP")).toBe(true);
    expect(isFrankfurterSupported("JPY")).toBe(true);
    expect(isFrankfurterSupported("XYZ")).toBe(false);
    expect(isFrankfurterSupported("ABC")).toBe(false);
  });

  it("calculates pairwise matrix correctly", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        rates: {
          USD: 1.08,
          INR: 90.5,
        },
      }),
    } as any);

    try {
      const pairs = await fetchCoreCurrencyMatrix(["EUR", "USD", "INR"]);
      expect(pairs.length).toBeGreaterThan(0);
      expect(pairs.some((p) => p.from === "EUR" && p.to === "USD")).toBe(true);
      expect(pairs.some((p) => p.from === "USD" && p.to === "EUR")).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
