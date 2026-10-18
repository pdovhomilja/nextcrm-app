import { categoryPaths, mapRules } from "../catalog-map";
import { syncCatalog } from "../catalog";
import { K } from "../store";
import type { OxoRule } from "../oxo";
import { product } from "./fake-oxo";
import { mk, now } from "./helpers";

const cat = (ref: string, name: string, parentRef: string | null) => ({ id: `c${ref}`, source: "EXTERNAL", externalRef: ref, name, parentRef });
const rule = (id: number, over: Partial<OxoRule> = {}): OxoRule => ({ id, odooId: null, appliesTo: "ALL", productId: null, productTemplateOdooId: null, categoryName: null, minQty: "0", kind: "PERCENT", fixedPrice: null, percent: "10", base: "LIST_PRICE", basePriceListId: null, ...over });

describe("category paths", () => {
  it("builds full paths from names and parent refs; a parent loop ends the path", () => {
    const paths = categoryPaths([{ id: "1", ref: "1", name: "Zásoby", parentRef: null }, { id: "2", ref: "2", name: "Výrobky", parentRef: "1" }, { id: "9", ref: "9", name: "Loop", parentRef: "9" }]);
    expect(Array.from(paths)).toEqual([["Zásoby", "1"], ["Zásoby / Výrobky", "2"], ["Loop", "9"]]);
  });
});

describe("rules", () => {
  it("maps fixed and percent rules, expands template rules to their variants, orders Odoo rules oldest first and native ones last", () => {
    const { rules, skipped } = mapRules([
      rule(5, { odooId: 1300, appliesTo: "PRODUCT", productTemplateOdooId: 412, kind: "FIXED", fixedPrice: "2.35", percent: null, minQty: "500" }),
      rule(4, { odooId: 1285, appliesTo: "CATEGORY", categoryName: "Zásoby / Výrobky", kind: "FIXED", fixedPrice: "757.76", percent: null, minQty: "6" }),
      rule(6, { appliesTo: "ALL", base: "PRICE_LIST", basePriceListId: 3 }),
      rule(7, { appliesTo: "CATEGORY", categoryName: "Nope" }),
      rule(8, { appliesTo: "PRODUCT", productId: 99 }),
    ], new Map([[11, "537"]]), new Map([[412, ["537", "538"]]]), (p) => (p === "Zásoby / Výrobky" ? "2" : null), (id) => (id === 3 ? "242" : null));
    expect(rules.map((r) => [r.externalRef, r.appliesTo, r.productRef, r.categoryRef, r.computePrice, r.fixedPrice, r.percentPrice, r.base, r.basePriceListRef, r.minQuantity])).toEqual([
      ["1285", "CATEGORY", null, "2", "FIXED", "757.76", null, "LIST_PRICE", null, "6"],
      ["1300:537", "PRODUCT", "537", null, "FIXED", "2.35", null, "LIST_PRICE", null, "500"],
      ["1300:538", "PRODUCT", "538", null, "FIXED", "2.35", null, "LIST_PRICE", null, "500"],
      ["oxo:6", "ALL", null, null, "PERCENTAGE", null, "10", "PRICE_LIST", "242", "0"],
    ]);
    expect(skipped).toEqual([{ ruleId: 7, reason: "category Nope not in the CRM" }]);
  });
});

describe("catalog sync", () => {
  it("takes over products by Odoo id and keeps tax, cost and description; links categories by path; creates missing paths under their parent", async () => {
    const { ctx, client, data } = mk({ products: [
      product(11, { odooId: 537, odooTemplateId: 412, code: "533002", name: "K ČKS Jahoda", category: "Zásoby / Výrobky", listPrice: "900" }),
      product(12, { code: "NEW1", name: "Native", category: "Zásoby / Výrobky / Nové" }),
    ] }, {
      productCategories: [cat("1", "Zásoby", null), cat("2", "Výrobky", "1")],
      products: [{ id: "p537", source: "EXTERNAL", externalRef: "537", name: "[533002] K ČKS Jahoda", sku: "533002", tax_rate: 12, unit_cost: 310, description: "Jahodový koncentrát", deletedAt: null }],
    });
    const { counts } = await syncCatalog({ ctx, client, dry: false, now });
    expect([counts.productsUpdated, counts.productsCreated, counts.categoriesMatched, counts.categoriesCreated]).toEqual([1, 1, 1, 1]);
    expect(data.products[0]).toMatchObject({ id: "p537", name: "K ČKS Jahoda", tax_rate: "12", unit_cost: "310", description: "Jahodový koncentrát", unit_price: "900", status: "ACTIVE", categoryRef: "2" });
    expect(data.products).toHaveLength(2);
    expect(data.productCategories.find((c) => c.externalRef === "oxo-cat:Zásoby / Výrobky / Nové")).toMatchObject({ name: "Nové", parentRef: "2" });
    expect(await ctx.store.get(K.product("p537"))).toEqual({ oxoId: 11, ref: "537", templateId: 412, categoryRef: "2" });
  });

  it("brings in new products only when sellable and active; a known product keeps getting updates when it stops being sellable", async () => {
    const { ctx, client, data } = mk({ products: [product(1, { saleOk: false }), product(2, { active: false }), product(3, { odooId: 700, saleOk: false })] },
      { products: [{ id: "p700", source: "EXTERNAL", externalRef: "700", name: "Old", deletedAt: null }] });
    const { counts } = await syncCatalog({ ctx, client, dry: false, now });
    expect([counts.productsCreated, counts.productsUpdated]).toEqual([0, 1]);
    expect(data.products.map((p) => [p.externalRef, p.status])).toEqual([["700", "ARCHIVED"]]);
  });

  it("an unchanged product is not written again", async () => {
    const { ctx, client } = mk({ products: [product(1)] });
    await syncCatalog({ ctx, client, dry: false, now });
    const { counts } = await syncCatalog({ ctx, client, dry: false, now });
    expect([counts.productsCreated, counts.productsUpdated]).toEqual([0, 0]);
  });

  it("replaces chosen lists and their bases (bases first) only when they change; deactivates a list removed from the setting; sets account lists", async () => {
    const lists = [
      { id: 3, odooId: 242, name: "Retail_STARTER", currency: "CZK", rules: [rule(1, { odooId: 1285, appliesTo: "CATEGORY", categoryName: "Zásoby / Výrobky", kind: "FIXED", fixedPrice: "757.76", percent: null })] },
      { id: 4, odooId: null, name: "Wholesale", currency: "CZK", rules: [rule(2, { base: "PRICE_LIST", basePriceListId: 3 })] },
    ];
    const { ctx, client, data } = mk({ lists, products: [product(1)] }, { accounts: [{ id: "a1", pricelist_id: null, deletedAt: null }], productCategories: [cat("1", "Zásoby", null), cat("2", "Výrobky", "1")] }, { priceLists: "4" });
    await ctx.store.set(K.account("a1"), { customerId: 9, syncedAt: "x", priceListId: 4, addresses: [] });
    let { counts } = await syncCatalog({ ctx, client, dry: false, now });
    expect(counts.listsReplaced).toBe(2);
    expect(data.priceLists.map((l) => [l.externalRef, l.isActive])).toEqual([["242", false], ["oxo:4", true]]);
    expect(data.priceListRules.find((r) => r.priceListId === data.priceLists[1].id)).toMatchObject({ base: "PRICE_LIST", basePriceListRef: "242" });
    expect(data.accounts[0].pricelist_id).toBe(data.priceLists[1].id);
    ({ counts } = await syncCatalog({ ctx, client, dry: false, now }));
    expect(counts.listsReplaced).toBe(0);
    ctx.settings.priceLists = "";
    ({ counts } = await syncCatalog({ ctx, client, dry: false, now }));
    expect(data.priceLists.map((l) => l.isActive)).toEqual([false, false]);
  });

  it("reports a chosen list OXO ERP does not have", async () => {
    const { ctx, client } = mk({}, {}, { priceLists: "77" });
    expect((await syncCatalog({ ctx, client, dry: false, now })).counts.listsMissing).toEqual([77]);
  });

  it("dry run counts and writes nothing", async () => {
    const { ctx, client, data } = mk({ products: [product(1, { category: "A / B" })], lists: [{ id: 3, odooId: null, name: "L", currency: "CZK", rules: [] }] }, {}, { priceLists: "3" });
    const before = JSON.stringify(data);
    const { counts } = await syncCatalog({ ctx, client, dry: true, now });
    expect([counts.productsCreated, counts.categoriesCreated, counts.listsReplaced]).toEqual([1, 2, 1]);
    expect(JSON.stringify(data)).toBe(before);
    expect(await ctx.store.list("")).toEqual([]);
  });

  it("a failed product write is counted and retried next run", async () => {
    const { ctx, client, data } = mk({ products: [product(1, { code: "DUP" })] }, { products: [{ id: "crm1", source: "EXTERNAL", externalRef: "999", sku: "DUP", deletedAt: null }] });
    let { counts } = await syncCatalog({ ctx, client, dry: false, now });
    expect([counts.productsFailed, (await ctx.store.get<{ product: { id: number } }>(K.retryProduct(1)))?.product.id]).toEqual([1, 1]);
    data.products[0].sku = "OTHER";
    await ctx.store.set(K.cursor("products"), { at: "2026-10-19T00:00:00.000Z" });
    ({ counts } = await syncCatalog({ ctx, client, dry: false, now }));
    expect([counts.productsCreated, await ctx.store.get(K.retryProduct(1))]).toEqual([1, null]);
  });
});
