jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    tasks: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getUserTasks } from "@/actions/projects/get-user-tasks";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getUserTasks scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns []", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getUserTasks("u1");
    expect(res).toEqual([]);
    expect(prismadb.tasks.findMany).not.toHaveBeenCalled();
  });

  it("user requesting another user's tasks: returns []", async () => {
    mockUser("user", "u1");
    const res = await getUserTasks("u2");
    expect(res).toEqual([]);
    expect(prismadb.tasks.findMany).not.toHaveBeenCalled();
  });

  it("user requesting own tasks: returns rows", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findMany as jest.Mock).mockResolvedValue([{ id: "t1" }]);
    const res = await getUserTasks("u1");
    expect(res).toEqual([{ id: "t1" }]);
  });

  it("manager requesting another user's tasks: returns rows", async () => {
    mockUser("manager", "m1");
    (prismadb.tasks.findMany as jest.Mock).mockResolvedValue([{ id: "t9" }]);
    const res = await getUserTasks("u2");
    expect(res).toEqual([{ id: "t9" }]);
  });
});
