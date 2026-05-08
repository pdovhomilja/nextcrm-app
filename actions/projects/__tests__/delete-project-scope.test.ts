jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { deleteProject } from "@/actions/projects/delete-project";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("deleteProject scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await deleteProject("b1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.boards.update).not.toHaveBeenCalled();
  });

  it("user out-of-scope: returns error, no delete", async () => {
    mockUser("user", "u1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await deleteProject("b1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.boards.update).not.toHaveBeenCalled();
  });

  it("user owner: soft-deletes board", async () => {
    mockUser("user", "u1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.boards.update as jest.Mock).mockResolvedValue({ id: "b1" });
    const res = await deleteProject("b1");
    expect(res).toEqual({ success: true });
    const updArgs = (prismadb.boards.update as jest.Mock).mock.calls[0][0];
    expect(updArgs.data.deletedBy).toBe("u1");
  });

  it("manager: bare write scope", async () => {
    mockUser("manager", "m1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.boards.update as jest.Mock).mockResolvedValue({ id: "b1" });
    const res = await deleteProject("b1");
    expect(res).toEqual({ success: true });
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
