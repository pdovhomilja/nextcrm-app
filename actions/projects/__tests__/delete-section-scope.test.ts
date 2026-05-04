jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn() },
    sections: { findUnique: jest.fn(), delete: jest.fn() },
    tasks: { deleteMany: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { deleteSection } from "@/actions/projects/delete-section";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("deleteSection scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await deleteSection("s1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.sections.delete).not.toHaveBeenCalled();
  });

  it("section's board out-of-scope returns Forbidden", async () => {
    mockUser("user", "u1");
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ board: "b1" });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await deleteSection("s1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.sections.delete).not.toHaveBeenCalled();
    expect(prismadb.tasks.deleteMany).not.toHaveBeenCalled();
  });

  it("in-scope owner deletes section and its tasks", async () => {
    mockUser("user", "u1");
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ board: "b1" });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasks.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
    (prismadb.sections.delete as jest.Mock).mockResolvedValue({ id: "s1" });
    const res = await deleteSection("s1");
    expect(res).toEqual({ success: true });
    expect(prismadb.tasks.deleteMany).toHaveBeenCalledWith({ where: { section: "s1" } });
    expect(prismadb.sections.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
  });

  it("manager bare write scope deletes section", async () => {
    mockUser("manager", "m1");
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ board: "b1" });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.tasks.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prismadb.sections.delete as jest.Mock).mockResolvedValue({ id: "s1" });
    const res = await deleteSection("s1");
    expect(res).toEqual({ success: true });
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
