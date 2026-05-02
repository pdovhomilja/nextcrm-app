jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn(),
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getSimilarAccounts } from "../get-similar-accounts";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

beforeEach(() => jest.clearAllMocks());

describe("getSimilarAccounts scope", () => {
  it("unauthenticated → empty records, no SQL", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getSimilarAccounts("a1");
    expect(res).toEqual({ status: "ok", records: [] });
    expect(prismadb.$queryRaw).not.toHaveBeenCalled();
  });

  it("user can't read base record → empty records, no SQL", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getSimilarAccounts("a1");
    expect(res).toEqual({ status: "ok", records: [] });
    expect(prismadb.$queryRaw).not.toHaveBeenCalled();
  });

  it("in-scope user: returns only authorized similar candidates", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ embedding: "[0.1]" }]) // source embedding
      .mockResolvedValueOnce([
        { id: "x1", name: "X1", email: null, similarity: 0.9 },
        { id: "x2", name: "X2", email: null, similarity: 0.8 },
        { id: "x3", name: "X3", email: null, similarity: 0.7 },
        { id: "x4", name: "X4", email: null, similarity: 0.6 },
        { id: "x5", name: "X5", email: null, similarity: 0.5 },
      ]);
    (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([
      { id: "x2" },
      { id: "x4" },
    ]);

    const res = await getSimilarAccounts("a1", 5);
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.records.map((r) => r.id)).toEqual(["x2", "x4"]);
  });

  it("manager: filter returns all candidates (unfiltered)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ embedding: "[0.1]" }])
      .mockResolvedValueOnce([
        { id: "x1", name: "X1", email: null, similarity: 0.9 },
        { id: "x2", name: "X2", email: null, similarity: 0.8 },
      ]);
    (prismadb.crm_Accounts.findMany as jest.Mock).mockResolvedValue([
      { id: "x1" },
      { id: "x2" },
    ]);

    const res = await getSimilarAccounts("a1", 5);
    expect(res.status).toBe("ok");
    if (res.status !== "ok") return;
    expect(res.records.map((r) => r.id)).toEqual(["x1", "x2"]);
  });

  it("returns no_embedding when source has no embedding", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.$queryRaw as jest.Mock).mockResolvedValueOnce([]);
    const res = await getSimilarAccounts("a1");
    expect(res).toEqual({ status: "no_embedding" });
  });
});
