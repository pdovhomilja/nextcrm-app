jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    tasks: { count: jest.fn(), create: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/resend", () => ({ __esModule: true, default: jest.fn(async () => null) }));
jest.mock("@/emails/NewTaskFromProject", () => ({ __esModule: true, default: () => null }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createTaskInBoard } from "@/actions/projects/create-task-in-board";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const args = {
  boardId: "b1",
  section: "s1",
  title: "T",
  priority: "normal",
  content: "C",
  user: "u1",
};

describe("createTaskInBoard scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await createTaskInBoard(args);
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.tasks.create).not.toHaveBeenCalled();
  });

  it("board out-of-scope returns Forbidden", async () => {
    mockUser("user", "u1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await createTaskInBoard(args);
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.tasks.create).not.toHaveBeenCalled();
  });

  it("in-scope owner creates task", async () => {
    mockUser("user", "u1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasks.count as jest.Mock).mockResolvedValue(0);
    (prismadb.tasks.create as jest.Mock).mockResolvedValue({ id: "t1" });
    (prismadb.boards.update as jest.Mock).mockResolvedValue({});
    const res = await createTaskInBoard(args);
    expect(res).toEqual({ success: true });
    expect(prismadb.tasks.create).toHaveBeenCalled();
  });

  it("manager bare scope creates task (quick-add path)", async () => {
    mockUser("manager", "m1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasks.count as jest.Mock).mockResolvedValue(0);
    (prismadb.tasks.create as jest.Mock).mockResolvedValue({ id: "t1" });
    (prismadb.boards.update as jest.Mock).mockResolvedValue({});
    const res = await createTaskInBoard({ boardId: "b1", section: "s1" });
    expect(res).toEqual({ success: true });
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
