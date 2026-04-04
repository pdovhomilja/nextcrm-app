import { convertAmount, formatCurrency, findRate } from "@/lib/currency";
import { Decimal } from "@prisma/client/runtime/client";

type Rate = { fromCurrency: string; toCurrency: string; rate: Decimal };

const mockRates: Rate[] = [
  { fromCurrency: "EUR", toCurrency: "USD", rate: new Decimal("1.084") },
  { fromCurrency: "EUR", toCurrency: "CZK", rate: new Decimal("25.315") },
  { fromCurrency: "USD", toCurrency: "EUR", rate: new Decimal("0.92251") },
  { fromCurrency: "USD", toCurrency: "CZK", rate: new Decimal("23.35") },
  { fromCurrency: "CZK", toCurrency: "EUR", rate: new Decimal("0.0395") },
  { fromCurrency: "CZK", toCurrency: "USD", rate: new Decimal("0.04283") },
];

describe("findRate", () => {
  it("returns direct rate when available", () => {
    const rate = findRate("EUR", "USD", mockRates);
    expect(rate?.toString()).toBe("1.084");
  });

  it("returns 1 when from === to", () => {
    const rate = findRate("EUR", "EUR", mockRates);
    expect(rate?.toString()).toBe("1");
  });

  it("returns null when no rate exists", () => {
    const rate = findRate("GBP", "USD", mockRates);
    expect(rate).toBeNull();
  });
});

describe("convertAmount", () => {
  it("converts EUR to USD using direct rate", () => {
    const result = convertAmount(new Decimal("1000"), "EUR", "USD", mockRates);
    expect(result?.toString()).toBe("1084");
  });

  it("returns same amount when currencies match", () => {
    const result = convertAmount(new Decimal("500"), "EUR", "EUR", mockRates);
    expect(result?.toString()).toBe("500");
  });

  it("converts CZK to USD", () => {
    const result = convertAmount(new Decimal("10000"), "CZK", "USD", mockRates);
    expect(result?.toString()).toBe("428.3");
  });

  it("returns null when rate is missing", () => {
    const result = convertAmount(new Decimal("100"), "GBP", "USD", mockRates);
    expect(result).toBeNull();
  });
});

describe("formatCurrency", () => {
  it("formats EUR amount", () => {
    const result = formatCurrency(new Decimal("1234.56"), "EUR");
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("€");
  });

  it("formats USD amount", () => {
    const result = formatCurrency(new Decimal("1234.56"), "USD");
    expect(result).toContain("$");
  });

  it("formats CZK amount", () => {
    const result = formatCurrency(new Decimal("1234.56"), "CZK");
    expect(result).toContain("CZK");
  });

  it("formats whole numbers without unnecessary decimals", () => {
    const result = formatCurrency(new Decimal("1000"), "EUR");
    expect(result).not.toContain(".00");
  });
});
