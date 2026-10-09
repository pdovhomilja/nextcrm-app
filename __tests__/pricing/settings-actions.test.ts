jest.mock("@/lib/authz", () => ({
  requireRole: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_PriceLists: { findUnique: jest.fn() },
    crm_SystemSettings: { upsert: jest.fn(), deleteMany: jest.fn(), findUnique: jest.fn() },
    crm_ProductCategories: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));

import { AuthorizationError, requireRole } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { setDefaultPriceList } from "@/app/[locale]/(routes)/admin/pricing/_actions/pricing";
import { saveProductCategory } from "@/app/[locale]/(routes)/admin/crm-settings/_actions/product-categories";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
beforeEach(() => { jest.clearAllMocks(); (requireRole as jest.Mock).mockResolvedValue({ id: "a1", role: "admin" }); });

it("sets the default list only for admins and only to an active list", async () => {
  (requireRole as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
  await expect(setDefaultPriceList("L")).resolves.toEqual({ error: "Forbidden" });
  db.crm_PriceLists.findUnique.mockResolvedValueOnce({ id: "L", isActive: false });
  await expect(setDefaultPriceList("L")).resolves.toEqual({ error: "Not found" });
  db.crm_PriceLists.findUnique.mockResolvedValueOnce({ id: "L", isActive: true });
  await expect(setDefaultPriceList("L")).resolves.toEqual({ data: true });
  expect(db.crm_SystemSettings.upsert).toHaveBeenCalledWith({ where: { key: "default_pricelist_id" }, create: { key: "default_pricelist_id", value: "L" }, update: { value: "L" } });
  await expect(setDefaultPriceList(null)).resolves.toEqual({ data: true });
  expect(db.crm_SystemSettings.deleteMany).toHaveBeenCalledWith({ where: { key: "default_pricelist_id" } });
});

it("rejects a category moved under its own child (Review Focus 5)", async () => {
  db.crm_ProductCategories.findMany.mockResolvedValue([{ id: "parent", parentId: null }, { id: "child", parentId: "parent" }]);
  await expect(saveProductCategory({ id: "parent", name: "P", parentId: "child", isActive: true })).resolves.toEqual({ error: "cycle" });
  db.crm_ProductCategories.update.mockResolvedValue({ id: "child" });
  await expect(saveProductCategory({ id: "child", name: "C", parentId: null, isActive: true })).resolves.toEqual({ data: { id: "child" } });
  db.crm_ProductCategories.create.mockResolvedValue({ id: "new" });
  await expect(saveProductCategory({ name: "N", parentId: "parent", isActive: true })).resolves.toEqual({ data: { id: "new" } });
  expect(db.crm_ProductCategories.create).toHaveBeenCalledWith({ data: { name: "N", parentId: "parent", isActive: true, createdBy: "a1", updatedBy: "a1" } });
});
