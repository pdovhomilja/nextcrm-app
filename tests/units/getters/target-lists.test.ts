import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthenticated: vi.fn(),
  assertCanReadTargetList: vi.fn(),
  targetListReadScopeWhere: vi.fn(() => ({})),
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
    crm_TargetLists: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { getTargetList } from "@/actions/crm/get-target-list";
import { getTargetLists } from "@/actions/crm/get-target-lists";
import { AuthenticationError, AuthorizationError, assertCanReadTargetList, requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("getTargetList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (assertCanReadTargetList as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("AuthenticationError returns null", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getTargetList("tl1");
    expect(res).toBeNull();
  });

  it("AuthorizationError returns null", async () => {
    mockUser("user");
    (assertCanReadTargetList as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthorizationError());
    const res = await getTargetList("tl1");
    expect(res).toBeNull();
  });

  it("finds target list by id", async () => {
    mockUser("user");
    const mockList = {
      id: "tl1",
      name: "List 1",
      crate_by_user: { name: "Admin" },
      targets: [],
    };
    (prismadb.crm_TargetLists.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockList);
    const res = await getTargetList("tl1");
    expect(res).toEqual(mockList);
  });
});

describe("getTargetLists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthenticationError returns empty array", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getTargetLists();
    expect(res).toEqual([]);
  });

  it("returns target lists with scope", async () => {
    mockUser("user");
    const lists = [
      {
        id: "tl1",
        name: "List 1",
        crate_by_user: { name: "Admin" },
        _count: { targets: 5 },
      },
    ];
    (prismadb.crm_TargetLists.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(lists);
    const res = await getTargetLists();
    expect(res).toEqual(lists);
  });
});
