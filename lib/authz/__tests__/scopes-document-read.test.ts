import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    documents: { findFirst: jest.fn(), findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  documentReadScopeWhere,
  assertCanReadDocument,
  assertCanWriteDocument,
  filterAuthorizedDocumentIds,
} from "../scopes/crm";

const findDoc = prismadb.documents.findFirst as jest.MockedFunction<
  typeof prismadb.documents.findFirst
>;
const findManyDoc = prismadb.documents.findMany as jest.MockedFunction<
  typeof prismadb.documents.findMany
>;

beforeEach(() => jest.clearAllMocks());

const linkedAccountOR = (uid: string) => ({
  OR: expect.arrayContaining([
    { assigned_to: uid },
    { createdBy: uid },
    { watchers: { some: { user_id: uid } } },
  ]),
});

describe("documentReadScopeWhere", () => {
  it("admin → only deletedAt:null", () => {
    expect(documentReadScopeWhere({ id: "x", role: "admin" })).toEqual({
      deletedAt: null,
    });
  });
  it("manager → only deletedAt:null", () => {
    expect(documentReadScopeWhere({ id: "x", role: "manager" })).toEqual({
      deletedAt: null,
    });
  });
  it("user → deletedAt + OR with all 8 branches", () => {
    const w = documentReadScopeWhere({ id: "u1", role: "user" }) as any;
    expect(w.deletedAt).toBeNull();
    expect(w.OR).toEqual(
      expect.arrayContaining([
        { created_by_user: "u1" },
        { createdBy: "u1" },
        { assigned_user: "u1" },
        { visibility: "public" },
        { accounts: { some: { account: { OR: linkedAccountOR("u1").OR } } } },
        {
          leads: {
            some: {
              lead: { OR: [{ assigned_to: "u1" }, { createdBy: "u1" }] },
            },
          },
        },
        {
          contacts: {
            some: {
              contact: {
                OR: [
                  { assigned_to: "u1" },
                  { createdBy: "u1" },
                ],
              },
            },
          },
        },
        {
          opportunities: {
            some: {
              opportunity: {
                OR: [
                  { assigned_to: "u1" },
                  { createdBy: "u1" },
                ],
              },
            },
          },
        },
      ]),
    );
    expect(w.OR).toHaveLength(8);
  });
});

describe("assertCanReadDocument", () => {
  it("admin: 200 hit", async () => {
    findDoc.mockResolvedValue({ id: "d1" } as any);
    await assertCanReadDocument({ id: "x", role: "admin" }, "d1");
    expect(findDoc).toHaveBeenCalledWith({
      where: { id: "d1", deletedAt: null },
      select: { id: true },
    });
  });
  it("user: scoped where (200 hit)", async () => {
    findDoc.mockResolvedValue({ id: "d1" } as any);
    await assertCanReadDocument({ id: "u1", role: "user" }, "d1");
    const arg = findDoc.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({ id: "d1", deletedAt: null });
    expect((arg.where as any).OR).toBeDefined();
  });
  it("throws AuthorizationError on miss (404)", async () => {
    findDoc.mockResolvedValue(null);
    await expect(
      assertCanReadDocument({ id: "u1", role: "user" }, "d1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanWriteDocument", () => {
  it("delegates to read scope (200 hit)", async () => {
    findDoc.mockResolvedValue({ id: "d1" } as any);
    await assertCanWriteDocument({ id: "u1", role: "user" }, "d1");
    expect(findDoc).toHaveBeenCalled();
  });
  it("throws on miss", async () => {
    findDoc.mockResolvedValue(null);
    await expect(
      assertCanWriteDocument({ id: "u1", role: "user" }, "d1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("filterAuthorizedDocumentIds", () => {
  it("empty list → returns [] without query", async () => {
    const result = await filterAuthorizedDocumentIds(
      { id: "u1", role: "user" },
      [],
    );
    expect(result).toEqual([]);
    expect(findManyDoc).not.toHaveBeenCalled();
  });
  it("admin: query uses deletedAt:null", async () => {
    findManyDoc.mockResolvedValue([{ id: "d1" }, { id: "d2" }] as any);
    const result = await filterAuthorizedDocumentIds(
      { id: "x", role: "admin" },
      ["d1", "d2", "d3"],
    );
    expect(findManyDoc).toHaveBeenCalledWith({
      where: { id: { in: ["d1", "d2", "d3"] }, deletedAt: null },
      select: { id: true },
    });
    expect(result).toEqual(["d1", "d2"]);
  });
  it("user: scoped where filters via OR", async () => {
    findManyDoc.mockResolvedValue([{ id: "d1" }] as any);
    const result = await filterAuthorizedDocumentIds(
      { id: "u1", role: "user" },
      ["d1", "d2"],
    );
    const arg = findManyDoc.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({
      id: { in: ["d1", "d2"] },
      deletedAt: null,
    });
    expect((arg.where as any).OR).toBeDefined();
    expect(result).toEqual(["d1"]);
  });
});
