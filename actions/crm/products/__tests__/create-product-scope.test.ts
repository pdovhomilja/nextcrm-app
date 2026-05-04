jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Products: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { createProduct } from "../create-product";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const create = prismadb.crm_Products.create as jest.MockedFunction<typeof prismadb.crm_Products.create>;
const findProd = prismadb.crm_Products.findUnique as jest.MockedFunction<typeof prismadb.crm_Products.findUnique>;

const validInput = {
  name: "Widget",
  type: "PRODUCT" as const,
  status: "DRAFT" as const,
  unit_price: "10.00",
  currency: "USD",
  is_recurring: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  findProd.mockResolvedValue(null as any);
  create.mockResolvedValue({ id: "p1", name: "Widget" } as any);
});

describe("createProduct role gate", () => {
  it("Unauthorized when no session", async () => {
    gs.mockResolvedValue(null as any);
    const res = await createProduct(validInput);
    expect(res).toEqual({ error: "Unauthorized" });
    expect(create).not.toHaveBeenCalled();
  });

  it("Forbidden when user role", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    const res = await createProduct(validInput);
    expect(res).toEqual({ error: "Forbidden" });
    expect(create).not.toHaveBeenCalled();
  });

  it("manager succeeds", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    const res = await createProduct(validInput);
    expect(res).toMatchObject({ data: { id: "p1" } });
    expect(create).toHaveBeenCalled();
  });

  it("admin succeeds", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    const res = await createProduct(validInput);
    expect(res).toMatchObject({ data: { id: "p1" } });
    expect(create).toHaveBeenCalled();
  });
});
