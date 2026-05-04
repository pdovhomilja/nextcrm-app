jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    crm_AccountProducts: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    crm_Products: { findUnique: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/currency", () => ({
  getSnapshotRate: jest.fn().mockResolvedValue(null),
  getDefaultCurrency: jest.fn().mockResolvedValue("USD"),
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { assignProduct } from "../assign-product";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const accFind = prismadb.crm_Accounts.findFirst as jest.MockedFunction<typeof prismadb.crm_Accounts.findFirst>;
const apFindFirst = prismadb.crm_AccountProducts.findFirst as jest.MockedFunction<typeof prismadb.crm_AccountProducts.findFirst>;
const apCreate = prismadb.crm_AccountProducts.create as jest.MockedFunction<typeof prismadb.crm_AccountProducts.create>;
const prodFind = prismadb.crm_Products.findUnique as jest.MockedFunction<typeof prismadb.crm_Products.findUnique>;

const validInput = {
  accountId: "a1",
  productId: "p1",
  quantity: 1,
  currency: "USD",
  status: "ACTIVE" as const,
  start_date: new Date("2026-01-01"),
};

beforeEach(() => {
  jest.clearAllMocks();
  prodFind.mockResolvedValue({ id: "p1", deletedAt: null, status: "ACTIVE" } as any);
  apFindFirst.mockResolvedValue(null);
  apCreate.mockResolvedValue({ id: "ap1" } as any);
});

describe("assignProduct account write scope", () => {
  it("Unauthorized when no session", async () => {
    gs.mockResolvedValue(null as any);
    const res = await assignProduct(validInput);
    expect(res).toEqual({ error: "Unauthorized" });
    expect(apCreate).not.toHaveBeenCalled();
  });

  it("Forbidden when user out of account scope", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    accFind.mockResolvedValue(null);
    const res = await assignProduct(validInput);
    expect(res).toEqual({ error: "Forbidden" });
    expect(apCreate).not.toHaveBeenCalled();
  });

  it("user in scope succeeds", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    accFind.mockResolvedValue({ id: "a1" } as any);
    const res = await assignProduct(validInput);
    expect(res).toMatchObject({ data: { id: "ap1" } });
    expect(apCreate).toHaveBeenCalled();
  });

  it("manager succeeds", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    accFind.mockResolvedValue({ id: "a1" } as any);
    const res = await assignProduct(validInput);
    expect(res).toMatchObject({ data: { id: "ap1" } });
    expect(apCreate).toHaveBeenCalled();
  });
});
