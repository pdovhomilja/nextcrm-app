jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_PriceLists: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    crm_PriceListRules: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    currency: { findFirst: jest.fn() },
  },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/pricing/get-price", () => ({ getPrice: jest.fn(), resolvePriceListId: jest.fn() }));

import { Decimal } from "decimal.js";
import { prismadb } from "@/lib/prisma";
import { getPrice, resolvePriceListId } from "@/lib/pricing/get-price";
import { readFileSync } from "node:fs";
import { crmPriceListTools } from "@/lib/mcp/tools/crm-price-lists";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const tool = (name: string) => crmPriceListTools.find((t) => t.name === name)!;
const rep = { id: "u1", role: "user" as const };
const manager = { id: "m1", role: "manager" as const };

beforeEach(() => jest.clearAllMocks());

it("is registered in allTools", () => {
  // Importing lib/mcp/tools would load every tool module; the registry wiring is checked in source.
  const index = readFileSync("lib/mcp/tools/index.ts", "utf8");
  expect(index).toContain('import { crmPriceListTools } from "./crm-price-lists";');
  expect(index).toContain("...crmPriceListTools,");
  expect(crmPriceListTools.map((t) => t.name)).toEqual([
    "crm_list_price_lists", "crm_get_price_list", "crm_get_price", "crm_create_price_list",
    "crm_update_price_list", "crm_archive_price_list", "crm_upsert_price_list_rule", "crm_delete_price_list_rule",
  ]);
});

it("lets reps read and price, but not write (Review Focus 2)", async () => {
  db.crm_PriceLists.findMany.mockResolvedValue([{ id: "L" }]);
  db.crm_PriceLists.count.mockResolvedValue(1);
  await expect(tool("crm_list_price_lists").handler({ limit: 20, offset: 0 } as never, "u1", rep)).resolves.toEqual({ data: [{ id: "L" }], total: 1, offset: 0 });
  db.crm_Accounts.findFirst.mockResolvedValue({ id: "acc" });
  (resolvePriceListId as jest.Mock).mockResolvedValue("L");
  (getPrice as jest.Mock).mockResolvedValue({ price: new Decimal(85), listPrice: new Decimal(100), currency: "CZK", ruleId: "r", steps: [] });
  await expect(tool("crm_get_price").handler({ productId: "p", quantity: 1, accountId: "acc" } as never, "u1", rep))
    .resolves.toEqual({ data: { price: "85.00", listPrice: "100.00", currency: "CZK", ruleId: "r", priceListId: "L", steps: [] } });
  await expect(tool("crm_create_price_list").handler({ name: "X", currency: "CZK" } as never, "u1", rep)).rejects.toThrow("FORBIDDEN");
});

it("refuses writes to external lists and validates rules", async () => {
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L", source: "EXTERNAL" });
  await expect(tool("crm_upsert_price_list_rule").handler({ priceListId: "L", appliesTo: "ALL", computePrice: "FIXED", fixedPrice: 1 } as never, "m1", manager)).rejects.toThrow("FORBIDDEN");
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L", source: "CRM" });
  await expect(tool("crm_upsert_price_list_rule").handler({ priceListId: "L", appliesTo: "PRODUCT", computePrice: "FIXED", fixedPrice: 1 } as never, "m1", manager)).rejects.toThrow("VALIDATION_ERROR: productRequired");
});

it("refuses to edit a rule through another list's id", async () => {
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L", source: "CRM" });
  db.crm_PriceListRules.findUnique.mockResolvedValue({ id: "ext-rule", priceListId: "EXT" });
  await expect(tool("crm_upsert_price_list_rule").handler({ priceListId: "L", ruleId: "ext-rule", appliesTo: "ALL", computePrice: "FIXED", fixedPrice: 1 } as never, "m1", manager)).rejects.toThrow("NOT_FOUND");
  expect(db.crm_PriceListRules.update).not.toHaveBeenCalled();
});

it("hides accounts the rep cannot read", async () => {
  db.crm_Accounts.findFirst.mockResolvedValue(null);
  await expect(tool("crm_get_price").handler({ productId: "p", quantity: 1, accountId: "other" } as never, "u1", rep)).rejects.toThrow("NOT_FOUND");
});
