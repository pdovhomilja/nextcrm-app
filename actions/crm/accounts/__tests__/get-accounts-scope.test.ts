jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getAccounts } from "@/actions/crm/accounts/get-accounts";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getAccounts scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated does not query and returns error", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getAccounts();
    expect(prismadb.crm_Accounts.findMany).not.toHaveBeenCalled();
    expect(res).toHaveProperty("error");
  });

  it("user role scopes by assigned/createdBy/watchers OR + deletedAt:null", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([]);
    await getAccounts();
    expect(prismadb.crm_Accounts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          OR: [
            { assigned_to: "u1" },
            { createdBy: "u1" },
            { watchers: { some: { user_id: "u1" } } },
          ],
        }),
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    );
  });

  it("manager role: where = { deletedAt: null } (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([]);
    await getAccounts();
    const call = (prismadb.crm_Accounts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ deletedAt: null });
    expect(call.where.OR).toBeUndefined();
  });

  it("admin role: where = { deletedAt: null } (no OR)", async () => {
    mockUser("admin", "a1");
    (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([]);
    await getAccounts();
    const call = (prismadb.crm_Accounts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ deletedAt: null });
    expect(call.where.OR).toBeUndefined();
  });
});
