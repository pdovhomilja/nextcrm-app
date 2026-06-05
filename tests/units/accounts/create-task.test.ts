import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts_Tasks: { create: vi.fn() },
    users: { findUnique: vi.fn() },
    accountWatchers: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/resend", () => ({
  default: vi.fn().mockResolvedValue({
    emails: {
      send: vi.fn().mockResolvedValue({}),
    },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/emails/NewTaskFromCRM", () => ({
  default: vi.fn(() => null),
}));

vi.mock("@/emails/NewTaskFromCRMToWatchers", () => ({
  default: vi.fn(() => null),
}));

import { createTask } from "@/actions/crm/accounts/create-task";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import resendHelper from "@/lib/resend";

const mockUser = (id = "u1", name = "User", language = "en") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id, name, userLanguage: language },
  });
};

describe("createTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
    (resendHelper as ReturnType<typeof vi.fn>).mockResolvedValue({
      emails: {
        send: vi.fn().mockResolvedValue({}),
      },
    });
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await createTask({
      title: "Task",
      user: "u1",
      priority: "high",
      content: "Content",
      account: "a1",
    });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_Accounts_Tasks.create).not.toHaveBeenCalled();
  });

  it("missing title returns error", async () => {
    const res = await createTask({
      title: "",
      user: "u1",
      priority: "high",
      content: "Content",
      account: "a1",
    });
    expect(res).toEqual({ error: "Missing one of the task data" });
  });

  it("missing user returns error", async () => {
    const res = await createTask({
      title: "Task",
      user: "",
      priority: "high",
      content: "Content",
      account: "a1",
    });
    expect(res).toEqual({ error: "Missing one of the task data" });
  });

  it("missing priority returns error", async () => {
    const res = await createTask({
      title: "Task",
      user: "u1",
      priority: "",
      content: "Content",
      account: "a1",
    });
    expect(res).toEqual({ error: "Missing one of the task data" });
  });

  it("missing content returns error", async () => {
    const res = await createTask({
      title: "Task",
      user: "u1",
      priority: "high",
      content: "",
      account: "a1",
    });
    expect(res).toEqual({ error: "Missing one of the task data" });
  });

  it("missing account returns error", async () => {
    const res = await createTask({
      title: "Task",
      user: "u1",
      priority: "high",
      content: "Content",
      account: "",
    });
    expect(res).toEqual({ error: "Missing one of the task data" });
  });

  it("resend helper error returns error message", async () => {
    (resendHelper as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Resend not configured"));
    const res = await createTask({
      title: "Task",
      user: "u1",
      priority: "high",
      content: "Content",
      account: "a1",
    });
    expect(res).toEqual({ error: "Resend not configured" });
  });

  it("creates task with correct data", async () => {
    const mockTask = { id: "t1", title: "Task", v: 0 };
    (prismadb.crm_Accounts_Tasks.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockTask);
    const res = await createTask({
      title: "Task",
      user: "u1",
      priority: "high",
      content: "Content",
      account: "a1",
      dueDateAt: new Date("2024-01-01"),
    });
    expect(res).toEqual({ data: mockTask });
    expect(prismadb.crm_Accounts_Tasks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        v: 0,
        priority: "high",
        title: "Task",
        content: "Content",
        account: "a1",
        dueDateAt: expect.any(Date),
        createdBy: "u1",
        updatedBy: "u1",
        user: "u1",
        taskStatus: "ACTIVE",
      }),
    });
  });

  it("creates task without dueDateAt", async () => {
    const mockTask = { id: "t1", title: "Task" };
    (prismadb.crm_Accounts_Tasks.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockTask);
    const res = await createTask({
      title: "Task",
      user: "u1",
      priority: "high",
      content: "Content",
      account: "a1",
    });
    expect(res).toEqual({ data: mockTask });
    const call = (prismadb.crm_Accounts_Tasks.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.data.dueDateAt).toBeUndefined();
  });

  it("sends notification when user differs from session user", async () => {
    mockUser("u1", "Admin", "en");
    const resendMock = {
      emails: { send: vi.fn().mockResolvedValue({}) },
    };
    (resendHelper as ReturnType<typeof vi.fn>).mockResolvedValue(resendMock);
    (prismadb.crm_Accounts_Tasks.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "t1", title: "Task" });
    (prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u2",
      email: "u2@test.com",
      name: "User 2",
      userLanguage: "en",
    });
    await createTask({
      title: "Task",
      user: "u2",
      priority: "high",
      content: "Content",
      account: "a1",
    });
    expect(prismadb.users.findUnique).toHaveBeenCalledWith({
      where: { id: "u2" },
    });
    expect(resendMock.emails.send).toHaveBeenCalled();
  });

  it("does NOT send notification when user equals session user", async () => {
    mockUser("u1", "Admin", "en");
    const resendMock = {
      emails: { send: vi.fn().mockResolvedValue({}) },
    };
    (resendHelper as ReturnType<typeof vi.fn>).mockResolvedValue(resendMock);
    (prismadb.crm_Accounts_Tasks.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "t1", title: "Task" });
    await createTask({
      title: "Task",
      user: "u1",
      priority: "high",
      content: "Content",
      account: "a1",
    });
    expect(prismadb.users.findUnique).not.toHaveBeenCalled();
    expect(resendMock.emails.send).not.toHaveBeenCalled();
  });

  it("sends notifications to account watchers", async () => {
    mockUser("u1", "Admin", "en");
    const resendMock = {
      emails: { send: vi.fn().mockResolvedValue({}) },
    };
    (resendHelper as ReturnType<typeof vi.fn>).mockResolvedValue(resendMock);
    (prismadb.crm_Accounts_Tasks.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "t1", title: "Task" });
    (prismadb.accountWatchers.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        user: {
          id: "u3",
          email: "u3@test.com",
          name: "Watcher",
          userLanguage: "en",
        },
      },
    ]);
    await createTask({
      title: "Task",
      user: "u1",
      priority: "high",
      content: "Content",
      account: "a1",
    });
    expect(prismadb.accountWatchers.findMany).toHaveBeenCalledWith({
      where: {
        account_id: "a1",
        user_id: { not: "u1" },
      },
      include: { user: true },
    });
    expect(resendMock.emails.send).toHaveBeenCalled();
  });

  it("does NOT notify watchers when session user is the only watcher", async () => {
    mockUser("u1", "Admin", "en");
    const resendMock = {
      emails: { send: vi.fn().mockResolvedValue({}) },
    };
    (resendHelper as ReturnType<typeof vi.fn>).mockResolvedValue(resendMock);
    (prismadb.crm_Accounts_Tasks.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "t1", title: "Task" });
    (prismadb.accountWatchers.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await createTask({
      title: "Task",
      user: "u1",
      priority: "high",
      content: "Content",
      account: "a1",
    });
    expect(resendMock.emails.send).not.toHaveBeenCalled();
  });

  it("revalidates accounts path on success", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_Accounts_Tasks.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "t1", title: "Task" });
    await createTask({
      title: "Task",
      user: "u1",
      priority: "high",
      content: "Content",
      account: "a1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/accounts", "page");
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Accounts_Tasks.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await createTask({
      title: "Task",
      user: "u1",
      priority: "high",
      content: "Content",
      account: "a1",
    });
    expect(res).toEqual({ error: "Failed to create task" });
  });
});
