jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn() },
    sections: { findMany: jest.fn() },
  },
}));
jest.mock("@/lib/junction-helpers", () => ({
  junctionTableHelpers: { includeWatchersWithUsers: () => ({}) },
  extractWatcherUsers: () => [],
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getBoard } from "@/actions/projects/get-board";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getBoard scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns null and does not query board", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getBoard("b1");
    expect(res).toBeNull();
    expect(prismadb.boards.findFirst).not.toHaveBeenCalled();
  });

  it("user out-of-scope: returns null (assert miss)", async () => {
    mockUser("user", "u1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValueOnce(null);
    const res = await getBoard("b1");
    expect(res).toBeNull();
    expect(prismadb.sections.findMany).not.toHaveBeenCalled();
  });

  it("user in-scope: assert passes, returns board+sections", async () => {
    mockUser("user", "u1");
    (prismadb.boards.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "b1" }) // assert
      .mockResolvedValueOnce({ id: "b1", title: "X" }); // detail
    (prismadb.sections.findMany as jest.Mock).mockResolvedValue([]);
    const res = await getBoard("b1");
    expect(res).toEqual({ board: { id: "b1", title: "X" }, sections: [] });
  });

  it("manager: assert where has no OR (bare scope)", async () => {
    mockUser("manager", "m1");
    (prismadb.boards.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "b1" })
      .mockResolvedValueOnce({ id: "b1" });
    (prismadb.sections.findMany as jest.Mock).mockResolvedValue([]);
    await getBoard("b1");
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
    expect(assertCall.where.deletedAt).toBeNull();
  });
});
