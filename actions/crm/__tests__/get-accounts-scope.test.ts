jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getAccounts } from "@/actions/crm/get-accounts";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getAccounts (rich-shape, page-level)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("user role: where merges deletedAt:null + creator/assigned/watcher OR", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([]);
    await getAccounts();
    const call = (prismadb.crm_Accounts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({
      deletedAt: null,
      OR: [
        { assigned_to: "u1" },
        { createdBy: "u1" },
        { watchers: { some: { user_id: "u1" } } },
      ],
    });
  });

  it("manager role: where = { deletedAt: null } (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([]);
    await getAccounts();
    const call = (prismadb.crm_Accounts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ deletedAt: null });
  });

  it("admin role: where = { deletedAt: null } (no OR)", async () => {
    mockUser("admin", "a1");
    (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([]);
    await getAccounts();
    const call = (prismadb.crm_Accounts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ deletedAt: null });
  });

  it("loads only the columns the accounts table renders", async () => {
    mockUser("admin", "a1");
    (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([]);
    await getAccounts();
    const call = (prismadb.crm_Accounts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.include).toEqual({
      assigned_to_user: { select: { name: true } },
      contacts: { select: { first_name: true, last_name: true } },
    });
    expect(call.include.watchers).toBeUndefined();
  });
});
