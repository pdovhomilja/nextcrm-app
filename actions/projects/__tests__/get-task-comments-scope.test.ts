jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn() },
    tasks: { findUnique: jest.fn() },
    tasksComments: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getTaskComments } from "@/actions/projects/get-task-comments";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getTaskComments scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns []", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getTaskComments("t1");
    expect(res).toEqual([]);
    expect(prismadb.tasksComments.findMany).not.toHaveBeenCalled();
  });

  it("user out-of-scope: returns []", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getTaskComments("t1");
    expect(res).toEqual([]);
    expect(prismadb.tasksComments.findMany).not.toHaveBeenCalled();
  });

  it("user in-scope: returns comments", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasksComments.findMany as jest.Mock).mockResolvedValue([{ id: "c1" }]);
    const res = await getTaskComments("t1");
    expect(res).toEqual([{ id: "c1" }]);
  });

  it("manager: bare scope, returns comments", async () => {
    mockUser("manager", "m1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasksComments.findMany as jest.Mock).mockResolvedValue([]);
    await getTaskComments("t1");
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
