jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    crm_Opportunities: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getOpportunitiesFullByAccountId } from "@/actions/crm/get-opportunities-with-includes-by-accountId";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getOpportunitiesFullByAccountId scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getOpportunitiesFullByAccountId("a1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Accounts.findFirst).not.toHaveBeenCalled();
    expect(prismadb.crm_Opportunities.findMany).not.toHaveBeenCalled();
  });

  it("returns [] when assertCanReadAccount misses (out-of-scope user)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getOpportunitiesFullByAccountId("a1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Opportunities.findMany).not.toHaveBeenCalled();
  });

  it("user with account access: scopes opportunities by account + opportunityReadScopeWhere", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([{ id: "o1" }]);
    const res = await getOpportunitiesFullByAccountId("a1");
    expect(res).toEqual([{ id: "o1" }]);
    const call = (prismadb.crm_Opportunities.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.account).toBe("a1");
    expect(call.where.deletedAt).toBeNull();
    expect(Array.isArray(call.where.OR)).toBe(true);
    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
      ]),
    );
  });

  it("manager: where = { account, deletedAt:null } (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([]);
    await getOpportunitiesFullByAccountId("a1");
    const call = (prismadb.crm_Opportunities.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ account: "a1", deletedAt: null });
    expect(call.where.OR).toBeUndefined();
  });
});
