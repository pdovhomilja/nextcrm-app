jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { searchAccounts } from "@/actions/crm/accounts/search-accounts";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("searchAccounts scope", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.crm_Accounts.count as jest.Mock).mockResolvedValue(0);
    (prismadb.$transaction as jest.Mock).mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
  });

  it("unauthenticated does not query and returns error", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await searchAccounts({ search: "acme" });
    expect(prismadb.crm_Accounts.findMany).not.toHaveBeenCalled();
    expect(res).toHaveProperty("error");
  });

  it("user role: where contains search term AND ownership OR + deletedAt:null", async () => {
    mockUser("user", "u1");
    await searchAccounts({ search: "acme" });
    const call = (prismadb.crm_Accounts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual(
      expect.objectContaining({
        deletedAt: null,
        name: { contains: "acme", mode: "insensitive" },
        OR: [
          { assigned_to: "u1" },
          { createdBy: "u1" },
          { watchers: { some: { user_id: "u1" } } },
        ],
      }),
    );
  });

  it("manager role: where = search term + deletedAt:null, no OR", async () => {
    mockUser("manager", "m1");
    await searchAccounts({ search: "acme" });
    const call = (prismadb.crm_Accounts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({
      deletedAt: null,
      name: { contains: "acme", mode: "insensitive" },
    });
    expect(call.where.OR).toBeUndefined();
  });
});
