import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts_Tasks: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { getCrMTask } from "@/actions/crm/account/get-task";
import { getAccountsTasks } from "@/actions/crm/account/get-tasks";
import { prismadb } from "@/lib/prisma";

describe("getCrMTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns task by id with includes", async () => {
    const task = {
      id: "t1",
      title: "Task 1",
      assigned_user: { id: "u1", name: "User" },
      documents: [],
      comments: [],
    };
    (prismadb.crm_Accounts_Tasks.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(task);
    const res = await getCrMTask("t1");
    expect(res).toEqual(task);
    expect(prismadb.crm_Accounts_Tasks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        include: expect.objectContaining({
          assigned_user: { select: { id: true, name: true } },
          documents: expect.any(Object),
          comments: expect.any(Object),
        }),
      }),
    );
  });

  it("returns null when task not found", async () => {
    (prismadb.crm_Accounts_Tasks.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getCrMTask("t1");
    expect(res).toBeNull();
  });
});

describe("getAccountsTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tasks for account", async () => {
    const tasks = [{ id: "t1", title: "Task 1", assigned_user: { id: "u1", name: "User" } }];
    (prismadb.crm_Accounts_Tasks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(tasks);
    const res = await getAccountsTasks("a1");
    expect(res).toEqual(tasks);
    expect(prismadb.crm_Accounts_Tasks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { account: "a1" },
        include: {
          assigned_user: { select: { id: true, name: true } },
        },
      }),
    );
  });

  it("returns empty array when no tasks", async () => {
    (prismadb.crm_Accounts_Tasks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const res = await getAccountsTasks("a1");
    expect(res).toEqual([]);
  });
});
