import { mapRules, orderLists, type OdooRule } from "../catalog-map";
import { runCompare } from "../compare";
import { runSync } from "../sync";
import { K, type CompareResult } from "../store";
import { company, mkCatalog, mkCompare, now, type FakeCatalog } from "./helpers";

const later = (min: number) => new Date(now.getTime() + min * 60_000);
const M2 = (id: number, name: string) => [id, name] as [number, string];
const variant = (id: number, tmpl: number) => ({ id, display_name: `P${id}`, default_code: `S${id}`, description_sale: false as const, type: "consu", active: true, sale_ok: true, lst_price: 10,
  standard_price: 5, currency_id: M2(9, "CZK"), taxes_id: [], uom_id: M2(1, "ks"), categ_id: false as const, product_tmpl_id: M2(tmpl, `T${tmpl}`), write_date: "2026-10-10 08:00:00" });
const cat = (): FakeCatalog => ({
  categories: [], taxes: [], variants: [variant(500, 912), variant(501, 913)],
  lists: [
    { id: 234, name: "Base", currency_id: M2(9, "CZK"), active: false, write_date: "2026-10-10 08:00:00" },
    { id: 245, name: "Gold", currency_id: M2(9, "CZK"), active: true, write_date: "2026-10-10 08:00:00" },
  ],
  items: [
    { id: 1, pricelist_id: M2(234, "Base"), applied_on: "3_global", compute_price: "percentage", percent_price: 10, base: "list_price", write_date: "2026-10-10 08:00:00" },
    { id: 2, pricelist_id: M2(245, "Gold"), applied_on: "3_global", compute_price: "percentage", percent_price: 0, base: "pricelist", base_pricelist_id: M2(234, "Base"), write_date: "2026-10-10 08:00:00" },
  ],
});

it("fills the price list of accounts linked before the upgrade (review I1)", async () => {
  const { ctx, client, data } = mkCatalog([company(1, { property_product_pricelist: M2(245, "Gold") })], cat(), { priceLists: "245" });
  await runSync(ctx, client, now);
  const key = K.account(data.accounts[0].id as string);
  const { odooPriceList: _drop, ...old } = (await ctx.store.get<Record<string, unknown>>(key))!;
  await ctx.store.set(key, old);                                   // a link written by part 1 (no odooPriceList)
  data.accounts[0].pricelist_id = undefined;
  await ctx.store.set(K.cursor, { at: "2026-10-13 07:00:00" });   // the customer has not changed in Odoo since
  await runSync(ctx, client, later(20));
  expect(data.accounts[0].pricelist_id).toBe(data.priceLists.find((l) => l.externalRef === "245")!.id);
});

it("deactivates a list removed from the setting and stops assigning it (review I2)", async () => {
  const s = { priceLists: "245" };
  const { ctx, client, data } = mkCatalog([company(1)], cat(), s);
  await runSync(ctx, client, now);
  (ctx.settings as { priceLists: string }).priceLists = "";
  await runSync(ctx, client, later(20));
  expect(data.priceLists.find((l) => l.externalRef === "245")).toMatchObject({ isActive: false });
});

it("activates a base list once it is chosen (review I2)", async () => {
  const c = cat();
  c.lists[0].active = true;                                        // a base list that is also a normal list in Odoo
  const { ctx, client, data } = mkCatalog([company(1)], c, { priceLists: "245" });
  await runSync(ctx, client, now);
  expect(data.priceLists.find((l) => l.externalRef === "234")).toMatchObject({ isActive: false });
  (ctx.settings as { priceLists: string }).priceLists = "245, 234";
  await runSync(ctx, client, later(20));
  expect(data.priceLists.find((l) => l.externalRef === "234")).toMatchObject({ isActive: true });
});

it("skips a list whose base list cannot be read, and the run still succeeds (review M1)", async () => {
  const c = cat();
  c.lists.splice(0, 1);                                            // base 234 hidden from the API user
  const { ctx, client, data } = mkCatalog([company(1)], c, { priceLists: "245" });
  expect(await runSync(ctx, client, now)).toMatchObject({ ok: true });
  expect(data.priceLists).toEqual([]);
  expect(ctx.logs.some((l) => l.message.includes("Price list 245 skipped: base list 234 is not available"))).toBe(true);
});

it("skips lists whose base chain is longer than the CRM can price (review I5, Review Focus 2)", () => {
  const deps = new Map<number, number[]>(Array.from({ length: 13 }, (_, i) => [i + 1, i < 12 ? [i + 2] : []]));
  const out = orderLists(deps, 11);
  expect(out.tooDeep).toEqual([1, 2]);
  expect(out.order).toEqual([13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3]);
});

const r = (over: Partial<OdooRule>): OdooRule => ({ id: 1, applied_on: "3_global", product_tmpl_id: false, product_id: false, categ_id: false, min_quantity: 0, date_start: false, date_end: false,
  compute_price: "fixed", fixed_price: 0, percent_price: 0, base: "list_price", base_pricelist_id: false, price_discount: 0, price_surcharge: 0, price_round: 0, price_min_margin: 0, price_max_margin: 0, ...over });

it("orders mapped rules by Odoo id so ties resolve like Odoo, and flags variant-vs-template overlap (review I4)", () => {
  const { rules, skipped } = mapRules([
    r({ id: 30, applied_on: "1_product", product_tmpl_id: M2(912, "T"), min_quantity: 10 }),
    r({ id: 7, applied_on: "0_product_variant", product_id: M2(500, "V"), min_quantity: 1 }),
    r({ id: 12, applied_on: "3_global" }),
  ], () => [500], new Set(["500"]));
  expect(rules.map((x) => x.externalRef)).toEqual(["7", "12", "30:500"]);
  expect(skipped).toEqual([{ ruleId: 30, reason: "variant rule 7 on the same product: the CRM may pick a different rule than Odoo" }]);
});

it("reads Odoo rule dates as UTC (review M6)", () => {
  const { rules } = mapRules([r({ id: 1, date_start: "2026-11-01 00:00:00", date_end: "2026-11-30 22:59:59" })], () => [], new Set());
  expect(rules[0]).toMatchObject({ dateStart: "2026-11-01T00:00:00Z", dateEnd: "2026-11-30T22:59:59Z" });
});

it("records a price that cannot be computed as a difference and finishes the compare (review I3)", async () => {
  const { ctx, client } = mkCompare({ price: 1.51, crm: { "501:1": new Error("Missing exchange rate CZK → EUR") } });
  await runCompare(ctx, client, now);
  const res = (await ctx.store.get<CompareResult>(K.compareLast))!;
  expect(res.ok).toBe(true);
  expect(res.mismatches).toEqual([expect.objectContaining({ product: "Straw", quantity: 1, crm: "", reason: "rate", error: "Missing exchange rate CZK → EUR" })]);
  expect(await ctx.store.get(K.compareProgress)).toEqual({ done: 1, total: 1 });
});

it("labels a list-price rule across currencies as a rate difference (review I3)", async () => {
  const { ctx, client } = mkCompare({ price: 1.51, productCurrency: "EUR", crm: { "501:1": { price: "1.60", currency: "CZK", ruleId: "r9", ruleBase: "LIST_PRICE" } } });
  await runCompare(ctx, client, now);
  expect((await ctx.store.get<CompareResult>(K.compareLast))!.mismatches).toEqual([expect.objectContaining({ product: "Straw", reason: "rate" })]);
});
