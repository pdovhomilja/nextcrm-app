const writes = {
  upsertExternalProduct: jest.fn().mockResolvedValue({ id: "p1", created: true }),
  upsertExternalCategory: jest.fn().mockResolvedValue({ id: "c1" }),
  replaceExternalPriceList: jest.fn().mockResolvedValue({ id: "L1" }),
  findExternalProducts: jest.fn().mockResolvedValue([]),
  findExternalPriceLists: jest.fn().mockResolvedValue([]),
};
jest.mock("@/lib/catalog/plugin-writes", () => writes);
const getPrice = jest.fn();
jest.mock("@/lib/pricing/get-price", () => ({ getPrice: (...a: unknown[]) => getPrice(...a) }));
jest.mock("@/lib/prisma", () => ({ prismadb: {} }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn().mockResolvedValue(undefined) } }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));

import { Decimal } from "decimal.js";
import { SDK_VERSION, definePlugin } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { createDataApi } from "@/lib/plugins/data-api";

const f = { name: "Cup", sku: "S1", description: null, type: "PRODUCT" as const, status: "ACTIVE" as const, unit_price: "1", unit_cost: null, currency: "CZK", tax_rate: null, unit: null, categoryRef: null };

it("is SDK 0.2.3 (additive)", () => expect(SDK_VERSION).toBe("0.2.3"));

it("needs products:write for external product and category upserts", async () => {
  await expect(createDataApi("demo", ["products:read"]).products.upsertExternal("1", f)).rejects.toThrow("products:write");
  await createDataApi("demo", ["products:write"]).products.upsertExternal("1", f);
  expect(writes.upsertExternalProduct).toHaveBeenCalledWith("demo", "1", f);
  await createDataApi("demo", ["products:write"]).productCategories.upsertExternal("7", { name: "Tea", parentRef: null });
  expect(writes.upsertExternalCategory).toHaveBeenCalledWith("demo", "7", { name: "Tea", parentRef: null });
});

it("needs priceLists:write to replace and priceLists:read to list", async () => {
  await expect(createDataApi("demo", ["priceLists:read"]).priceLists.replaceExternal("245", { name: "G", currency: "CZK", isActive: true }, [])).rejects.toThrow("priceLists:write");
  await expect(createDataApi("demo", []).priceLists.findExternal()).rejects.toThrow("priceLists:read");
  await createDataApi("demo", ["priceLists:write"]).priceLists.replaceExternal("245", { name: "G", currency: "CZK", isActive: true }, []);
  expect(writes.replaceExternalPriceList).toHaveBeenCalledWith("demo", "245", { name: "G", currency: "CZK", isActive: true }, []);
});

it("prices a product through core getPrice with products:read, decimals as strings", async () => {
  getPrice.mockResolvedValue({ price: new Decimal("1.51"), currency: "CZK", ruleId: "r1", listPrice: new Decimal("1.67"), steps: [] });
  const out = await createDataApi("demo", ["products:read"]).prices.get({ priceListId: "L1", productId: "p1", quantity: "1000" });
  expect(out).toEqual({ price: "1.51", currency: "CZK", ruleId: "r1" });
  expect(getPrice).toHaveBeenCalledWith({ priceListId: "L1", productId: "p1", quantity: "1000" });
  await expect(createDataApi("demo", []).prices.get({ priceListId: "L1", productId: "p1", quantity: "1" })).rejects.toThrow("products:read");
});

it("registers product panels", () => {
  const def = definePlugin({ id: "demo", name: "D", version: "1.0.0", sdk: "^0.2.3", description: "", permissions: [],
    extensions: (x) => x.productPanel({ id: "p", component: () => null }) });
  expect(def.extensions.productPanels).toEqual([expect.objectContaining({ id: "p", roles: ["user", "manager", "admin"] })]);
});

it("gives plugin tests an in-memory catalog", async () => {
  const products: Record<string, unknown>[] = [];
  const ctx = createTestContext({ data: { products }, prices: async () => ({ price: "2", currency: "CZK", ruleId: null }) });
  expect(await ctx.data.products.upsertExternal("332", f)).toMatchObject({ created: true });
  expect(await ctx.data.products.upsertExternal("332", { ...f, name: "Cup 2" })).toMatchObject({ created: false });
  expect(products).toEqual([expect.objectContaining({ source: "EXTERNAL", externalRef: "332", name: "Cup 2" })]);
  await ctx.data.productCategories.upsertExternal("7", { name: "Tea", parentRef: null });
  const { id } = await ctx.data.priceLists.replaceExternal("245", { name: "G", currency: "CZK", isActive: true }, []);
  expect(await ctx.data.priceLists.findExternal()).toEqual([expect.objectContaining({ id, ref: "245", isActive: true })]);
  expect(await ctx.data.prices.get({ priceListId: id, productId: "x", quantity: "1" })).toEqual({ price: "2", currency: "CZK", ruleId: null });
});
