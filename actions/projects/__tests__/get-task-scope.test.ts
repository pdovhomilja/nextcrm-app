jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn() },
    tasks: { findUnique: jest.fn(), findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getTask } from "@/actions/projects/get-task";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getTask scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns null", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getTask("t1");
    expect(res).toBeNull();
    expect(prismadb.tasks.findUnique).not.toHaveBeenCalled();
  });

  it("user out-of-scope (board read denied): returns null", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getTask("t1");
    expect(res).toBeNull();
    expect(prismadb.tasks.findFirst).not.toHaveBeenCalled();
  });

  it("user in-scope: returns task", async () => {
    mockUser("user", "u1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    const detail = { id: "t1", content: "X" };
    (prismadb.tasks.findFirst as jest.Mock).mockResolvedValue(detail);
    const res = await getTask("t1");
    expect(res).toEqual(detail);
  });

  it("manager: bare scope, returns task", async () => {
    mockUser("manager", "m1");
    (prismadb.tasks.findUnique as jest.Mock).mockResolvedValue({
      assigned_section: { board_relation: { id: "b1" } },
    });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasks.findFirst as jest.Mock).mockResolvedValue({ id: "t1" });
    await getTask("t1");
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
