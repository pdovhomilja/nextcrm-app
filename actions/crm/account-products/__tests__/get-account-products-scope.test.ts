jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    crm_AccountProducts: { findMany: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getAccountProducts } from "../get-account-products";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const accFind = prismadb.crm_Accounts.findFirst as jest.MockedFunction<typeof prismadb.crm_Accounts.findFirst>;
const apFindMany = prismadb.crm_AccountProducts.findMany as jest.MockedFunction<typeof prismadb.crm_AccountProducts.findMany>;

beforeEach(() => {
  jest.clearAllMocks();
  apFindMany.mockResolvedValue([{ id: "ap1" }] as any);
});

describe("getAccountProducts account read scope", () => {
  it("returns empty when no session", async () => {
    gs.mockResolvedValue(null as any);
    const res = await getAccountProducts("a1");
    expect(res).toEqual([]);
    expect(apFindMany).not.toHaveBeenCalled();
  });

  it("returns empty when user out of scope", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    accFind.mockResolvedValue(null);
    const res = await getAccountProducts("a2");
    expect(res).toEqual([]);
    expect(apFindMany).not.toHaveBeenCalled();
  });

  it("user in scope returns assignments", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    accFind.mockResolvedValue({ id: "a3" } as any);
    const res = await getAccountProducts("a3");
    expect(res).toEqual([{ id: "ap1" }]);
    expect(apFindMany).toHaveBeenCalled();
  });

  it("manager returns assignments", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    accFind.mockResolvedValue({ id: "a4" } as any);
    const res = await getAccountProducts("a4");
    expect(res).toEqual([{ id: "ap1" }]);
    expect(apFindMany).toHaveBeenCalled();
  });
});
