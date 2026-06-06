import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthenticated: vi.fn(),
  assertCanReadContract: vi.fn(),
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
    crm_Contracts: {
      findUnique: vi.fn(),
    },
  },
}));

import { getContract } from "@/actions/crm/get-contract";
import { AuthenticationError, AuthorizationError, assertCanReadContract, requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("getContract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (assertCanReadContract as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("AuthenticationError returns null", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getContract("c1");
    expect(res).toBeNull();
    expect(prismadb.crm_Contracts.findUnique).not.toHaveBeenCalled();
  });

  it("AuthorizationError returns null", async () => {
    mockUser("user");
    (assertCanReadContract as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthorizationError());
    const res = await getContract("c1");
    expect(res).toBeNull();
    expect(prismadb.crm_Contracts.findUnique).not.toHaveBeenCalled();
  });

  it("non-auth error from requireAuthenticated is thrown", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unexpected"));
    await expect(getContract("c1")).rejects.toThrow("Unexpected");
  });

  it("non-authz error from assertCanReadContract is thrown", async () => {
    mockUser("user");
    (assertCanReadContract as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unexpected"));
    await expect(getContract("c1")).rejects.toThrow("Unexpected");
  });

  it("finds contract by id with correct include shape", async () => {
    mockUser("user");
    const mockContract = {
      id: "c1",
      title: "Contract 1",
      assigned_account: { id: "a1", name: "Acme" },
      assigned_to_user: { id: "u1", name: "User" },
      lineItems: [],
    };
    (prismadb.crm_Contracts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockContract);

    const res = await getContract("c1");
    expect(res).toEqual(mockContract);
    expect(prismadb.crm_Contracts.findUnique).toHaveBeenCalledWith({
      where: { id: "c1", deletedAt: null },
      include: {
        assigned_account: { select: { id: true, name: true } },
        assigned_to_user: { select: { id: true, name: true } },
        lineItems: {
          include: {
            product: {
              select: { id: true, name: true, status: true },
            },
          },
          orderBy: { sort_order: "asc" },
        },
      },
    });
  });

  it("returns null when contract not found", async () => {
    mockUser("user");
    (prismadb.crm_Contracts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getContract("c1");
    expect(res).toBeNull();
  });
});
