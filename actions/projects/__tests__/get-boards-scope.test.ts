jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findMany: jest.fn() },
  },
}));
jest.mock("@/lib/junction-helpers", () => ({
  junctionTableHelpers: {
    watchedByUser: () => ({ watchers: { some: { user_id: "x" } } }),
    includeWatchersWithUsers: () => ({}),
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getBoards } from "@/actions/projects/get-boards";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getBoards scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getBoards();
    expect(res).toEqual([]);
    expect(prismadb.boards.findMany).not.toHaveBeenCalled();
  });

  it("user role: where uses board read scope OR with deletedAt:null", async () => {
    mockUser("user", "u1");
    (prismadb.boards.findMany as jest.Mock).mockResolvedValue([]);
    await getBoards();
    const call = (prismadb.boards.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
    expect(Array.isArray(call.where.OR)).toBe(true);
    expect(call.where.OR.length).toBeGreaterThan(0);
  });

  it("user role: returns rows from findMany", async () => {
    mockUser("user", "u1");
    const rows = [{ id: "b1" }];
    (prismadb.boards.findMany as jest.Mock).mockResolvedValue(rows);
    const res = await getBoards();
    expect(res).toEqual(rows);
  });

  it("manager: where = deletedAt:null only (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.boards.findMany as jest.Mock).mockResolvedValue([]);
    await getBoards();
    const call = (prismadb.boards.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.OR).toBeUndefined();
  });
});
