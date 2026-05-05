jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    crm_Contacts: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getContactsByAccountId } from "@/actions/crm/get-contacts-by-accountId";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getContactsByAccountId scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getContactsByAccountId("a1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Accounts.findFirst).not.toHaveBeenCalled();
    expect(prismadb.crm_Contacts.findMany).not.toHaveBeenCalled();
  });

  it("returns [] when assertCanReadAccount misses (out-of-scope user)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getContactsByAccountId("a1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Contacts.findMany).not.toHaveBeenCalled();
  });

  it("user with account access: scopes contacts by accountsIDs + contactReadScopeWhere", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.crm_Contacts.findMany as jest.Mock).mockResolvedValue([{ id: "c1" }]);
    const res = await getContactsByAccountId("a1");
    expect(res).toEqual([{ id: "c1" }]);
    const call = (prismadb.crm_Contacts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.accountsIDs).toBe("a1");
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.OR).toEqual([
      { assigned_to: "u1" },
      { createdBy: "u1" },
      {
        assigned_accounts: {
          OR: [
            { assigned_to: "u1" },
            { createdBy: "u1" },
            { watchers: { some: { user_id: "u1" } } },
          ],
        },
      },
    ]);
  });

  it("manager: where = { accountsIDs, deletedAt:null } (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.crm_Contacts.findMany as jest.Mock).mockResolvedValue([]);
    await getContactsByAccountId("a1");
    const call = (prismadb.crm_Contacts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ accountsIDs: "a1", deletedAt: null });
    expect(call.where.OR).toBeUndefined();
  });
});
