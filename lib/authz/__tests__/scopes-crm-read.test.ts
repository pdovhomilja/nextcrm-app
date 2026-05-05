import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contacts: { findFirst: jest.fn(), findMany: jest.fn() },
    crm_Targets: { findFirst: jest.fn(), findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  assertCanReadContact,
  assertCanWriteContact,
  assertCanReadTarget,
  assertCanWriteTarget,
  filterAuthorizedContactIds,
  filterAuthorizedTargetIds,
} from "../scopes/crm";

const findContact = prismadb.crm_Contacts.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Contacts.findFirst
>;
const findTarget = prismadb.crm_Targets.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Targets.findFirst
>;

beforeEach(() => jest.clearAllMocks());

describe("assertCanReadContact", () => {
  it("admin: where with deletedAt:null, resolves on hit", async () => {
    findContact.mockResolvedValue({ id: "c1" } as any);
    await expect(
      assertCanReadContact({ id: "u", role: "admin" }, "c1"),
    ).resolves.toBeUndefined();
    expect(findContact).toHaveBeenCalledWith({
      where: { id: "c1", deletedAt: null },
      select: { id: true },
    });
  });

  it("manager: where with deletedAt:null, resolves on hit", async () => {
    findContact.mockResolvedValue({ id: "c1" } as any);
    await assertCanReadContact({ id: "u", role: "manager" }, "c1");
    expect(findContact).toHaveBeenCalledWith({
      where: { id: "c1", deletedAt: null },
      select: { id: true },
    });
  });

  it("user: scoped where with ownership OR clauses", async () => {
    findContact.mockResolvedValue({ id: "c1" } as any);
    await assertCanReadContact({ id: "u3", role: "user" }, "c1");
    const arg = findContact.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({
      id: "c1",
      OR: expect.arrayContaining([
        { assigned_to: "u3" },
        { createdBy: "u3" },
      ]),
    });
  });

  it("user: scoped where ALSO contains linked-account branch (D2 upgrade)", async () => {
    findContact.mockResolvedValue({ id: "c1" } as any);
    await assertCanReadContact({ id: "u3", role: "user" }, "c1");
    const arg = findContact.mock.calls[0][0]!;
    expect((arg.where as any).OR).toEqual(
      expect.arrayContaining([
        {
          assigned_accounts: {
            OR: expect.arrayContaining([
              { assigned_to: "u3" },
              { createdBy: "u3" },
              { watchers: { some: { user_id: "u3" } } },
            ]),
          },
        },
      ]),
    );
  });

  it("throws AuthorizationError when no row", async () => {
    findContact.mockResolvedValue(null);
    await expect(
      assertCanReadContact({ id: "u3", role: "user" }, "c1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanWriteContact", () => {
  it("user: same scope as read for now (Phase D may diverge)", async () => {
    findContact.mockResolvedValue({ id: "c1" } as any);
    await assertCanWriteContact({ id: "u3", role: "user" }, "c1");
    const arg = findContact.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({
      id: "c1",
      OR: expect.arrayContaining([
        { assigned_to: "u3" },
        { createdBy: "u3" },
      ]),
    });
  });

  it("throws AuthorizationError when no row", async () => {
    findContact.mockResolvedValue(null);
    await expect(
      assertCanWriteContact({ id: "u3", role: "user" }, "c1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanReadTarget", () => {
  it("admin: bare where", async () => {
    findTarget.mockResolvedValue({ id: "t1" } as any);
    await assertCanReadTarget({ id: "u", role: "admin" }, "t1");
    expect(findTarget).toHaveBeenCalledWith({
      where: { id: "t1" },
      select: { id: true },
    });
  });

  it("user: scoped to created_by", async () => {
    findTarget.mockResolvedValue({ id: "t1" } as any);
    await assertCanReadTarget({ id: "u3", role: "user" }, "t1");
    expect(findTarget).toHaveBeenCalledWith({
      where: { id: "t1", created_by: "u3" },
      select: { id: true },
    });
  });

  it("throws AuthorizationError on miss", async () => {
    findTarget.mockResolvedValue(null);
    await expect(
      assertCanReadTarget({ id: "u3", role: "user" }, "t1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanWriteTarget", () => {
  it("user: scoped to created_by", async () => {
    findTarget.mockResolvedValue({ id: "t1" } as any);
    await assertCanWriteTarget({ id: "u3", role: "user" }, "t1");
    expect(findTarget).toHaveBeenCalledWith({
      where: { id: "t1", created_by: "u3" },
      select: { id: true },
    });
  });

  it("throws on miss", async () => {
    findTarget.mockResolvedValue(null);
    await expect(
      assertCanWriteTarget({ id: "u3", role: "user" }, "t1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("filterAuthorizedContactIds", () => {
  it("admin: returns all input ids that exist (queries with deletedAt:null)", async () => {
    (prismadb.crm_Contacts.findMany as jest.Mock) =
      jest.fn().mockResolvedValue([{ id: "a" }, { id: "b" }]);
    const out = await filterAuthorizedContactIds(
      { id: "u", role: "admin" },
      ["a", "b", "c"],
    );
    expect(out).toEqual(["a", "b"]);
    expect(prismadb.crm_Contacts.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["a", "b", "c"] }, deletedAt: null },
      select: { id: true },
    });
  });

  it("user: scoped where with OR clauses (D2 upgrade includes linked-account)", async () => {
    (prismadb.crm_Contacts.findMany as jest.Mock) =
      jest.fn().mockResolvedValue([{ id: "a" }]);
    await filterAuthorizedContactIds(
      { id: "u3", role: "user" },
      ["a", "b"],
    );
    const arg = (prismadb.crm_Contacts.findMany as jest.Mock).mock.calls[0][0];
    expect(arg.where).toMatchObject({
      id: { in: ["a", "b"] },
      deletedAt: null,
      OR: expect.arrayContaining([
        { assigned_to: "u3" },
        { createdBy: "u3" },
        {
          assigned_accounts: {
            OR: expect.arrayContaining([
              { assigned_to: "u3" },
              { createdBy: "u3" },
              { watchers: { some: { user_id: "u3" } } },
            ]),
          },
        },
      ]),
    });
  });

  it("returns empty array when input is empty (no DB call)", async () => {
    const fn = jest.fn();
    (prismadb.crm_Contacts.findMany as jest.Mock) = fn;
    const out = await filterAuthorizedContactIds(
      { id: "u", role: "user" },
      [],
    );
    expect(out).toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("filterAuthorizedTargetIds", () => {
  it("user: scoped to created_by", async () => {
    (prismadb.crm_Targets.findMany as jest.Mock) =
      jest.fn().mockResolvedValue([{ id: "t1" }]);
    await filterAuthorizedTargetIds({ id: "u3", role: "user" }, ["t1", "t2"]);
    expect(prismadb.crm_Targets.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["t1", "t2"] }, created_by: "u3" },
      select: { id: true },
    });
  });
});
