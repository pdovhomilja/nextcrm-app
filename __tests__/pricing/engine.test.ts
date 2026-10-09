import { Decimal } from "decimal.js";
import { applicableRules, computePrice, roundTo } from "@/lib/pricing/engine";
import { MissingRateError, PriceListDepthExceeded, PriceListNotFound } from "@/lib/pricing/errors";
import type { ListData, PricingContext, ProductData, RuleData } from "@/lib/pricing/types";

const d = (v: number | string) => new Decimal(v);
const rule = (over: Partial<RuleData>): RuleData => ({
  id: "r", appliesTo: "ALL", categoryId: null, productId: null, minQuantity: d(0), dateStart: null, dateEnd: null,
  computePrice: "FIXED", fixedPrice: null, percentPrice: null, base: "LIST_PRICE", basePriceListId: null,
  priceDiscount: d(0), priceSurcharge: d(0), priceRound: null, priceMinMargin: null, priceMaxMargin: null,
  createdAt: new Date("2026-01-01T00:00:00Z"), ...over,
});
const product: ProductData = { id: "p1", unitPrice: d(100), unitCost: d(60), currency: "CZK", categoryId: "c-child" };
const rate = (from: string, to: string) => {
  if (from === to) return d(1);
  if (from === "EUR" && to === "CZK") return d(25);
  if (from === "CZK" && to === "EUR") return d(1).div(25);
  throw new MissingRateError(from, to);
};
const ctx = (lists: ListData[], over: Partial<PricingContext> = {}): PricingContext =>
  ({ lists: new Map(lists.map((l) => [l.id, l])), product, categoryChain: ["c-child", "c-parent"], rate, ...over });
const list = (rules: RuleData[], over: Partial<ListData> = {}): ListData => ({ id: "L", currency: "CZK", rules, ...over });
const price = (c: PricingContext, qty = 1, date = new Date("2026-06-01T12:00:00Z"), listId = "L") => computePrice(c, listId, d(qty), date);

it("falls back to the product's list price without a matching rule", () => {
  const r = price(ctx([list([])]));
  expect(r.price.toFixed(2)).toBe("100.00");
  expect(r.ruleId).toBeNull();
  expect(r.steps.map((s) => s.label)).toEqual(["fallback"]);
});

it("applies fixed and percentage rules", () => {
  expect(price(ctx([list([rule({ fixedPrice: d(80) })])])).price.toFixed(2)).toBe("80.00");
  expect(price(ctx([list([rule({ computePrice: "PERCENTAGE", percentPrice: d(10) })])])).price.toFixed(2)).toBe("90.00");
});

it("prefers product over deeper category over shallower category over all", () => {
  const rules = [
    rule({ id: "all", fixedPrice: d(70) }),
    rule({ id: "parent", appliesTo: "CATEGORY", categoryId: "c-parent", fixedPrice: d(75) }),
    rule({ id: "child", appliesTo: "CATEGORY", categoryId: "c-child", fixedPrice: d(78) }),
    rule({ id: "prod", appliesTo: "PRODUCT", productId: "p1", fixedPrice: d(80) }),
  ];
  expect(price(ctx([list(rules)])).ruleId).toBe("prod");
  expect(price(ctx([list(rules.filter((r) => r.id !== "prod"))])).ruleId).toBe("child");
  expect(price(ctx([list(rules.filter((r) => r.id !== "prod" && r.id !== "child"))])).ruleId).toBe("parent");
  expect(price(ctx([list(rules)], { categoryChain: [] })).ruleId).toBe("prod");
});

it("ignores rules for other products and categories", () => {
  const rules = [rule({ appliesTo: "PRODUCT", productId: "p2", fixedPrice: d(1) }), rule({ appliesTo: "CATEGORY", categoryId: "c-other", fixedPrice: d(2) })];
  expect(price(ctx([list(rules)])).ruleId).toBeNull();
});

it("picks the highest minimum quantity that applies", () => {
  const rules = [rule({ id: "q0", fixedPrice: d(90) }), rule({ id: "q10", minQuantity: d(10), fixedPrice: d(85) })];
  expect(price(ctx([list(rules)]), 9).ruleId).toBe("q0");
  expect(price(ctx([list(rules)]), 10).ruleId).toBe("q10");
});

it("compares minimum quantity before category depth, like Odoo 17's item _order", () => {
  const rules = [
    rule({ id: "parent-q10", appliesTo: "CATEGORY", categoryId: "c-parent", minQuantity: d(10), fixedPrice: d(70) }),
    rule({ id: "child-q0", appliesTo: "CATEGORY", categoryId: "c-child", fixedPrice: d(78) }),
  ];
  expect(price(ctx([list(rules)]), 10).ruleId).toBe("parent-q10");
  expect(price(ctx([list(rules)]), 9).ruleId).toBe("child-q0");
});

it("prefers the newest rule on a tie", () => {
  const rules = [rule({ id: "old", fixedPrice: d(1) }), rule({ id: "new", fixedPrice: d(2), createdAt: new Date("2026-02-01T00:00:00Z") })];
  expect(price(ctx([list(rules)])).ruleId).toBe("new");
});

it("treats rule dates as inclusive calendar days in UTC", () => {
  const on = (over: Partial<RuleData>) => price(ctx([list([rule({ fixedPrice: d(1), ...over })])])).ruleId;
  expect(on({ dateStart: new Date("2026-07-01T00:00:00Z") })).toBeNull();
  expect(on({ dateEnd: new Date("2026-06-01T00:00:00Z") })).toBe("r");
  expect(on({ dateEnd: new Date("2026-05-31T23:59:59Z") })).toBeNull();
  expect(on({ dateStart: new Date("2026-06-01T23:00:00Z") })).toBe("r");
});

it("runs formula steps in Odoo's order", () => {
  const r = price(ctx([list([rule({
    computePrice: "FORMULA", priceDiscount: d(12.5), priceRound: d(5), priceSurcharge: d(-0.1), priceMinMargin: d(-20), priceMaxMargin: d(-15),
  })])]));
  expect(r.steps.map((s) => [s.label, s.value.toFixed(2)])).toEqual([
    ["base", "100.00"], ["discount", "87.50"], ["round", "90.00"], ["surcharge", "89.90"], ["minMargin", "89.90"], ["maxMargin", "85.00"],
  ]);
  expect(r.price.toFixed(2)).toBe("85.00");
});

it("treats a negative discount as a markup on cost", () => {
  expect(price(ctx([list([rule({ computePrice: "FORMULA", base: "COST", priceDiscount: d(-20) })])])).price.toFixed(2)).toBe("72.00");
});

it("skips zero margins like Odoo", () => {
  const r = price(ctx([list([rule({ computePrice: "FORMULA", priceDiscount: d(50), priceMinMargin: d(0) })])]));
  expect(r.price.toFixed(2)).toBe("50.00");
});

it("rounds half away from zero", () => {
  expect(roundTo(d(100.5), d(1)).toFixed(2)).toBe("101.00");
  expect(roundTo(d(101.25), d(0.5)).toFixed(2)).toBe("101.50");
  expect(roundTo(d(-2.5), d(1)).toFixed(2)).toBe("-3.00");
});

it("chains price lists and converts currencies", () => {
  const base: ListData = { id: "B", currency: "EUR", rules: [rule({ fixedPrice: d(4) })] };
  const main = list([rule({ computePrice: "FORMULA", base: "PRICE_LIST", basePriceListId: "B", priceDiscount: d(10) })]);
  expect(price(ctx([main, base])).price.toFixed(2)).toBe("90.00");
  const eur = list([], { currency: "EUR" });
  expect(price(ctx([eur])).price.toFixed(2)).toBe("4.00");
});

it("throws on a missing rate, a missing list and a loop", () => {
  expect(() => price(ctx([list([], { currency: "USD" })]))).toThrow(MissingRateError);
  expect(() => price(ctx([]))).toThrow(PriceListNotFound);
  const a = list([rule({ computePrice: "FORMULA", base: "PRICE_LIST", basePriceListId: "B" })], { id: "A" });
  const b = list([rule({ computePrice: "FORMULA", base: "PRICE_LIST", basePriceListId: "A" })], { id: "B" });
  expect(() => price(ctx([a, b]), 1, undefined, "A")).toThrow(PriceListDepthExceeded);
});

it("exposes rule selection", () => {
  const rules = [rule({ id: "x", fixedPrice: d(1), minQuantity: d(5) })];
  expect(applicableRules(list(rules), product, ["c-child"], d(4), new Date("2026-06-01T00:00:00Z"))).toEqual([]);
});
