jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn() },
    sections: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getBoardSections } from "@/actions/projects/get-board-sections";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getBoardSections scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns []", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getBoardSections("b1");
    expect(res).toEqual([]);
    expect(prismadb.sections.findMany).not.toHaveBeenCalled();
  });

  it("user out-of-scope: returns []", async () => {
    mockUser("user", "u1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getBoardSections("b1");
    expect(res).toEqual([]);
    expect(prismadb.sections.findMany).not.toHaveBeenCalled();
  });

  it("user in-scope: returns sections", async () => {
    mockUser("user", "u1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.sections.findMany as jest.Mock).mockResolvedValue([{ id: "s1" }]);
    const res = await getBoardSections("b1");
    expect(res).toEqual([{ id: "s1" }]);
  });

  it("manager: assert bare scope, returns sections", async () => {
    mockUser("manager", "m1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.sections.findMany as jest.Mock).mockResolvedValue([]);
    await getBoardSections("b1");
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
