const db: Record<string, any> = {
  crm_Products: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  crm_ProductCategories: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  crm_PriceLists: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  crm_PriceListRules: { deleteMany: jest.fn(), createMany: jest.fn() },
};
db.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) => fn(db));
jest.mock("@/lib/prisma", () => ({ prismadb: db }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));

import { replaceExternalPriceList, upsertExternalCategory, upsertExternalProduct } from "@/lib/catalog/plugin-writes";

const product = { name: "Cup", sku: "800004", description: null, type: "PRODUCT" as const, status: "ACTIVE" as const, unit_price: "1.89", unit_cost: "0.9", currency: "CZK", tax_rate: "21", unit: "ks", categoryRef: "7" };
const key = (ref: string) => ({ source_externalRef: { source: "EXTERNAL", externalRef: ref } });

beforeEach(() => jest.clearAllMocks());

it("creates an EXTERNAL product with its category resolved by ref", async () => {
  db.crm_ProductCategories.findUnique.mockResolvedValue({ id: "cat-7" });
  db.crm_Products.findUnique.mockResolvedValue(null);
  db.crm_Products.findFirst.mockResolvedValue(null);
  db.crm_Products.create.mockResolvedValue({ id: "p1" });
  expect(await upsertExternalProduct("odoo", "332", product)).toEqual({ id: "p1", created: true });
  expect(db.crm_ProductCategories.findUnique).toHaveBeenCalledWith({ where: key("7") });
  expect(db.crm_Products.create.mock.calls[0][0].data).toMatchObject({ source: "EXTERNAL", externalRef: "332", sku: "800004", categoryId: "cat-7", unit_price: "1.89", createdBy: null });
});

it("updates the existing EXTERNAL product", async () => {
  db.crm_ProductCategories.findUnique.mockResolvedValue({ id: "cat-7" });
  db.crm_Products.findUnique.mockResolvedValue({ id: "p1", source: "EXTERNAL" });
  db.crm_Products.findFirst.mockResolvedValue(null);
  db.crm_Products.update.mockResolvedValue({ id: "p1" });
  expect(await upsertExternalProduct("odoo", "332", product)).toEqual({ id: "p1", created: false });
  expect(db.crm_Products.update.mock.calls[0][0].where).toEqual({ id: "p1" });
});

it("refuses an SKU used by a CRM product (Review Focus 3)", async () => {
  db.crm_ProductCategories.findUnique.mockResolvedValue({ id: "cat-7" });
  db.crm_Products.findUnique.mockResolvedValue(null);
  db.crm_Products.findFirst.mockResolvedValue({ id: "crm-1", source: "CRM" });
  await expect(upsertExternalProduct("odoo", "332", product)).rejects.toThrow("SKU used by a CRM product: 800004");
  expect(db.crm_Products.create).not.toHaveBeenCalled();
});

it("fails on an unknown category ref", async () => {
  db.crm_ProductCategories.findUnique.mockResolvedValue(null);
  await expect(upsertExternalProduct("odoo", "332", product)).rejects.toThrow("Unknown category ref: 7");
});

it("upserts a category with its parent", async () => {
  db.crm_ProductCategories.findUnique.mockImplementation(async ({ where }: any) => (where.source_externalRef.externalRef === "1" ? { id: "cat-1" } : null));
  db.crm_ProductCategories.create.mockResolvedValue({ id: "cat-2" });
  expect(await upsertExternalCategory("odoo", "2", { name: "Aroma", parentRef: "1" })).toEqual({ id: "cat-2" });
  expect(db.crm_ProductCategories.create.mock.calls[0][0].data).toMatchObject({ name: "Aroma", parentId: "cat-1", source: "EXTERNAL", externalRef: "2", createdBy: null });
});

const rule = { appliesTo: "PRODUCT" as const, productRef: "332", categoryRef: null, minQuantity: "1000", dateStart: null, dateEnd: null, computePrice: "FIXED" as const, fixedPrice: "1.51", percentPrice: null, base: "LIST_PRICE" as const, basePriceListRef: null, priceDiscount: "0", priceSurcharge: "0", priceRound: null, priceMinMargin: null, priceMaxMargin: null, externalRef: "1285" };

it("replaces a list and all its rules in one transaction", async () => {
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L1", source: "EXTERNAL" });
  db.crm_Products.findUnique.mockResolvedValue({ id: "p1", source: "EXTERNAL" });
  db.crm_PriceLists.update.mockResolvedValue({ id: "L1" });
  expect(await replaceExternalPriceList("odoo", "245", { name: "Gold", currency: "CZK", isActive: true }, [rule])).toEqual({ id: "L1" });
  expect(db.$transaction).toHaveBeenCalledTimes(1);
  expect(db.crm_PriceListRules.deleteMany).toHaveBeenCalledWith({ where: { priceListId: "L1" } });
  expect(db.crm_PriceListRules.createMany.mock.calls[0][0].data[0]).toMatchObject({ priceListId: "L1", productId: "p1", appliesTo: "PRODUCT", minQuantity: "1000", fixedPrice: "1.51", externalRef: "1285" });
});

it("fails the whole replace on an unknown product ref, before writing", async () => {
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L1", source: "EXTERNAL" });
  db.crm_Products.findUnique.mockResolvedValue(null);
  await expect(replaceExternalPriceList("odoo", "245", { name: "Gold", currency: "CZK", isActive: true }, [rule])).rejects.toThrow("Unknown product ref: 332");
  expect(db.crm_PriceListRules.deleteMany).not.toHaveBeenCalled();
});

it("refuses a base list that is not EXTERNAL", async () => {
  // Ref 234 is not an EXTERNAL list (a CRM list can never be found by external ref).
  db.crm_PriceLists.findUnique.mockImplementation(async ({ where }: any) => (where.source_externalRef.externalRef === "245" ? { id: "L1", source: "EXTERNAL" } : null));
  const r = { ...rule, appliesTo: "ALL" as const, productRef: null, base: "PRICE_LIST" as const, basePriceListRef: "234" };
  await expect(replaceExternalPriceList("odoo", "245", { name: "Gold", currency: "CZK", isActive: true }, [r])).rejects.toThrow("Unknown base price list ref: 234");
  expect(db.crm_PriceListRules.deleteMany).not.toHaveBeenCalled();
});
