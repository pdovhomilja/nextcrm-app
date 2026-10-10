import type { ExternalRuleInput } from "@nextcrm/plugin-sdk";
import { odooPrice, pickSample, runCompare } from "../compare";
import { K, type CompareResult } from "../store";
import { mkCompare, now } from "./helpers";

const rule = (over: Partial<ExternalRuleInput>): ExternalRuleInput => ({ appliesTo: "ALL", productRef: null, categoryRef: null, minQuantity: "0", dateStart: null, dateEnd: null, computePrice: "FIXED", fixedPrice: "1",
  percentPrice: null, base: "LIST_PRICE", basePriceListRef: null, priceDiscount: "0", priceSurcharge: "0", priceRound: null, priceMinMargin: null, priceMaxMargin: null, externalRef: null, ...over });

it("samples product rules first, then category, base-list and no-rule products, with threshold quantities", () => {
  const products = [{ ref: "1", categoryRef: "7" }, { ref: "2", categoryRef: "8" }, { ref: "3", categoryRef: null }, { ref: "4", categoryRef: "9" }];
  const parents = new Map<string, string | null>([["7", null], ["8", "7"], ["9", null]]);
  const out = pickSample([rule({ appliesTo: "PRODUCT", productRef: "1", minQuantity: "1000" }), rule({ appliesTo: "CATEGORY", categoryRef: "7", minQuantity: "10" }), rule({ base: "PRICE_LIST", basePriceListRef: "234" })], products, parents, 3);
  expect(out).toEqual([{ ref: "1", quantities: [1, 1000, 999] }, { ref: "2", quantities: [1, 10, 9] }, { ref: "3", quantities: [1] }]);
});

it("is deterministic", () => {
  const products = [{ ref: "2", categoryRef: null }, { ref: "1", categoryRef: null }];
  expect(pickSample([], products, new Map())).toEqual(pickSample([], [...products].reverse(), new Map()));
});

it("asks Odoo for a line price through onchange and never creates a record", async () => {
  const { client, calls } = mkCompare({ price: 1.51 });
  expect(await odooPrice(client, { pricelistId: 245, currencyId: 9, productId: 500, quantity: 1000 })).toBe(1.51);
  expect(calls.map((c) => c.path)).toEqual(["/json/2/sale.order.line/onchange"]);
  expect(calls[0].body).toMatchObject({ values: { order_id: { id: false, pricelist_id: 245, currency_id: 9 }, product_id: 500, product_uom_qty: 1000 }, field_names: ["product_id"] });
});

it("stops with a clear message when Odoo cannot price over the API", async () => {
  const { ctx, client } = mkCompare({ price: undefined, priceLists: "245" });
  await runCompare(ctx, client, now);
  expect(await ctx.store.get<CompareResult>(K.compareLast)).toMatchObject({ ok: false, error: "Odoo cannot price sale lines over the API" });
});

it("finds a planted difference and labels rule versus rate", async () => {
  const { ctx, client } = mkCompare({ price: 1.51, crm: { "500:1000": { price: "1.67", currency: "CZK", ruleId: "r1" }, "501:1": { price: "0.08", currency: "EUR", ruleId: null } }, priceLists: "245" });
  await runCompare(ctx, client, now);
  const res = (await ctx.store.get<CompareResult>(K.compareLast))!;
  expect(res.ok).toBe(true);
  expect(res.mismatches).toEqual(expect.arrayContaining([
    expect.objectContaining({ quantity: 1000, crm: "1.67", odoo: "1.51", reason: "rule" }),
  ]));
  expect(res.lists[0]).toMatchObject({ odooId: 245, failed: expect.any(Number) });
});
