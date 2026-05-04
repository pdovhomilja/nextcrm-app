jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    tasks: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getTasksPastDue } from "@/actions/projects/get-tasks-past-due";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getTasksPastDue scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns undefined", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getTasksPastDue();
    expect(res).toBeUndefined();
    expect(prismadb.tasks.findMany).not.toHaveBeenCalled();
  });

  it("user role: AND includes user-scope filter", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findMany as jest.Mock).mockResolvedValue([]);
    await getTasksPastDue();
    const call = (prismadb.tasks.findMany as jest.Mock).mock.calls[0][0];
    const hasUserClause = call.where.AND.some((c: { user?: string }) => c.user === "u1");
    expect(hasUserClause).toBe(true);
  });

  it("user role: returns object shape", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findMany as jest.Mock).mockResolvedValue([{ id: "t1" }]);
    const res = await getTasksPastDue();
    expect(res).toEqual({
      getTaskPastDue: [{ id: "t1" }],
      getTaskPastDueInSevenDays: [{ id: "t1" }],
    });
  });

  it("manager: AND has no user filter (global)", async () => {
    mockUser("manager", "m1");
    (prismadb.tasks.findMany as jest.Mock).mockResolvedValue([]);
    await getTasksPastDue();
    const call = (prismadb.tasks.findMany as jest.Mock).mock.calls[0][0];
    const hasUserClause = call.where.AND.some((c: { user?: string }) => "user" in c);
    expect(hasUserClause).toBe(false);
  });
});
