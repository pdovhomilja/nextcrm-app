import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthenticated: vi.fn(),
  accountReadScopeWhere: vi.fn(() => ({})),
  AuthenticationError: class extends Error {
    readonly code = "UNAUTHENTICATED";
    constructor(message = "Unauthenticated") {
      super(message);
      this.name = "AuthenticationError";
    }
  },
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: {
      findMany: vi.fn(),
    },
  },
}));

import { getAccounts } from "@/actions/crm/accounts/get-accounts";
import { AuthenticationError, accountReadScopeWhere, requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("getAccounts (subdirectory)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthenticationError returns Unauthorized", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getAccounts();
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("uses accountReadScopeWhere in where clause", async () => {
    mockUser("user");
    (accountReadScopeWhere as ReturnType<typeof vi.fn>).mockReturnValue({
      deletedAt: null,
    });
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await getAccounts();
    expect(accountReadScopeWhere).toHaveBeenCalledWith(expect.objectContaining({ id: "u1", role: "user" }));
    expect(prismadb.crm_Accounts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    );
  });

  it("returns accounts on success", async () => {
    mockUser("admin");
    const accounts = [
      { id: "a1", name: "Acme" },
      { id: "a2", name: "Beta" },
    ];
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(accounts);
    const res = await getAccounts();
    expect(res).toEqual({ data: accounts });
  });

  it("returns error on unexpected failure", async () => {
    mockUser("user");
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await getAccounts();
    expect(res).toEqual({ error: "Failed to fetch accounts" });
  });
});
