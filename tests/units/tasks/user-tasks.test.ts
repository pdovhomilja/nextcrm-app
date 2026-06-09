import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts_Tasks: {
      findMany: vi.fn(),
    },
  },
}));

import { getUserCRMTasks } from "@/actions/crm/tasks/get-user-tasks";
import { prismadb } from "@/lib/prisma";

describe("getUserCRMTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tasks for user", async () => {
    const tasks = [
      {
        id: "t1",
        title: "Task 1",
        assigned_user: { id: "u1", name: "User" },
      },
    ];
    (prismadb.crm_Accounts_Tasks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(tasks);
    const res = await getUserCRMTasks("u1");
    expect(res).toEqual(tasks);
    expect(prismadb.crm_Accounts_Tasks.findMany).toHaveBeenCalledWith({
      where: { user: "u1" },
      include: {
        assigned_user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns empty array when no tasks", async () => {
    (prismadb.crm_Accounts_Tasks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const res = await getUserCRMTasks("u1");
    expect(res).toEqual([]);
  });
});
