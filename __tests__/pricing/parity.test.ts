import { Decimal } from "decimal.js";
import { computePrice } from "@/lib/pricing/engine";
import type { RuleData } from "@/lib/pricing/types";

const d = (v: number | string) => new Decimal(v);
const base: RuleData = {
  id: "r", appliesTo: "ALL", categoryId: null, productId: null, minQuantity: d(0), dateStart: null, dateEnd: null,
  computePrice: "FORMULA", fixedPrice: null, percentPrice: null, base: "LIST_PRICE", basePriceListId: null,
  priceDiscount: d(0), priceSurcharge: d(0), priceRound: null, priceMinMargin: null, priceMaxMargin: null, createdAt: new Date("2026-01-01T00:00:00Z"),
};
const cases: [string, Partial<RuleData>, string][] = [
  ["fixed 99.90", { computePrice: "FIXED", fixedPrice: d(99.9) }, "99.90"],
  ["15 % off list", { computePrice: "PERCENTAGE", percentPrice: d(15) }, "85.00"],
  ["cost +25 %, round 1, -0.01", { base: "COST", priceDiscount: d(-25), priceRound: d(1), priceSurcharge: d(-0.01) }, "74.99"],
  ["33.333 % off, round 0.10", { priceDiscount: d(33.333), priceRound: d(0.1) }, "66.70"],
  ["10 % off, round 5, +2, min margin -5", { priceDiscount: d(10), priceRound: d(5), priceSurcharge: d(2), priceMinMargin: d(-5) }, "95.00"],
  ["2.5 % off, round 1 (half up)", { priceDiscount: d(2.5), priceRound: d(1) }, "98.00"],
  ["40 % off, max margin -50", { priceDiscount: d(40), priceMaxMargin: d(-50) }, "50.00"],
  ["no discount, surcharge 12.5", { priceSurcharge: d(12.5) }, "112.50"],
];

it.each(cases)("%s", (_name, over, expected) => {
  const r = computePrice({
    lists: new Map([["L", { id: "L", currency: "CZK", rules: [{ ...base, ...over }] }]]),
    product: { id: "p1", unitPrice: d(100), unitCost: d(60), currency: "CZK", categoryId: null },
    categoryChain: [],
    rate: () => d(1),
  }, "L", d(1), new Date("2026-06-01T00:00:00Z"));
  expect(r.price.toFixed(2)).toBe(expected);
});
