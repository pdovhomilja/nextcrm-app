jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn() },
    sections: { findUnique: jest.fn() },
    tasks: { findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { updateKanbanPosition } from "@/actions/projects/update-kanban-position";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const args = {
  resourceList: [{ id: "t1" }],
  destinationList: [{ id: "t2" }],
  resourceSectionId: "s1",
  destinationSectionId: "s2",
};

describe("updateKanbanPosition scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await updateKanbanPosition(args);
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.tasks.update).not.toHaveBeenCalled();
  });

  it("assignee on every task can reorder even with out-of-scope board", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      user: "u1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.tasks.update as jest.Mock).mockResolvedValue({});
    const res = await updateKanbanPosition(args);
    expect(res).toEqual({ success: true });
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
    const res = await updateKanbanPosition(args);
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.tasks.update).not.toHaveBeenCalled();
  });

  it("board owner reorders", async () => {
    mockUser("user", "u2");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      user: "u1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasks.update as jest.Mock).mockResolvedValue({});
    const res = await updateKanbanPosition(args);
    expect(res).toEqual({ success: true });
  });

  it("manager bare scope reorders", async () => {
    mockUser("manager", "m1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      user: "u1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasks.update as jest.Mock).mockResolvedValue({});
    const res = await updateKanbanPosition(args);
    expect(res).toEqual({ success: true });
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
