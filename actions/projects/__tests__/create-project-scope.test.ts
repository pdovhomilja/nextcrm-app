jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { count: jest.fn(), create: jest.fn() },
    sections: { create: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createProject } from "@/actions/projects/create-project";

const mockUser = (id = "u1", role: "user" | "manager" | "admin" = "user") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("createProject scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await createProject({ title: "t", description: "d", visibility: "private" });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.boards.create).not.toHaveBeenCalled();
  });

  it("authenticated user creates board with createdBy = user.id", async () => {
    mockUser("u1");
    (prismadb.boards.count as jest.Mock).mockResolvedValue(0);
    (prismadb.boards.create as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.sections.create as jest.Mock).mockResolvedValue({ id: "s1" });
    const res = await createProject({ title: "t", description: "d", visibility: "private" });
    expect(res).toEqual({ data: { id: "b1" } });
    const args = (prismadb.boards.create as jest.Mock).mock.calls[0][0];
    expect(args.data.user).toBe("u1");
    expect(args.data.createdBy).toBe("u1");
    expect(args.data.sharedWith).toEqual(["u1"]);
  });
});
