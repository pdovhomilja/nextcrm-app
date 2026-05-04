jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_ProductCategories: { findMany: jest.fn().mockResolvedValue([]) },
    currency: { findMany: jest.fn().mockResolvedValue([{ code: "USD" }]) },
    crm_Products: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn(),
    },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { importProducts } from "../import-products";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const createMany = prismadb.crm_Products.createMany as jest.MockedFunction<typeof prismadb.crm_Products.createMany>;

const csv = "name,type,unit_price,currency\nWidget,PRODUCT,10,USD\n";
const makeForm = () => {
  const fd = new FormData();
  fd.set("file", new File([csv], "p.csv", { type: "text/csv" }));
  return fd;
};

beforeEach(() => {
  jest.clearAllMocks();
  (prismadb.crm_ProductCategories.findMany as jest.Mock).mockResolvedValue([]);
  (prismadb.currency.findMany as jest.Mock).mockResolvedValue([{ code: "USD" }]);
  (prismadb.crm_Products.findMany as jest.Mock).mockResolvedValue([]);
  createMany.mockResolvedValue({ count: 1 } as any);
});

describe("importProducts role gate", () => {
  it("throws Unauthorized when no session", async () => {
    gs.mockResolvedValue(null as any);
    await expect(importProducts(makeForm())).rejects.toThrow("Unauthorized");
    expect(createMany).not.toHaveBeenCalled();
  });

  it("throws Forbidden when user role", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    await expect(importProducts(makeForm())).rejects.toThrow("Forbidden");
    expect(createMany).not.toHaveBeenCalled();
  });

  it("manager succeeds", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    const res = await importProducts(makeForm());
    expect(res.imported).toBe(1);
    expect(createMany).toHaveBeenCalled();
  });

  it("admin succeeds", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    const res = await importProducts(makeForm());
    expect(res.imported).toBe(1);
    expect(createMany).toHaveBeenCalled();
  });
});
