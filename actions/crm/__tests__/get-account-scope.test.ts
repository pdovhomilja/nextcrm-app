jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getAccount } from "@/actions/crm/get-account";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getAccount scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns null and does not query account", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getAccount("a1");
    expect(res).toBeNull();
    expect(prismadb.crm_Accounts.findFirst).not.toHaveBeenCalled();
  });

  it("user out-of-scope returns null (another rep's account by URL)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getAccount("a1");
    expect(res).toBeNull();
    // only the assert call ran; detail call short-circuited
    expect(prismadb.crm_Accounts.findFirst).toHaveBeenCalledTimes(1);
    const assertCall = (prismadb.crm_Accounts.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeDefined();
  });

  it("owner returns account detail", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "a1" })
      .mockResolvedValueOnce({ id: "a1", name: "Barman" });
    const res = await getAccount("a1");
    expect(res).toEqual({ id: "a1", name: "Barman" });
    expect(prismadb.crm_Accounts.findFirst).toHaveBeenCalledTimes(2);
  });

  it("manager returns account detail (no OR in assert where)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Accounts.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "a1" })
      .mockResolvedValueOnce({ id: "a1", name: "Barman" });
    const res = await getAccount("a1");
    expect(res).toEqual({ id: "a1", name: "Barman" });
    const assertCall = (prismadb.crm_Accounts.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
