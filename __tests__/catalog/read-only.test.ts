jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(), diffObjects: jest.fn(() => []) }));
const requireRole = jest.fn();
jest.mock("@/lib/authz", () => {
  const actual = jest.requireActual("@/lib/authz/errors");
  return { requireRole: (...a: unknown[]) => requireRole(...a), AuthenticationError: actual.AuthenticationError, AuthorizationError: actual.AuthorizationError };
});
const db: Record<string, any> = {
  crm_Products: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn() },
  crm_ProductCategories: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), update: jest.fn(), create: jest.fn() },
  currency: { findMany: jest.fn().mockResolvedValue([{ code: "CZK" }]) },
};
jest.mock("@/lib/prisma", () => ({ prismadb: db }));

import { updateProduct } from "@/actions/crm/products/update-product";
import { deleteProduct } from "@/actions/crm/products/delete-product";
import { importProducts } from "@/actions/crm/products/import-products";
import { crmProductTools } from "@/lib/mcp/tools/crm-products";
import { saveProductCategory } from "@/app/[locale]/(routes)/admin/crm-settings/_actions/product-categories";

const manager = { id: "m1", role: "manager" as const };
const external = { id: "11111111-1111-4111-8111-111111111111", source: "EXTERNAL", deletedAt: null, sku: "X1", is_recurring: false, billing_period: null };
const tool = (name: string) => crmProductTools.find((t) => t.name === name)!;

beforeEach(() => { jest.clearAllMocks(); requireRole.mockResolvedValue(manager); });

it("refuses to update an EXTERNAL product in the server action", async () => {
  db.crm_Products.findUnique.mockResolvedValue(external);
  const res = await updateProduct({ id: external.id, name: "New" } as never);
  expect(res).toEqual({ error: "Managed by an external system" });
  expect(db.crm_Products.update).not.toHaveBeenCalled();
});

it("refuses to delete an EXTERNAL product in the server action", async () => {
  db.crm_Products.findUnique.mockResolvedValue(external);
  expect(await deleteProduct(external.id)).toEqual({ error: "Managed by an external system" });
  expect(db.crm_Products.update).not.toHaveBeenCalled();
});

it("refuses MCP update and delete of an EXTERNAL product", async () => {
  db.crm_Products.findFirst.mockResolvedValue(external);
  await expect(tool("crm_update_product").handler({ id: external.id, name: "x" } as never, "m1", manager as never)).rejects.toThrow("Managed by an external system");
  await expect(tool("crm_delete_product").handler({ id: external.id } as never, "m1", manager as never)).rejects.toThrow("Managed by an external system");
  expect(db.crm_Products.update).not.toHaveBeenCalled();
});

it("CSV import skips a row whose SKU belongs to an EXTERNAL product (Ruling 3)", async () => {
  requireRole.mockResolvedValue({ id: "a1", role: "admin" });
  db.crm_Products.findMany.mockResolvedValue([{ sku: "X1" }]);
  const form = new FormData();
  form.set("file", new File(["name,type,unit_price,currency,sku\nTea,PRODUCT,10,CZK,X1\n"], "p.csv"));
  const res = await importProducts(form);
  expect(res).toMatchObject({ imported: 0, skipped: 1 });
  expect(db.crm_Products.createMany).not.toHaveBeenCalled();
});

it("refuses to rename, move or deactivate an EXTERNAL category", async () => {
  requireRole.mockResolvedValue({ id: "a1", role: "admin" });
  db.crm_ProductCategories.findUnique.mockResolvedValue({ id: "c1", source: "EXTERNAL" });
  expect(await saveProductCategory({ id: "c1", name: "New", parentId: null, isActive: true })).toEqual({ error: "external" });
  expect(db.crm_ProductCategories.update).not.toHaveBeenCalled();
});

it("refuses to put a CRM category under an EXTERNAL parent", async () => {
  requireRole.mockResolvedValue({ id: "a1", role: "admin" });
  db.crm_ProductCategories.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
    where.id === "p1" ? { id: "p1", source: "EXTERNAL" } : { id: "c2", source: "CRM" });
  expect(await saveProductCategory({ id: "c2", name: "Mine", parentId: "p1", isActive: true })).toEqual({ error: "externalParent" });
  expect(await saveProductCategory({ name: "New", parentId: "p1", isActive: true })).toEqual({ error: "externalParent" });
  expect(db.crm_ProductCategories.update).not.toHaveBeenCalled();
  expect(db.crm_ProductCategories.create).not.toHaveBeenCalled();
});
