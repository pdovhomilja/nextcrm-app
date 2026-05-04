jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn() },
    sections: { count: jest.fn(), create: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createSection } from "@/actions/projects/create-section";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const args = { boardId: "b1", title: "Section A" };

describe("createSection scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await createSection(args);
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.sections.create).not.toHaveBeenCalled();
  });

  it("board out-of-scope returns Forbidden", async () => {
    mockUser("user", "u1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await createSection(args);
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.sections.create).not.toHaveBeenCalled();
  });

  it("in-scope owner creates section", async () => {
    mockUser("user", "u1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.sections.count as jest.Mock).mockResolvedValue(0);
    (prismadb.sections.create as jest.Mock).mockResolvedValue({ id: "s1" });
    const res = await createSection(args);
    expect(res).toEqual({ data: { id: "s1" } });
    expect(prismadb.sections.create).toHaveBeenCalled();
  });

  it("manager bare write scope creates section", async () => {
    mockUser("manager", "m1");
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.sections.count as jest.Mock).mockResolvedValue(2);
    (prismadb.sections.create as jest.Mock).mockResolvedValue({ id: "s2" });
    const res = await createSection(args);
    expect(res).toEqual({ data: { id: "s2" } });
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
