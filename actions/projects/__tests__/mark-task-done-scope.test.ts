jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn() },
    tasks: { findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { markTaskDone } from "@/actions/projects/mark-task-done";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("markTaskDone scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await markTaskDone("t1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.tasks.update).not.toHaveBeenCalled();
  });

  it("assignee can mark done even when board is out-of-scope", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      user: "u1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.tasks.update as jest.Mock).mockResolvedValue({ id: "t1" });
    const res = await markTaskDone("t1");
    expect(res).toEqual({ success: true });
    // assignee bypass: no board lookup needed
    expect(prismadb.boards.findFirst).not.toHaveBeenCalled();
    expect(prismadb.tasks.update).toHaveBeenCalled();
  });

  it("non-assignee user with board out-of-scope: Forbidden", async () => {
    mockUser("user", "u2");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      user: "u1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await markTaskDone("t1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.tasks.update).not.toHaveBeenCalled();
  });

  it("board owner (non-assignee) can mark done", async () => {
    mockUser("user", "u2");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      user: "u1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasks.update as jest.Mock).mockResolvedValue({ id: "t1" });
    const res = await markTaskDone("t1");
    expect(res).toEqual({ success: true });
  });

  it("manager bare scope marks done", async () => {
    mockUser("manager", "m1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      user: "u1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasks.update as jest.Mock).mockResolvedValue({ id: "t1" });
    const res = await markTaskDone("t1");
    expect(res).toEqual({ success: true });
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
