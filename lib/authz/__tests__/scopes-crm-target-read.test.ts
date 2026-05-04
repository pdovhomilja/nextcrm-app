import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_TargetLists: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  targetReadScopeWhere,
  targetListReadScopeWhere,
  assertCanReadTargetList,
} from "../scopes/crm";

const findList = prismadb.crm_TargetLists.findFirst as jest.MockedFunction<
  typeof prismadb.crm_TargetLists.findFirst
>;

beforeEach(() => jest.clearAllMocks());

describe("targetReadScopeWhere", () => {
  it("admin/manager → { deletedAt: null }", () => {
    expect(targetReadScopeWhere({ id: "x", role: "admin" })).toEqual({ deletedAt: null });
    expect(targetReadScopeWhere({ id: "x", role: "manager" })).toEqual({ deletedAt: null });
  });
  it("user → { deletedAt: null, created_by: user.id }", () => {
    expect(targetReadScopeWhere({ id: "u1", role: "user" })).toEqual({
      deletedAt: null,
      created_by: "u1",
    });
  });
});

describe("targetListReadScopeWhere", () => {
  it("admin/manager → { deletedAt: null }", () => {
    expect(targetListReadScopeWhere({ id: "x", role: "admin" })).toEqual({
      deletedAt: null,
    });
    expect(targetListReadScopeWhere({ id: "x", role: "manager" })).toEqual({
      deletedAt: null,
    });
  });
  it("user → { deletedAt: null, created_by: user.id }", () => {
    expect(targetListReadScopeWhere({ id: "u1", role: "user" })).toEqual({
      deletedAt: null,
      created_by: "u1",
    });
  });
});

describe("assertCanReadTargetList", () => {
  it("admin: where { id, deletedAt:null }", async () => {
    findList.mockResolvedValue({ id: "tl1" } as any);
    await assertCanReadTargetList({ id: "x", role: "admin" }, "tl1");
    expect(findList).toHaveBeenCalledWith({
      where: { id: "tl1", deletedAt: null },
      select: { id: true },
    });
  });
  it("user: where merges created_by scope (200 hit)", async () => {
    findList.mockResolvedValue({ id: "tl1" } as any);
    await assertCanReadTargetList({ id: "u1", role: "user" }, "tl1");
    expect(findList).toHaveBeenCalledWith({
      where: { id: "tl1", deletedAt: null, created_by: "u1" },
      select: { id: true },
    });
  });
  it("throws AuthorizationError on miss (404)", async () => {
    findList.mockResolvedValue(null);
    await expect(
      assertCanReadTargetList({ id: "u1", role: "user" }, "tl1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
