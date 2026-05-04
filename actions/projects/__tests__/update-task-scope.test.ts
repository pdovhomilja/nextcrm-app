jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    tasks: { findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/resend", () => ({ __esModule: true, default: jest.fn(async () => null) }));
jest.mock("@/emails/UpdatedTaskFromProject", () => ({ __esModule: true, default: () => null }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { updateTask } from "@/actions/projects/update-task";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const args = {
  taskId: "t1",
  title: "T",
  user: "u1",
  priority: "normal",
  content: "C",
};

describe("updateTask scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await updateTask(args);
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.tasks.update).not.toHaveBeenCalled();
  });

  it("task's board out-of-scope returns Forbidden (assignee not allowed for full update)", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await updateTask(args);
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.tasks.update).not.toHaveBeenCalled();
  });

  it("in-scope board owner updates task", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasks.update as jest.Mock).mockResolvedValue({ id: "t1" });
    const res = await updateTask(args);
    expect(res).toEqual({ success: true });
    expect(prismadb.tasks.update).toHaveBeenCalled();
  });

  it("manager bare scope updates task", async () => {
    mockUser("manager", "m1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasks.update as jest.Mock).mockResolvedValue({ id: "t1" });
    const res = await updateTask(args);
    expect(res).toEqual({ success: true });
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
