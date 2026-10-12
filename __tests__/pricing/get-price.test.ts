const db = {
  crm_Products: { findFirst: jest.fn() },
  crm_ProductCategories: { findUnique: jest.fn() },
  crm_PriceLists: { findUnique: jest.fn() },
  exchangeRate: { findMany: jest.fn() },
  crm_Accounts: { findFirst: jest.fn() },
  crm_SystemSettings: { findUnique: jest.fn() },
};
jest.mock("@/lib/prisma", () => ({ prismadb: db }));

import { getPrice, rateLookup, resolvePriceListId } from "@/lib/pricing/get-price";
import { MissingRateError, ProductNotFound } from "@/lib/pricing/errors";

const rule = (over: Record<string, unknown>) => ({
  id: "r", appliesTo: "ALL", categoryId: null, productId: null, minQuantity: "0", dateStart: null, dateEnd: null,
  computePrice: "FIXED", fixedPrice: null, percentPrice: null, base: "LIST_PRICE", basePriceListId: null,
  priceDiscount: "0", priceSurcharge: "0", priceRound: null, priceMinMargin: null, priceMaxMargin: null,
  createdAt: new Date("2026-01-01T00:00:00Z"), ...over,
});

beforeEach(() => {
  jest.resetAllMocks();
  db.crm_Products.findFirst.mockResolvedValue({ id: "p1", unit_price: "100", unit_cost: "60", currency: "CZK", categoryId: "c-child" });
  db.crm_ProductCategories.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
    ({ "c-child": { parentId: "c-parent" }, "c-parent": { parentId: null } } as Record<string, { parentId: string | null }>)[where.id] ?? null);
  db.exchangeRate.findMany.mockResolvedValue([{ fromCurrency: "EUR", toCurrency: "CZK", rate: "25" }]);
});

it("loads the category chain and chained lists", async () => {
  db.crm_PriceLists.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({
    L: { id: "L", currency: "CZK", rules: [rule({ computePrice: "FORMULA", base: "PRICE_LIST", basePriceListId: "B", priceDiscount: "10" })] },
    B: { id: "B", currency: "CZK", rules: [rule({ appliesTo: "CATEGORY", categoryId: "c-parent", fixedPrice: "70" })] },
  } as Record<string, unknown>)[where.id] ?? null);
  const r = await getPrice({ priceListId: "L", productId: "p1", quantity: 1, date: new Date("2026-06-01T00:00:00Z") });
  expect(r.price.toFixed(2)).toBe("63.00");
});

it("uses the inverse rate when only the other direction is stored (Review Focus 1)", async () => {
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L", currency: "EUR", rules: [] });
  const r = await getPrice({ priceListId: "L", productId: "p1", quantity: 1 });
  expect(r.price.toFixed(2)).toBe("4.00");
  expect(r.currency).toBe("EUR");
});

it("returns the product price without a list", async () => {
  const r = await getPrice({ priceListId: null, productId: "p1", quantity: 3 });
  expect([r.price.toFixed(2), r.currency, r.ruleId]).toEqual(["100.00", "CZK", null]);
});

it("refuses deleted or unknown products", async () => {
  db.crm_Products.findFirst.mockResolvedValue(null);
  await expect(getPrice({ priceListId: null, productId: "x", quantity: 1 })).rejects.toBeInstanceOf(ProductNotFound);
});

it("stops walking a looping category tree", async () => {
  db.crm_ProductCategories.findUnique.mockResolvedValue({ parentId: "c-child" });
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L", currency: "CZK", rules: [] });
  await expect(getPrice({ priceListId: "L", productId: "p1", quantity: 1 })).resolves.toBeDefined();
});

it("looks up rates direct, inverse, or throws", () => {
  const rate = rateLookup([{ fromCurrency: "EUR", toCurrency: "CZK", rate: "25" }]);
  expect(rate("CZK", "CZK").toString()).toBe("1");
  expect(rate("EUR", "CZK").toString()).toBe("25");
  expect(rate("CZK", "EUR").toFixed(2)).toBe("0.04");
  expect(() => rate("USD", "CZK")).toThrow(MissingRateError);
});

it("resolves account list, then default list, then null", async () => {
  db.crm_Accounts.findFirst.mockResolvedValueOnce({ pricelist_id: "A" });
  await expect(resolvePriceListId("acc")).resolves.toBe("A");
  db.crm_Accounts.findFirst.mockResolvedValueOnce({ pricelist_id: null });
  db.crm_SystemSettings.findUnique.mockResolvedValueOnce({ value: "D" });
  await expect(resolvePriceListId("acc")).resolves.toBe("D");
  db.crm_SystemSettings.findUnique.mockResolvedValueOnce(null);
  await expect(resolvePriceListId(null)).resolves.toBeNull();
});
