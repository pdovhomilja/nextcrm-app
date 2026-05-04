jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    sections: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getSections } from "@/actions/projects/get-sections";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getSections scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns []", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getSections();
    expect(res).toEqual([]);
    expect(prismadb.sections.findMany).not.toHaveBeenCalled();
  });

  it("user role: where joins through board_relation read scope", async () => {
    mockUser("user", "u1");
    (prismadb.sections.findMany as jest.Mock).mockResolvedValue([]);
    await getSections();
    const call = (prismadb.sections.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.board_relation).toBeDefined();
    expect(Array.isArray(call.where.board_relation.OR)).toBe(true);
  });

  it("user role: returns rows", async () => {
    mockUser("user", "u1");
    (prismadb.sections.findMany as jest.Mock).mockResolvedValue([{ id: "s1" }]);
    const res = await getSections();
    expect(res).toEqual([{ id: "s1" }]);
  });

  it("manager: where uses bare board_relation (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.sections.findMany as jest.Mock).mockResolvedValue([]);
    await getSections();
    const call = (prismadb.sections.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.board_relation.OR).toBeUndefined();
    expect(call.where.board_relation.deletedAt).toBeNull();
  });
});
