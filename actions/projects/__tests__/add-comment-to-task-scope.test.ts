jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn(), update: jest.fn() },
    boardWatchers: { findMany: jest.fn(async () => []) },
    sections: { findUnique: jest.fn() },
    tasks: { findUnique: jest.fn() },
    tasksComments: { create: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/junction-helpers", () => ({
  junctionTableHelpers: { addWatcher: jest.fn(() => ({})) },
}));
jest.mock("@/lib/resend", () => ({ __esModule: true, default: jest.fn(async () => null) }));
jest.mock("@/emails/NewTaskComment", () => ({ __esModule: true, default: () => null }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { addCommentToTask } from "@/actions/projects/add-comment-to-task";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const args = { taskId: "t1", comment: "hi" };

describe("addCommentToTask scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await addCommentToTask(args);
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.tasksComments.create).not.toHaveBeenCalled();
  });

  it("task's board out-of-scope returns Forbidden", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      id: "t1",
      section: "s1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await addCommentToTask(args);
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.tasksComments.create).not.toHaveBeenCalled();
  });

  it("in-scope board owner adds comment", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      id: "t1",
      title: "Task",
      section: "s1",
      createdBy: "u1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ board: "b1" });
    (prismadb.boards.update as jest.Mock).mockResolvedValue({});
    (prismadb.tasksComments.create as jest.Mock).mockResolvedValue({ id: "c1" });
    const res = await addCommentToTask(args);
    expect(res).toEqual({ data: { id: "c1" } });
  });

  it("manager bare scope adds comment", async () => {
    mockUser("manager", "m1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      id: "t1",
      title: "Task",
      section: "s1",
      createdBy: "m1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ board: "b1" });
    (prismadb.boards.update as jest.Mock).mockResolvedValue({});
    (prismadb.tasksComments.create as jest.Mock).mockResolvedValue({ id: "c1" });
    const res = await addCommentToTask(args);
    expect(res).toEqual({ data: { id: "c1" } });
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
