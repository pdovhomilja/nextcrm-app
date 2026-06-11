import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts_Tasks: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    tasksComments: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    documentsToCrmAccountsTasks: {
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { addComment } from "@/actions/crm/tasks/add-comment";
import { assignDocumentToCrmTask, disconnectDocumentFromCrmTask } from "@/actions/crm/tasks/assign-document";
import { deleteTask } from "@/actions/crm/tasks/delete-task";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("addComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await addComment({ taskId: "t1", comment: "Nice" });
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("missing taskId returns error", async () => {
    const res = await addComment({ taskId: "", comment: "Nice" });
    expect(res).toEqual({ error: "taskId is required" });
  });

  it("missing comment returns error", async () => {
    const res = await addComment({ taskId: "t1", comment: "" });
    expect(res).toEqual({ error: "comment is required" });
  });

  it("returns error when task not found", async () => {
    (prismadb.crm_Accounts_Tasks.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await addComment({ taskId: "t1", comment: "Nice" });
    expect(res).toEqual({ error: "Task not found" });
  });

  it("adds comment successfully", async () => {
    (prismadb.crm_Accounts_Tasks.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "t1" });
    (prismadb.tasksComments.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1", comment: "Nice" });
    const res = await addComment({ taskId: "t1", comment: "Nice" });
    expect(res).toEqual({ data: { id: "c1", comment: "Nice" } });
  });
});

describe("assignDocumentToCrmTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await assignDocumentToCrmTask({ documentId: "d1", taskId: "t1" });
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("missing documentId returns error", async () => {
    const res = await assignDocumentToCrmTask({ documentId: "", taskId: "t1" });
    expect(res).toEqual({ error: "Missing document ID" });
  });

  it("missing taskId returns error", async () => {
    const res = await assignDocumentToCrmTask({ documentId: "d1", taskId: "" });
    expect(res).toEqual({ error: "Missing task ID" });
  });

  it("returns error when task not found", async () => {
    (prismadb.crm_Accounts_Tasks.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await assignDocumentToCrmTask({ documentId: "d1", taskId: "t1" });
    expect(res).toEqual({ error: "CRM task not found" });
  });

  it("assigns document successfully", async () => {
    (prismadb.crm_Accounts_Tasks.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "t1" });
    (prismadb.documentsToCrmAccountsTasks.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await assignDocumentToCrmTask({ documentId: "d1", taskId: "t1" });
    expect(res).toEqual({ success: true });
  });
});

describe("disconnectDocumentFromCrmTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("disconnects document successfully", async () => {
    (prismadb.crm_Accounts_Tasks.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "t1" });
    (prismadb.documentsToCrmAccountsTasks.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await disconnectDocumentFromCrmTask({
      documentId: "d1",
      taskId: "t1",
    });
    expect(res).toEqual({ success: true });
  });
});

describe("deleteTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await deleteTask("t1");
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("missing taskId returns error", async () => {
    const res = await deleteTask("");
    expect(res).toEqual({ error: "taskId is required" });
  });

  it("deletes task with comments and documents", async () => {
    (prismadb.tasksComments.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });
    (prismadb.documentsToCrmAccountsTasks.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
    (prismadb.crm_Accounts_Tasks.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "t1" });

    const res = await deleteTask("t1");
    expect(res).toEqual({ success: true });
    expect(prismadb.tasksComments.deleteMany).toHaveBeenCalledWith({
      where: { assigned_crm_account_task: "t1" },
    });
    expect(prismadb.documentsToCrmAccountsTasks.deleteMany).toHaveBeenCalledWith({
      where: { crm_accounts_task_id: "t1" },
    });
  });
});
