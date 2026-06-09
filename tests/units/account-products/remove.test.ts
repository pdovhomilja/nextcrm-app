import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthenticated: vi.fn(),
  assertCanWriteAccount: vi.fn(),
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
    crm_AccountProducts: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { removeAssignment } from "@/actions/crm/account-products/remove-assignment";
import { AuthenticationError, AuthorizationError, assertCanWriteAccount, requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("removeAssignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (assertCanWriteAccount as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("AuthenticationError returns Unauthorized", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await removeAssignment("ap1");
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("returns error when assignment not found", async () => {
    mockUser("user");
    (prismadb.crm_AccountProducts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await removeAssignment("ap1");
    expect(res).toEqual({ error: "Not found" });
  });

  it("AuthorizationError returns Forbidden", async () => {
    mockUser("user");
    (prismadb.crm_AccountProducts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ap1",
      accountId: "a1",
    });
    (assertCanWriteAccount as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthorizationError());
    const res = await removeAssignment("ap1");
    expect(res).toEqual({ error: "Forbidden" });
  });

  it("cancels assignment successfully", async () => {
    mockUser("user");
    (prismadb.crm_AccountProducts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ap1",
      accountId: "a1",
    });
    (prismadb.crm_AccountProducts.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "ap1" });

    const res = await removeAssignment("ap1");
    expect(res).toEqual({ data: { id: "ap1" } });
    expect(prismadb.crm_AccountProducts.update).toHaveBeenCalledWith({
      where: { id: "ap1" },
      data: {
        status: "CANCELLED",
        updatedBy: "u1",
        v: { increment: 1 },
      },
    });
  });
});
