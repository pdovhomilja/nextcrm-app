import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthenticated: vi.fn(),
  assertCanReadAccount: vi.fn(),
  AuthenticationError: class extends Error {
    readonly code = "UNAUTHENTICATED";
    constructor(message = "Unauthenticated") {
      super(message);
      this.name = "AuthenticationError";
    }
  },
  AuthorizationError: class extends Error {
    readonly code = "FORBIDDEN";
    constructor(message = "Forbidden") {
      super(message);
      this.name = "AuthorizationError";
    }
  },
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: {
      findFirst: vi.fn(),
    },
  },
}));

import { getAccountById } from "@/actions/crm/accounts/get-account-by-id";
import { AuthenticationError, AuthorizationError, assertCanReadAccount, requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("getAccountById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (assertCanReadAccount as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("AuthenticationError returns null", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getAccountById("a1");
    expect(res).toBeNull();
    expect(prismadb.crm_Accounts.findFirst).not.toHaveBeenCalled();
  });

  it("AuthorizationError returns null", async () => {
    mockUser("user");
    (assertCanReadAccount as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthorizationError());
    const res = await getAccountById("a1");
    expect(res).toBeNull();
    expect(prismadb.crm_Accounts.findFirst).not.toHaveBeenCalled();
  });

  it("non-auth error from requireAuthenticated is thrown", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unexpected"));
    await expect(getAccountById("a1")).rejects.toThrow("Unexpected");
  });

  it("non-authz error from assertCanReadAccount is thrown", async () => {
    mockUser("user");
    (assertCanReadAccount as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unexpected"));
    await expect(getAccountById("a1")).rejects.toThrow("Unexpected");
  });

  it("finds account by id with deletedAt null", async () => {
    mockUser("user");
    const account = { id: "a1", name: "Acme" };
    (prismadb.crm_Accounts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(account);
    const res = await getAccountById("a1");
    expect(res).toEqual(account);
    expect(prismadb.crm_Accounts.findFirst).toHaveBeenCalledWith({
      where: { id: "a1", deletedAt: null },
      select: { id: true, name: true },
    });
  });

  it("returns null when account not found", async () => {
    mockUser("user");
    (prismadb.crm_Accounts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getAccountById("a1");
    expect(res).toBeNull();
  });
});
