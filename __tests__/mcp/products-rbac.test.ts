// Regression tests for GHSA-wv63-cq38-qg58
// RBAC bypass in MCP product tools: product create/update/delete are
// manager/admin-only (matching the server actions). A role:"user" MCP token
// must be rejected with FORBIDDEN; reads remain open org-wide.

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Products: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prismadb } from "@/lib/prisma";
import { crmProductTools } from "@/lib/mcp/tools/crm-products";

type Role = "user" | "manager" | "admin";
const USER = { id: "u1", role: "user" as Role };
const MANAGER = { id: "m1", role: "manager" as Role };
const ADMIN = { id: "a1", role: "admin" as Role };

const tool = (name: string) => {
  const t = crmProductTools.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return t;
};
// Handlers receive (args, userId, user)
const run = (name: string, args: any, user: { id: string; role: Role }) =>
  (tool(name).handler as any)(args, user.id, user);

const createArgs = {
  name: "Widget",
  type: "PRODUCT",
  unit_price: 10,
  currency: "USD",
};

beforeEach(() => jest.clearAllMocks());

describe("crm_create_product RBAC", () => {
  it("role 'user' is forbidden and no product is created", async () => {
    await expect(run("crm_create_product", createArgs, USER)).rejects.toThrow("FORBIDDEN");
    expect(prismadb.crm_Products.create).not.toHaveBeenCalled();
  });

  it("role 'manager' may create", async () => {
    (prismadb.crm_Products.create as jest.Mock).mockResolvedValue({ id: "p1" });
    await run("crm_create_product", createArgs, MANAGER);
    expect(prismadb.crm_Products.create).toHaveBeenCalledTimes(1);
  });

  it("role 'admin' may create", async () => {
    (prismadb.crm_Products.create as jest.Mock).mockResolvedValue({ id: "p1" });
    await run("crm_create_product", createArgs, ADMIN);
    expect(prismadb.crm_Products.create).toHaveBeenCalledTimes(1);
  });
});

describe("crm_update_product RBAC", () => {
  it("role 'user' is forbidden and no product is updated", async () => {
    await expect(
      run("crm_update_product", { id: "p1", name: "hacked" }, USER)
    ).rejects.toThrow("FORBIDDEN");
    expect(prismadb.crm_Products.update).not.toHaveBeenCalled();
  });

  it("role 'manager' may update", async () => {
    (prismadb.crm_Products.findFirst as jest.Mock).mockResolvedValue({ id: "p1" });
    (prismadb.crm_Products.update as jest.Mock).mockResolvedValue({ id: "p1" });
    await run("crm_update_product", { id: "p1", name: "ok" }, MANAGER);
    expect(prismadb.crm_Products.update).toHaveBeenCalledTimes(1);
  });
});

describe("crm_delete_product RBAC", () => {
  it("role 'user' is forbidden and no product is archived", async () => {
    await expect(run("crm_delete_product", { id: "p1" }, USER)).rejects.toThrow("FORBIDDEN");
    expect(prismadb.crm_Products.update).not.toHaveBeenCalled();
  });

  it("role 'manager' may soft-delete", async () => {
    (prismadb.crm_Products.findFirst as jest.Mock).mockResolvedValue({ id: "p1" });
    (prismadb.crm_Products.update as jest.Mock).mockResolvedValue({ id: "p1" });
    await run("crm_delete_product", { id: "p1" }, MANAGER);
    expect(prismadb.crm_Products.update).toHaveBeenCalledTimes(1);
  });
});

describe("product reads remain open to any authenticated role", () => {
  it("role 'user' may list products", async () => {
    (prismadb.crm_Products.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.crm_Products.count as jest.Mock).mockResolvedValue(0);
    await run("crm_list_products", { limit: 20, offset: 0 }, USER);
    expect(prismadb.crm_Products.findMany).toHaveBeenCalledTimes(1);
  });

  it("role 'user' may get a product", async () => {
    (prismadb.crm_Products.findFirst as jest.Mock).mockResolvedValue({ id: "p1" });
    const res = await run("crm_get_product", { id: "p1" }, USER);
    expect(res).toEqual({ data: { id: "p1" } });
  });
});
