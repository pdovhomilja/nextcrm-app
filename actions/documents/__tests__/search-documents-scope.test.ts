jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: <T extends (...a: unknown[]) => unknown>(fn: T) => fn,
}));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    documents: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  },
}));
jest.mock("@/inngest/lib/embedding-utils", () => ({
  generateEmbedding: jest.fn(async () => [0.1, 0.2]),
  toVectorLiteral: jest.fn(() => "[0.1,0.2]"),
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { searchDocuments } from "@/actions/documents/search-documents";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("searchDocuments scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await searchDocuments("foo");
    expect(res).toEqual([]);
    expect(prismadb.documents.findMany).not.toHaveBeenCalled();
  });

  it("user role: keyword findMany where includes parent_document_id:null + deletedAt:null + OR scope + search OR", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.$queryRaw as jest.Mock).mockResolvedValue([]);
    await searchDocuments("invoice");
    const call = (prismadb.documents.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.parent_document_id).toBeNull();
    expect(call.where.deletedAt).toBeNull();
    expect(Array.isArray(call.where.OR)).toBe(true);
    expect(call.where.AND).toBeDefined();
    // search OR must be inside AND so it doesn't replace scope OR
    const andClauses = call.where.AND as Array<{ OR?: unknown[] }>;
    const searchClause = andClauses.find((c) =>
      Array.isArray(c.OR) && c.OR.some((x: any) => x.document_name),
    );
    expect(searchClause).toBeDefined();
  });

  it("manager: keyword findMany where = parent_document_id:null + deletedAt:null + AND[search OR]", async () => {
    mockUser("manager", "m1");
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.$queryRaw as jest.Mock).mockResolvedValue([]);
    await searchDocuments("invoice");
    const call = (prismadb.documents.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.parent_document_id).toBeNull();
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.OR).toBeUndefined();
  });

  it("post-filters vector results via authorized id set", async () => {
    mockUser("user", "u1");
    // Call order in searchDocuments: (1) keyword findMany, (2) findMany
    // inside filterAuthorizedDocumentIds, (3) extraDocs findMany by ids.
    (prismadb.documents.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // 1: keyword — empty
      .mockResolvedValueOnce([{ id: "v1" }, { id: "v3" }]) // 2: authz filter
      .mockResolvedValueOnce([
        { id: "v1", document_name: "v1", summary: null, document_system_type: null, accounts: [] },
        { id: "v3", document_name: "v3", summary: null, document_system_type: null, accounts: [] },
      ]); // 3: extraDocs
    // raw vector: 5 ids
    (prismadb.$queryRaw as jest.Mock).mockResolvedValue([
      { id: "v1", similarity: 0.9 },
      { id: "v2", similarity: 0.85 },
      { id: "v3", similarity: 0.83 },
      { id: "v4", similarity: 0.81 },
      { id: "v5", similarity: 0.75 },
    ]);

    const res = await searchDocuments("foo");
    const ids = res.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(["v1", "v3"]));
    expect(ids).not.toEqual(expect.arrayContaining(["v2", "v4", "v5"]));

    // The authz filter query receives all candidate ids…
    const filterCall = (prismadb.documents.findMany as jest.Mock).mock.calls[1][0];
    expect(filterCall.where.id.in).toEqual(["v1", "v2", "v3", "v4", "v5"]);
    // …and the extraDocs query must use only the authorized ids.
    const extraCall = (prismadb.documents.findMany as jest.Mock).mock.calls[2][0];
    expect(extraCall.where.id.in).toEqual(["v1", "v3"]);
  });
});
