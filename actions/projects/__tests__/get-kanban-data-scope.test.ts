jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn(), findUnique: jest.fn() },
    sections: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getKanbanData } from "@/actions/projects/get-kanban-data";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getKanbanData scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns empty shape", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getKanbanData("b1");
    expect(res).toEqual({ board: null, sections: [] });
    expect(prismadb.boards.findUnique).not.toHaveBeenCalled();
  });

  it("user out-of-scope: returns empty shape", async () => {
    mockUser("user", "u1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getKanbanData("b1");
    expect(res).toEqual({ board: null, sections: [] });
    expect(prismadb.boards.findUnique).not.toHaveBeenCalled();
  });

  it("user in-scope: returns board + sections", async () => {
    mockUser("user", "u1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.boards.findUnique as jest.Mock).mockResolvedValue({ id: "b1", title: "X" });
    (prismadb.sections.findMany as jest.Mock).mockResolvedValue([{ id: "s1" }]);
    const res = await getKanbanData("b1");
    expect(res).toEqual({ board: { id: "b1", title: "X" }, sections: [{ id: "s1" }] });
  });

  it("manager: assert bare, returns data", async () => {
    mockUser("manager", "m1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.boards.findUnique as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.sections.findMany as jest.Mock).mockResolvedValue([]);
    await getKanbanData("b1");
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
