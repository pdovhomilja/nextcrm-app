import { runSync } from "../sync";
import { K } from "../store";
import { company, mkCatalog, now } from "./helpers";

const later = (min: number) => new Date(now.getTime() + min * 60_000);
const cat = () => ({
  categories: [{ id: 1, name: "Zásoby", parent_id: false as const }, { id: 7, name: "Cups", parent_id: [1, "Zásoby"] as [number, string] }],
  variants: [
    { id: 500, display_name: "[800017] Lid", default_code: "800017", description_sale: false as const, type: "consu", active: true, sale_ok: true, lst_price: 1.67, standard_price: 1, currency_id: [9, "CZK"] as [number, string], taxes_id: [27], uom_id: [1, "ks"] as [number, string], categ_id: [7, "Cups"] as [number, string], product_tmpl_id: [912, "Lid"] as [number, string], write_date: "2026-10-10 08:00:00" },
    { id: 501, display_name: "[800018] Straw", default_code: "800018", description_sale: false as const, type: "consu", active: true, sale_ok: true, lst_price: 2, standard_price: 1, currency_id: [9, "CZK"] as [number, string], taxes_id: [27], uom_id: [1, "ks"] as [number, string], categ_id: [7, "Cups"] as [number, string], product_tmpl_id: [913, "Straw"] as [number, string], write_date: "2026-10-10 08:00:00" },
  ],
  lists: [
    { id: 234, name: "Base CZK", currency_id: [9, "CZK"] as [number, string], active: false, write_date: "2026-10-10 08:00:00" },
    { id: 245, name: "Gold CZK", currency_id: [9, "CZK"] as [number, string], active: true, write_date: "2026-10-10 08:00:00" },
  ],
  items: [
    { id: 1, pricelist_id: [234, "Base CZK"] as [number, string], applied_on: "2_product_category", categ_id: [7, "Cups"] as [number, string], compute_price: "percentage", percent_price: 10, base: "list_price", write_date: "2026-10-10 08:00:00" },
    { id: 1285, pricelist_id: [245, "Gold CZK"] as [number, string], applied_on: "1_product", product_tmpl_id: [912, "Lid"] as [number, string], compute_price: "fixed", fixed_price: 1.51, min_quantity: 1000, base: "list_price", write_date: "2026-10-10 08:00:00" },
    { id: 1290, pricelist_id: [245, "Gold CZK"] as [number, string], applied_on: "3_global", compute_price: "percentage", percent_price: 0, base: "pricelist", base_pricelist_id: [234, "Base CZK"] as [number, string], write_date: "2026-10-10 08:00:00" },
  ],
  taxes: [{ id: 27, amount: 21, amount_type: "percent" }],
});

it("imports categories, products, the chosen list and its archived base, and the account's list", async () => {
  const c = cat();
  const { ctx, client, data } = mkCatalog([company(1, { property_product_pricelist: [245, "Gold CZK"] })], c, { priceLists: "245" });
  const s = await runSync(ctx, client, now);
  expect(s).toMatchObject({ ok: true, catalog: { categories: 2, productsCreated: 2, listsReplaced: 2, accountLists: 1 } });
  expect(data.productCategories.map((x) => x.externalRef)).toEqual(["1", "7"]);
  expect(data.products.map((x) => x.sku)).toEqual(["800017", "800018"]);
  expect(data.priceLists).toEqual([expect.objectContaining({ externalRef: "234", isActive: false }), expect.objectContaining({ externalRef: "245", isActive: true })]);
  expect(data.priceListRules.filter((x) => x.priceListId === data.priceLists[1].id).map((x) => x.externalRef)).toEqual(["1285:500", "1290"]);
  expect(data.accounts[0].pricelist_id).toBe(data.priceLists[1].id);
});

it("updates a changed product and drops a rule deleted in Odoo", async () => {
  const c = cat();
  const { ctx, client, data } = mkCatalog([company(1)], c, { priceLists: "245" });
  await runSync(ctx, client, now);
  Object.assign(c.variants[0], { lst_price: 1.7, write_date: "2026-10-13 07:59:00" });
  c.items.splice(1, 1);   // rule 1285 deleted in Odoo
  await runSync(ctx, client, later(20));
  expect(data.products[0].unit_price).toBe("1.7");
  expect(data.priceListRules.filter((x) => x.priceListId === data.priceLists[1].id).map((x) => x.externalRef)).toEqual(["1290"]);
});

it("does not replace unchanged lists on the next run", async () => {
  const { ctx, client } = mkCatalog([company(1)], cat(), { priceLists: "245" });
  await runSync(ctx, client, now);
  const s = await runSync(ctx, client, later(20));
  expect(s.catalog).toMatchObject({ productsCreated: 0, listsReplaced: 0 });
});

it("archives a variant that is no longer sellable", async () => {
  const c = cat();
  const { ctx, client, data } = mkCatalog([company(1)], c, { priceLists: "245" });
  await runSync(ctx, client, now);
  Object.assign(c.variants[1], { sale_ok: false, write_date: "2026-10-13 07:59:00" });
  await runSync(ctx, client, later(20));
  expect(data.products[1].status).toBe("ARCHIVED");
});

it("writes nothing in a dry run, including account lists and the catalog cursor (Review Focus 5)", async () => {
  const { ctx, client, data } = mkCatalog([company(1, { property_product_pricelist: [245, "Gold CZK"] })], cat(), { priceLists: "245", dryRun: true });
  const s = await runSync(ctx, client, now);
  expect(s.catalog).toMatchObject({ productsCreated: 2, listsReplaced: 2 });
  expect(data.products).toEqual([]);
  expect(data.priceLists).toEqual([]);
  expect(await ctx.store.get(K.catalogCursor)).toBeNull();
});

it("logs a chosen list that does not exist in Odoo and imports the others (Review Focus 1)", async () => {
  const { ctx, client, data } = mkCatalog([company(1)], cat(), { priceLists: "245, 999" });
  const s = await runSync(ctx, client, now);
  expect(s).toMatchObject({ ok: true, catalog: { listsMissing: [999] } });
  expect(data.priceLists).toHaveLength(2);
  expect(ctx.logs.some((l) => l.message.includes("Odoo price list 999 not found"))).toBe(true);
});

it("fails one product whose SKU a CRM product uses, imports the rest, retries it (Review Focus 3)", async () => {
  const { ctx, client, data } = mkCatalog([company(1)], cat(), { priceLists: "" });
  data.products.push({ id: "crm-1", source: "CRM", sku: "800017", deletedAt: null });
  const upsert = ctx.data.products.upsertExternal.bind(ctx.data.products);
  (ctx.data.products as { upsertExternal: unknown }).upsertExternal = async (ref: string, f: { sku: string | null }) => {
    if (f.sku === "800017") throw new Error("SKU used by a CRM product: 800017");
    return upsert(ref, f as never);
  };
  const s = await runSync(ctx, client, now);
  expect(s.catalog).toMatchObject({ productsCreated: 1, productsFailed: 1 });
  expect(await ctx.store.get(K.retryProduct(500))).not.toBeNull();
  expect(ctx.logs.some((l) => l.message.includes("SKU used by a CRM product: 800017"))).toBe(true);
});

it("keeps an account's list when the customer's Odoo list is not imported", async () => {
  const { ctx, client, data } = mkCatalog([company(1, { property_product_pricelist: [250, "Other"] })], cat(), { priceLists: "245" });
  await runSync(ctx, client, now);
  expect(data.accounts[0].pricelist_id).toBeUndefined();
  expect((await ctx.store.get<{ odooPriceList: unknown }>(K.account(data.accounts[0].id as string)))?.odooPriceList).toEqual([250, "Other"]);
});
