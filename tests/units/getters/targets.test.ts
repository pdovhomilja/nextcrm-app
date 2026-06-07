import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthenticated: vi.fn(),
  assertCanReadTarget: vi.fn(),
  targetReadScopeWhere: vi.fn(() => ({})),
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
    crm_Targets: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { getTarget } from "@/actions/crm/get-target";
import { getTargets } from "@/actions/crm/get-targets";
import { AuthenticationError, AuthorizationError, assertCanReadTarget, requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("getTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (assertCanReadTarget as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("returns null for invalid UUID format", async () => {
    const res = await getTarget("invalid-id");
    expect(res).toBeNull();
    expect(prismadb.crm_Targets.findUnique).not.toHaveBeenCalled();
  });

  it("AuthenticationError returns null", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getTarget("550e8400-e29b-41d4-a716-446655440000");
    expect(res).toBeNull();
  });

  it("AuthorizationError returns null", async () => {
    mockUser("user");
    (assertCanReadTarget as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthorizationError());
    const res = await getTarget("550e8400-e29b-41d4-a716-446655440000");
    expect(res).toBeNull();
  });

  it("finds target by id with correct include shape", async () => {
    mockUser("user");
    const mockTarget = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Target 1",
      crate_by_user: { name: "Admin" },
      target_lists: [],
      target_contacts: [],
    };
    (prismadb.crm_Targets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockTarget);
    const res = await getTarget("550e8400-e29b-41d4-a716-446655440000");
    expect(res).toEqual(mockTarget);
  });
});

describe("getTargets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthenticationError returns empty array", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getTargets();
    expect(res).toEqual([]);
  });

  it("returns targets with scope", async () => {
    mockUser("user");
    const targets = [
      {
        id: "t1",
        name: "Target 1",
        crate_by_user: { name: "Admin" },
        target_lists: [],
      },
    ];
    (prismadb.crm_Targets.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(targets);
    const res = await getTargets();
    expect(res).toEqual(targets);
  });
});
