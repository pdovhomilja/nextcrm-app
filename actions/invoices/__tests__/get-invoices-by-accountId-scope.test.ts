jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    invoices: { findMany: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getInvoicesByAccountId } from "../get-invoices-by-accountId";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const fa = prismadb.crm_Accounts.findFirst as jest.MockedFunction<typeof prismadb.crm_Accounts.findFirst>;
const fm = prismadb.invoices.findMany as jest.MockedFunction<typeof prismadb.invoices.findMany>;

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => jest.clearAllMocks());

describe("getInvoicesByAccountId scope", () => {
  it("returns [] when unauthenticated", async () => {
    gs.mockResolvedValue(null as any);
    const r = await getInvoicesByAccountId(ACCOUNT_ID);
    expect(r).toEqual([]);
    expect(fm).not.toHaveBeenCalled();
  });

  it("returns [] for out-of-scope user", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fa.mockResolvedValue(null);
    const r = await getInvoicesByAccountId(ACCOUNT_ID);
    expect(r).toEqual([]);
    expect(fm).not.toHaveBeenCalled();
  });

  it("returns list for in-scope user", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fa.mockResolvedValue({ id: ACCOUNT_ID } as any);
    fm.mockResolvedValue([{ id: "i1" }] as any);
    const r = await getInvoicesByAccountId(ACCOUNT_ID);
    expect(r).toEqual([{ id: "i1" }]);
    expect(fm).toHaveBeenCalledTimes(1);
  });

  it("manager gets list", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    fa.mockResolvedValue({ id: ACCOUNT_ID } as any);
    fm.mockResolvedValue([{ id: "i1" }, { id: "i2" }] as any);
    const r = await getInvoicesByAccountId(ACCOUNT_ID);
    expect(r).toHaveLength(2);
    expect(fm).toHaveBeenCalled();
  });
});
