import { formatNumber } from "@/lib/invoices/numbering";

describe("formatNumber", () => {
  it("substitutes year and zero-padded counter", () => {
    expect(formatNumber("INV-{YYYY}-{####}", 2026, 7)).toBe("INV-2026-0007");
  });
  it("supports a 6 digit counter", () => {
    expect(formatNumber("{YYYY}/{######}", 2026, 42)).toBe("2026/000042");
  });
  it("supports a prefix without year", () => {
    expect(formatNumber("INV-{####}", 2026, 1)).toBe("INV-0001");
  });
});
