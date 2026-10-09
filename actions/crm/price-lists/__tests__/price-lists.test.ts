jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    currency: { findFirst: jest.fn() },
    crm_PriceLists: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    crm_PriceListRules: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    crm_Accounts: { count: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/pricing/get-price", () => ({ getPrice: jest.fn() }));

import { Decimal } from "decimal.js";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { getPrice } from "@/lib/pricing/get-price";
import { checkPrice, createPriceList, deletePriceList, updatePriceList, upsertPriceListRule } from "../price-lists";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const as = (role: "user" | "manager" | "admin") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
  db.users.findUnique.mockResolvedValue({ id: "u1", role, userStatus: "ACTIVE" });
};

beforeEach(() => {
  jest.clearAllMocks();
  db.currency.findFirst.mockResolvedValue({ code: "CZK" });
  db.crm_PriceLists.create.mockResolvedValue({ id: "L" });
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L", source: "CRM" });
  db.crm_PriceListRules.create.mockResolvedValue({ id: "r1" });
  db.crm_PriceListRules.findMany.mockResolvedValue([]);
});

it("refuses reps and lets managers create (Review Focus 2)", async () => {
  as("user");
  await expect(createPriceList({ name: "A", currency: "CZK" })).resolves.toEqual({ error: "Forbidden" });
  expect(db.crm_PriceLists.create).not.toHaveBeenCalled();
  as("manager");
  await expect(createPriceList({ name: "A", currency: "CZK" })).resolves.toEqual({ data: { id: "L" } });
  expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ entityType: "price_list", action: "created" }));
});

it("rejects a disabled currency", async () => {
  as("admin");
  db.currency.findFirst.mockResolvedValue(null);
  await expect(createPriceList({ name: "A", currency: "XYZ" })).resolves.toEqual({ error: "Currency is not enabled" });
});

it("locks external lists even for admins", async () => {
  as("admin");
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L", source: "EXTERNAL" });
  await expect(updatePriceList("L", { name: "B", currency: "CZK", isActive: true })).resolves.toEqual({ error: "Forbidden" });
  await expect(upsertPriceListRule("L", null, { appliesTo: "ALL", computePrice: "FIXED", fixedPrice: 1 })).resolves.toEqual({ error: "Forbidden" });
});

it("validates rules, clears stale fields and rejects cycles (Review Focus 3)", async () => {
  as("manager");
  await expect(upsertPriceListRule("L", null, { appliesTo: "PRODUCT", computePrice: "FIXED", fixedPrice: 1 })).resolves.toEqual({ error: "invalid:productRequired" });
  await upsertPriceListRule("L", null, { appliesTo: "ALL", computePrice: "FORMULA", fixedPrice: 9, priceDiscount: 5 });
  expect(db.crm_PriceListRules.create).toHaveBeenCalledWith({ data: expect.objectContaining({ priceListId: "L", fixedPrice: null, priceDiscount: 5 }) });
  db.crm_PriceLists.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({ id: where.id, source: "CRM" }));
  db.crm_PriceListRules.findMany.mockResolvedValue([{ priceListId: "B", basePriceListId: "L" }]);
  await expect(upsertPriceListRule("L", null, { appliesTo: "ALL", computePrice: "FORMULA", base: "PRICE_LIST", basePriceListId: "B" })).resolves.toEqual({ error: "cycle" });
});

it("only deletes unreferenced lists", async () => {
  as("manager");
  db.crm_Accounts.count.mockResolvedValue(1);
  db.crm_PriceListRules.count.mockResolvedValue(0);
  await expect(deletePriceList("L")).resolves.toEqual({ error: "inUse" });
  db.crm_Accounts.count.mockResolvedValue(0);
  db.crm_PriceLists.delete.mockResolvedValue({ id: "L" });
  await expect(deletePriceList("L")).resolves.toEqual({ data: { id: "L" } });
});

it("checks a price for any signed-in role", async () => {
  as("user");
  (getPrice as jest.Mock).mockResolvedValue({ price: new Decimal("85.5"), listPrice: new Decimal(100), currency: "CZK", ruleId: "r1", steps: [{ label: "base", value: new Decimal(100) }] });
  await expect(checkPrice({ priceListId: "L", productId: "p1", quantity: 2 })).resolves.toEqual({
    data: { price: "85.50", listPrice: "100.00", currency: "CZK", ruleId: "r1", steps: [{ label: "base", value: "100.00" }] },
  });
});
