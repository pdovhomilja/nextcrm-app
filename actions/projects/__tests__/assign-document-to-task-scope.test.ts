jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn() },
    documents: { findFirst: jest.fn() },
    documentsToTasks: { create: jest.fn() },
    tasks: { findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { assignDocumentToTask } from "@/actions/projects/assign-document-to-task";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const args = { documentId: "d1", taskId: "t1" };

describe("assignDocumentToTask scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await assignDocumentToTask(args);
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.documentsToTasks.create).not.toHaveBeenCalled();
  });

  it("task out-of-scope (non-assignee, board denied): Forbidden", async () => {
    mockUser("user", "u2");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      user: "u1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await assignDocumentToTask(args);
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.documentsToTasks.create).not.toHaveBeenCalled();
  });

  it("task ok but document unreadable: Forbidden", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      user: "u1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await assignDocumentToTask(args);
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.documentsToTasks.create).not.toHaveBeenCalled();
  });

  it("assignee + readable document succeeds (assignee bypass)", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      user: "u1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "d1" });
    (prismadb.documentsToTasks.create as jest.Mock).mockResolvedValue({});
    (prismadb.tasks.update as jest.Mock).mockResolvedValue({});
    const res = await assignDocumentToTask(args);
    expect(res).toEqual({ success: true });
    expect(prismadb.documentsToTasks.create).toHaveBeenCalled();
  });

  it("manager bare scope succeeds", async () => {
    mockUser("manager", "m1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      user: "u1",
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "d1" });
    (prismadb.documentsToTasks.create as jest.Mock).mockResolvedValue({});
    (prismadb.tasks.update as jest.Mock).mockResolvedValue({});
    const res = await assignDocumentToTask(args);
    expect(res).toEqual({ success: true });
  });
});
