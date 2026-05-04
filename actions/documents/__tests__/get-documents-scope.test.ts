jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: <T extends (...a: unknown[]) => unknown>(fn: T) => fn,
}));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    documents: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getDocuments } from "@/actions/documents/get-documents";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getDocuments scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getDocuments();
    expect(res).toEqual([]);
    expect(prismadb.documents.findMany).not.toHaveBeenCalled();
  });

  it("user role: where contains parent_document_id:null + deletedAt:null + OR scope", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([]);
    await getDocuments();
    const call = (prismadb.documents.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.parent_document_id).toBeNull();
    expect(call.where.deletedAt).toBeNull();
    expect(Array.isArray(call.where.OR)).toBe(true);
    expect(call.where.OR.length).toBeGreaterThan(0);
  });

  it("user role: returns rows from findMany", async () => {
    mockUser("user", "u1");
    const rows = [{ id: "d1" }];
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue(rows);
    const res = await getDocuments();
    expect(res).toEqual(rows);
  });

  it("manager: where = parent_document_id:null + deletedAt:null (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([]);
    await getDocuments();
    const call = (prismadb.documents.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.parent_document_id).toBeNull();
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.OR).toBeUndefined();
  });
});
