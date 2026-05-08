jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Products: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({
  writeAuditLog: jest.fn(),
  diffObjects: jest.fn().mockReturnValue([]),
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { updateProduct } from "../update-product";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const findProd = prismadb.crm_Products.findUnique as jest.MockedFunction<typeof prismadb.crm_Products.findUnique>;
const upd = prismadb.crm_Products.update as jest.MockedFunction<typeof prismadb.crm_Products.update>;

const validInput = { id: "p1", name: "Widget v2" };

beforeEach(() => {
  jest.clearAllMocks();
  findProd.mockResolvedValue({ id: "p1", deletedAt: null, sku: null, is_recurring: false, billing_period: null } as any);
  upd.mockResolvedValue({ id: "p1", name: "Widget v2" } as any);
});

describe("updateProduct role gate", () => {
  it("Unauthorized when no session", async () => {
    gs.mockResolvedValue(null as any);
    const res = await updateProduct(validInput);
    expect(res).toEqual({ error: "Unauthorized" });
    expect(upd).not.toHaveBeenCalled();
  });

  it("Forbidden when user role", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    const res = await updateProduct(validInput);
    expect(res).toEqual({ error: "Forbidden" });
    expect(upd).not.toHaveBeenCalled();
  });

  it("manager succeeds", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    const res = await updateProduct(validInput);
    expect(res).toMatchObject({ data: { id: "p1" } });
    expect(upd).toHaveBeenCalled();
  });

  it("admin succeeds", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    const res = await updateProduct(validInput);
    expect(res).toMatchObject({ data: { id: "p1" } });
    expect(upd).toHaveBeenCalled();
  });
});
