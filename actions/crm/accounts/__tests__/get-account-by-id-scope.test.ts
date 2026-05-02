jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn(), findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getAccountById } from "@/actions/crm/accounts/get-account-by-id";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getAccountById scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns null and does not query detail", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getAccountById("a1");
    expect(res).toBeNull();
    expect(prismadb.crm_Accounts.findFirst).not.toHaveBeenCalled();
  });

  it("returns null when assertCanReadAccount finds no row (out-of-scope)", async () => {
    mockUser("user", "u1");
    // assertCanReadAccount.findFirst returns null -> AuthorizationError
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getAccountById("a1");
    expect(res).toBeNull();
    // detail findFirst should not produce data — only the assert call happened
    expect(prismadb.crm_Accounts.findFirst).toHaveBeenCalledTimes(1);
  });

  it("owner (user role) with scope match returns account", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock)
      // assert call
      .mockResolvedValueOnce({ id: "a1" })
      // detail call
      .mockResolvedValueOnce({ id: "a1", name: "Acme" });
    const res = await getAccountById("a1");
    expect(res).toEqual({ id: "a1", name: "Acme" });
    expect(prismadb.crm_Accounts.findFirst).toHaveBeenCalledTimes(2);
  });

  it("manager returns account", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Accounts.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "a1" })
      .mockResolvedValueOnce({ id: "a1", name: "Acme" });
    const res = await getAccountById("a1");
    expect(res).toEqual({ id: "a1", name: "Acme" });
  });
});
