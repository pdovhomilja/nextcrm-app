import { cleanRule, createsCategoryCycle, createsListCycle, ruleProblems, type RuleFields } from "@/lib/pricing/validate";

const ok: RuleFields = { appliesTo: "ALL", computePrice: "FIXED", fixedPrice: 10 };

it("accepts a complete rule", () => expect(ruleProblems(ok, "L")).toEqual([]));

it("requires the target and compute fields", () => {
  expect(ruleProblems({ ...ok, appliesTo: "CATEGORY" }, "L")).toContain("categoryRequired");
  expect(ruleProblems({ ...ok, appliesTo: "PRODUCT" }, "L")).toContain("productRequired");
  expect(ruleProblems({ appliesTo: "ALL", computePrice: "FIXED" }, "L")).toContain("fixedPriceRequired");
  expect(ruleProblems({ appliesTo: "ALL", computePrice: "PERCENTAGE" }, "L")).toContain("percentRequired");
  expect(ruleProblems({ appliesTo: "ALL", computePrice: "PERCENTAGE", percentPrice: 101 }, "L")).toContain("percentRange");
  expect(ruleProblems({ appliesTo: "ALL", computePrice: "FORMULA", base: "PRICE_LIST" }, "L")).toContain("baseListRequired");
  expect(ruleProblems({ appliesTo: "ALL", computePrice: "FORMULA", base: "PRICE_LIST", basePriceListId: "L" }, "L")).toContain("baseListSelf");
});

it("checks ranges", () => {
  expect(ruleProblems({ ...ok, dateStart: new Date("2026-02-01"), dateEnd: new Date("2026-01-01") }, "L")).toContain("dateOrder");
  expect(ruleProblems({ ...ok, minQuantity: -1 }, "L")).toContain("minQuantityNegative");
  expect(ruleProblems({ appliesTo: "ALL", computePrice: "FORMULA", priceRound: 0 }, "L")).toContain("roundPositive");
  expect(ruleProblems({ appliesTo: "ALL", computePrice: "FORMULA", priceMinMargin: 5, priceMaxMargin: 1 }, "L")).toContain("marginOrder");
});

it("clears fields that don't apply (Review Focus 3)", () => {
  const c = cleanRule({ appliesTo: "ALL", computePrice: "FORMULA", fixedPrice: 10, percentPrice: 5, categoryId: "c", productId: "p", base: "COST", basePriceListId: "B", priceDiscount: 5 });
  expect([c.fixedPrice, c.percentPrice, c.categoryId, c.productId, c.basePriceListId]).toEqual([null, null, null, null, null]);
  expect(c.priceDiscount).toBe(5);
  const f = cleanRule({ appliesTo: "PRODUCT", productId: "p", computePrice: "FIXED", fixedPrice: 3, priceDiscount: 9, priceRound: 1 });
  expect([f.priceDiscount, f.priceRound, f.base, f.minQuantity]).toEqual([0, null, "LIST_PRICE", 0]);
});

it("detects price list cycles", () => {
  const edges = [{ priceListId: "B", basePriceListId: "C" }, { priceListId: "C", basePriceListId: "A" }];
  expect(createsListCycle("A", "B", edges)).toBe(true);
  expect(createsListCycle("D", "B", edges)).toBe(false);
});

it("detects category cycles", () => {
  const parents = new Map<string, string | null>([["child", "parent"], ["parent", null], ["grand", "child"]]);
  expect(createsCategoryCycle("parent", "grand", parents)).toBe(true);
  expect(createsCategoryCycle("parent", "parent", parents)).toBe(true);
  expect(createsCategoryCycle("other", "child", parents)).toBe(false);
});
