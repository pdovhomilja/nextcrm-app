import { Decimal } from "decimal.js";
import { computeLineTotal, computeInvoiceTotals } from "@/lib/invoices/totals";

describe("computeLineTotal", () => {
  it("computes a simple line with no discount and 21% VAT", () => {
    const r = computeLineTotal({
      quantity: new Decimal(2),
      unitPrice: new Decimal(100),
      discountPercent: new Decimal(0),
      taxRate: new Decimal(21),
    });
    expect(r.lineSubtotal.toString()).toBe("200");
    expect(r.lineVat.toString()).toBe("42");
    expect(r.lineTotal.toString()).toBe("242");
  });

  it("applies discount before VAT", () => {
    const r = computeLineTotal({
      quantity: new Decimal(1),
      unitPrice: new Decimal(100),
      discountPercent: new Decimal(10),
      taxRate: new Decimal(21),
    });
    expect(r.lineSubtotal.toString()).toBe("90");
    expect(r.lineVat.toString()).toBe("18.9");
  });

  it("handles zero tax rate", () => {
    const r = computeLineTotal({
      quantity: new Decimal(1),
      unitPrice: new Decimal(50),
      discountPercent: new Decimal(0),
      taxRate: new Decimal(0),
    });
    expect(r.lineVat.toString()).toBe("0");
    expect(r.lineTotal.toString()).toBe("50");
  });
});

describe("computeInvoiceTotals", () => {
  it("aggregates lines with mixed VAT rates", () => {
    const r = computeInvoiceTotals([
      { quantity: new Decimal(1), unitPrice: new Decimal(100), discountPercent: new Decimal(0), taxRate: new Decimal(21) },
      { quantity: new Decimal(1), unitPrice: new Decimal(50),  discountPercent: new Decimal(0), taxRate: new Decimal(12) },
    ]);
    expect(r.subtotal.toString()).toBe("150");
    expect(r.vatTotal.toString()).toBe("27");
    expect(r.grandTotal.toString()).toBe("177");
    expect(r.vatBreakdown).toHaveLength(2);
    expect(r.vatBreakdown.find(b => b.rate === "21")!.vat).toBe("21");
    expect(r.vatBreakdown.find(b => b.rate === "12")!.vat).toBe("6");
  });

  it("returns zeros for empty line list", () => {
    const r = computeInvoiceTotals([]);
    expect(r.subtotal.toString()).toBe("0");
    expect(r.grandTotal.toString()).toBe("0");
    expect(r.vatBreakdown).toEqual([]);
  });
});
