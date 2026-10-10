import { baseRefs, categoryOrder, mapRules, orderLists, variantFields, type OdooRule, type OdooVariant } from "../catalog-map";

const v = (over: Partial<OdooVariant> = {}): OdooVariant => ({ id: 332, display_name: "[800004] Cup (600 ml)", default_code: "800004", description_sale: false, type: "consu", active: true, sale_ok: true,
  lst_price: 1.89, standard_price: 0.9, currency_id: [9, "CZK"], taxes_id: [27], uom_id: [1, "ks"], categ_id: [7, "Cups"], product_tmpl_id: [899, "Cup"], write_date: "2026-10-10 08:00:00", ...over });
const tax = (ids: number[]) => (ids.length === 1 ? ({ 27: "21", 20: "12" } as Record<number, string>)[ids[0]] ?? null : null);

it("maps a variant to an external product", () => {
  expect(variantFields(v(), tax)).toEqual({ name: "[800004] Cup (600 ml)", sku: "800004", description: null, type: "PRODUCT", status: "ACTIVE", unit_price: "1.89", unit_cost: "0.9", currency: "CZK", tax_rate: "21", unit: "ks", categoryRef: "7" });
});

it("maps services, archived or unsellable variants, no or several taxes", () => {
  expect(variantFields(v({ type: "service" }), tax).type).toBe("SERVICE");
  expect(variantFields(v({ active: false }), tax).status).toBe("ARCHIVED");
  expect(variantFields(v({ sale_ok: false }), tax).status).toBe("ARCHIVED");
  expect(variantFields(v({ taxes_id: [] }), tax).tax_rate).toBeNull();
  expect(variantFields(v({ taxes_id: [27, 20] }), tax).tax_rate).toBeNull();
  expect(variantFields(v({ default_code: false, categ_id: false, uom_id: false }), tax)).toMatchObject({ sku: null, categoryRef: null, unit: null });
});

it("orders categories parents first", () => {
  const out = categoryOrder([{ id: 3, name: "Aroma", parent_id: [2, "Materiál"] }, { id: 2, name: "Materiál", parent_id: [1, "Zásoby"] }, { id: 1, name: "Zásoby", parent_id: false }]);
  expect(out.map((c) => c.id)).toEqual([1, 2, 3]);
});

const r = (over: Partial<OdooRule>): OdooRule => ({ id: 1, applied_on: "3_global", product_tmpl_id: false, product_id: false, categ_id: false, min_quantity: 0, date_start: false, date_end: false,
  compute_price: "fixed", fixed_price: 0, percent_price: 0, base: "list_price", base_pricelist_id: false, price_discount: 0, price_surcharge: 0, price_round: 0, price_min_margin: 0, price_max_margin: 0, ...over });

it("expands a template rule to one rule per known variant and drops unknown ones", () => {
  const { rules, skipped } = mapRules([r({ id: 1285, applied_on: "1_product", product_tmpl_id: [912, "Lid"], fixed_price: 1.51, min_quantity: 1000 })], () => [500, 501, 502], new Set(["500", "501"]));
  expect(rules).toEqual([
    expect.objectContaining({ appliesTo: "PRODUCT", productRef: "500", fixedPrice: "1.51", minQuantity: "1000", computePrice: "FIXED", base: "LIST_PRICE", externalRef: "1285:500" }),
    expect.objectContaining({ productRef: "501", externalRef: "1285:501" }),
  ]);
  expect(skipped).toEqual([]);
});

it("maps category, variant, global, percentage and base-list rules", () => {
  const { rules } = mapRules([
    r({ id: 1, applied_on: "2_product_category", categ_id: [7, "Cups"], compute_price: "percentage", percent_price: 10, base: "pricelist", base_pricelist_id: [234, "Base"] }),
    r({ id: 2, applied_on: "0_product_variant", product_id: [500, "Lid"], fixed_price: 2 }),
    r({ id: 3, compute_price: "formula", base: "standard_price", price_markup: 30, price_surcharge: 5, price_round: 1 }),
  ], () => [], new Set(["500"]));
  expect(rules[0]).toMatchObject({ appliesTo: "CATEGORY", categoryRef: "7", computePrice: "PERCENTAGE", percentPrice: "10", base: "PRICE_LIST", basePriceListRef: "234", externalRef: "1" });
  expect(rules[1]).toMatchObject({ appliesTo: "PRODUCT", productRef: "500", fixedPrice: "2" });
  expect(rules[2]).toMatchObject({ appliesTo: "ALL", computePrice: "FORMULA", base: "COST", priceDiscount: "-30", priceSurcharge: "5", priceRound: "1" });
});

it("skips rules core cannot represent, with a reason", () => {
  const { rules, skipped } = mapRules([r({ id: 9, applied_on: "4_combo" }), r({ id: 10, base: "foo" })], () => [], new Set());
  expect(rules).toEqual([]);
  expect(skipped).toEqual([{ ruleId: 9, reason: "applied_on 4_combo" }, { ruleId: 10, reason: "base foo" }]);
});

it("lists base lists and orders lists bases first; a cycle is reported (Review Focus 2)", () => {
  expect(baseRefs([r({ base: "pricelist", base_pricelist_id: [234, "A"] }), r({ base: "list_price" })])).toEqual([234]);
  expect(orderLists(new Map([[245, [234]], [234, [233]], [233, []]]))).toEqual({ order: [233, 234, 245], cyclic: [] });
  expect(orderLists(new Map([[1, [2]], [2, [1]], [3, []]]))).toEqual({ order: [3], cyclic: [1, 2] });
});
