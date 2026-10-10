import { Decimal } from "decimal.js";
import { discountPercent, isBelowList, lineAmounts, orderTotals, round2 } from "@/lib/orders/pricing";

const d = (v: number | string) => new Decimal(v);

it("rounds half up to 2 decimals", () => {
  expect(round2(d("1.005")).toFixed(2)).toBe("1.01");
  expect(round2(d("39.2")).toFixed(2)).toBe("39.20");
});

it("flags only prices strictly below the list", () => {
  expect(isBelowList({ unitPrice: d("48.99"), listPrice: d("49.00") })).toBe(true);
  expect(isBelowList({ unitPrice: d("49.00"), listPrice: d("49.00") })).toBe(false);
  expect(isBelowList({ unitPrice: d("50"), listPrice: d("49") })).toBe(false);
});

it("computes line and order totals with VAT", () => {
  const a = lineAmounts({ quantity: d(3), unitPrice: d("10.10"), vatRate: d(21) });
  expect([a.lineSubtotal.toFixed(2), a.lineVat.toFixed(2), a.lineTotal.toFixed(2)]).toEqual(["30.30", "6.36", "36.66"]);
  const b = lineAmounts({ quantity: d("0.5"), unitPrice: d(100), vatRate: d(0) });
  const t = orderTotals([a, b]);
  expect([t.subtotal.toFixed(2), t.vatTotal.toFixed(2), t.grandTotal.toFixed(2)]).toEqual(["80.30", "6.36", "86.66"]);
  expect(orderTotals([]).grandTotal.toFixed(2)).toBe("0.00");
});

it("derives the discount against the list", () => {
  expect(discountPercent({ unitPrice: d(45), listPrice: d(50) })!.toFixed(2)).toBe("10.00");
  expect(discountPercent({ unitPrice: d(5), listPrice: d(0) })).toBeNull();
});
