jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: <T extends (...a: unknown[]) => unknown>(fn: T) => fn,
}));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    documents: { findMany: jest.fn(), findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getDocumentVersions } from "@/actions/documents/get-document-versions";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getDocumentVersions scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] without query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getDocumentVersions("d1");
    expect(res).toEqual([]);
    expect(prismadb.documents.findMany).not.toHaveBeenCalled();
  });

  it("out-of-scope (assertCanReadDocument throws): returns []", async () => {
    mockUser("user", "u1");
    // assertCanReadDocument: parent lookup returns null → AuthorizationError
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getDocumentVersions("d1");
    expect(res).toEqual([]);
    expect(prismadb.documents.findMany).not.toHaveBeenCalled();
  });

  it("in-scope: returns version rows", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "d1" });
    const rows = [{ id: "d1", version: 2 }, { id: "v1", version: 1 }];
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue(rows);
    const res = await getDocumentVersions("d1");
    expect(res).toEqual(rows);
  });

  it("manager: assertCanReadDocument hits → returns versions", async () => {
    mockUser("manager", "m1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "d1" });
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([]);
    const res = await getDocumentVersions("d1");
    expect(res).toEqual([]);
  });
});
