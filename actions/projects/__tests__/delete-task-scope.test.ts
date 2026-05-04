jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn() },
    tasks: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() },
    tasksComments: { deleteMany: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { deleteTask } from "@/actions/projects/delete-task";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const args = { id: "t1" };

describe("deleteTask scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await deleteTask(args);
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.tasks.delete).not.toHaveBeenCalled();
  });

  it("task's board out-of-scope returns Forbidden (assignee not allowed for delete)", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await deleteTask(args);
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.tasks.delete).not.toHaveBeenCalled();
  });

  it("in-scope board owner deletes task", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      id: "t1",
      section: "s1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasksComments.deleteMany as jest.Mock).mockResolvedValue({});
    (prismadb.tasks.delete as jest.Mock).mockResolvedValue({});
    (prismadb.tasks.findMany as jest.Mock).mockResolvedValue([]);
    const res = await deleteTask(args);
    expect(res).toEqual({ success: true });
    expect(prismadb.tasks.delete).toHaveBeenCalled();
  });

  it("manager bare scope deletes task", async () => {
    mockUser("manager", "m1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      id: "t1",
      section: "s1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasksComments.deleteMany as jest.Mock).mockResolvedValue({});
    (prismadb.tasks.delete as jest.Mock).mockResolvedValue({});
    (prismadb.tasks.findMany as jest.Mock).mockResolvedValue([]);
    const res = await deleteTask(args);
    expect(res).toEqual({ success: true });
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
