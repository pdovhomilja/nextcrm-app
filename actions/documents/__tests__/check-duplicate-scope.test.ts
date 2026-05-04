jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: <T extends (...a: unknown[]) => unknown>(fn: T) => fn,
}));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    documents: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { checkDuplicate } from "@/actions/documents/check-duplicate";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("checkDuplicate scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns isDuplicate:false without query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await checkDuplicate("hash1");
    expect(res).toEqual({ isDuplicate: false });
    expect(prismadb.documents.findFirst).not.toHaveBeenCalled();
  });

  it("user role: where includes content_hash + deletedAt:null + scope OR", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue(null);
    await checkDuplicate("hash1");
    const call = (prismadb.documents.findFirst as jest.Mock).mock.calls[0][0];
    expect(call.where.content_hash).toBe("hash1");
    expect(call.where.deletedAt).toBeNull();
    expect(Array.isArray(call.where.OR)).toBe(true);
  });

  it("user role: out-of-scope returns isDuplicate:false (findFirst null)", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await checkDuplicate("hash1");
    expect(res.isDuplicate).toBe(false);
  });

  it("user role: in-scope returns existing doc", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({
      id: "d1",
      document_name: "n",
      createdAt: null,
      accounts: [],
    });
    const res = await checkDuplicate("hash1");
    expect(res.isDuplicate).toBe(true);
    expect(res.existingDocument?.id).toBe("d1");
  });

  it("manager: where = content_hash + deletedAt:null (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue(null);
    await checkDuplicate("hash1");
    const call = (prismadb.documents.findFirst as jest.Mock).mock.calls[0][0];
    expect(call.where.content_hash).toBe("hash1");
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.OR).toBeUndefined();
  });
});
