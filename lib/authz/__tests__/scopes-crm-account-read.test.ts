import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Accounts: { findFirst: jest.fn() } },
}));

import { prismadb } from "@/lib/prisma";
import {
  accountUserScopeOR,
  accountReadScopeWhere,
  assertCanReadAccount,
} from "../scopes/crm";

const find = prismadb.crm_Accounts.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Accounts.findFirst
>;
beforeEach(() => jest.clearAllMocks());

describe("accountUserScopeOR", () => {
  it("returns three OR clauses for the user id", () => {
    expect(accountUserScopeOR("u1")).toEqual([
      { assigned_to: "u1" },
      { createdBy: "u1" },
      { watchers: { some: { user_id: "u1" } } },
    ]);
  });
});

describe("accountReadScopeWhere", () => {
  it("admin / manager → only deletedAt:null", () => {
    expect(accountReadScopeWhere({ id: "x", role: "admin" })).toEqual({ deletedAt: null });
    expect(accountReadScopeWhere({ id: "x", role: "manager" })).toEqual({ deletedAt: null });
  });
  it("user → deletedAt + OR ownership clauses", () => {
    expect(accountReadScopeWhere({ id: "u1", role: "user" })).toMatchObject({
      deletedAt: null,
      OR: expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
        { watchers: { some: { user_id: "u1" } } },
      ]),
    });
  });
});

describe("assertCanReadAccount", () => {
  it("throws when not in scope", async () => {
    find.mockResolvedValue(null);
    await expect(assertCanReadAccount({ id: "u", role: "user" }, "a1"))
      .rejects.toBeInstanceOf(AuthorizationError);
  });
  it("admin: no OR clauses in where (just id + deletedAt)", async () => {
    find.mockResolvedValue({ id: "a1" } as any);
    await assertCanReadAccount({ id: "x", role: "admin" }, "a1");
    expect(find).toHaveBeenCalledWith({
      where: { id: "a1", deletedAt: null },
      select: { id: true },
    });
  });
});
