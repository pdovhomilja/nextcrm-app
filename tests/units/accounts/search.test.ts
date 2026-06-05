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
    $transaction: vi.fn((ops) => Promise.all(ops.map((op: any) => Promise.resolve(op)))),
    crm_Accounts: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { searchAccounts } from "@/actions/crm/accounts/search-accounts";
import { AuthenticationError, accountReadScopeWhere, requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("searchAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthenticationError returns empty result", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await searchAccounts();
    expect(res).toEqual({
      error: "Unauthorized",
      accounts: [],
      total: 0,
      hasMore: false,
    });
  });

  it("uses accountReadScopeWhere in where clause", async () => {
    mockUser("user");
    (accountReadScopeWhere as ReturnType<typeof vi.fn>).mockReturnValue({
      deletedAt: null,
    });
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Accounts.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    await searchAccounts();
    expect(accountReadScopeWhere).toHaveBeenCalledWith(expect.objectContaining({ id: "u1", role: "user" }));
  });

  it("applies search filter when search is provided", async () => {
    mockUser("user");
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Accounts.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    await searchAccounts({ search: "Acme" });
    const findManyCall = (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findManyCall.where).toMatchObject({
      name: { contains: "Acme", mode: "insensitive" },
    });
  });

  it("does not apply search filter when search is empty", async () => {
    mockUser("user");
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Accounts.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    await searchAccounts({ search: "" });
    const findManyCall = (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findManyCall.where).not.toHaveProperty("name");
  });

  it("uses default pagination (skip=0, take=50)", async () => {
    mockUser("user");
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Accounts.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    await searchAccounts();
    const findManyCall = (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findManyCall.skip).toBe(0);
    expect(findManyCall.take).toBe(50);
  });

  it("caps take at PAGE_SIZE_MAX (100)", async () => {
    mockUser("user");
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Accounts.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    await searchAccounts({ take: 200 });
    const findManyCall = (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(findManyCall.take).toBe(100);
  });

  it("returns accounts, total and hasMore", async () => {
    mockUser("user");
    const accounts = [{ id: "a1", name: "Acme" }];
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(accounts);
    (prismadb.crm_Accounts.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    const res = await searchAccounts({ skip: 0, take: 50 });
    expect(res).toEqual({
      accounts,
      total: 1,
      hasMore: false,
    });
  });

  it("hasMore is true when there are more results", async () => {
    mockUser("user");
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "a1", name: "Acme" }]);
    (prismadb.crm_Accounts.count as ReturnType<typeof vi.fn>).mockResolvedValue(10);
    const res = await searchAccounts({ skip: 0, take: 5 });
    expect(res.hasMore).toBe(true);
  });

  it("hasMore is false when no more results", async () => {
    mockUser("user");
    (prismadb.crm_Accounts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "a1", name: "Acme" }]);
    (prismadb.crm_Accounts.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    const res = await searchAccounts({ skip: 0, take: 10 });
    expect(res.hasMore).toBe(false);
  });

  it("returns error on unexpected failure", async () => {
    mockUser("user");
    (prismadb.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await searchAccounts();
    expect(res).toEqual({
      error: "Failed to search accounts",
      accounts: [],
      total: 0,
      hasMore: false,
    });
  });
});
