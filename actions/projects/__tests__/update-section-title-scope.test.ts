jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    boards: { findFirst: jest.fn() },
    sections: { findUnique: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { updateSectionTitle } from "@/actions/projects/update-section-title";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const args = { sectionId: "s1", newTitle: "New Title" };

describe("updateSectionTitle scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await updateSectionTitle(args);
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.sections.update).not.toHaveBeenCalled();
  });

  it("section's board out-of-scope returns Forbidden", async () => {
    mockUser("user", "u1");
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ board: "b1" });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await updateSectionTitle(args);
    expect(res).toEqual({ error: "Forbidden" });
    expect(prismadb.sections.update).not.toHaveBeenCalled();
  });

  it("in-scope owner updates section title", async () => {
    mockUser("user", "u1");
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ board: "b1" });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.sections.update as jest.Mock).mockResolvedValue({ id: "s1" });
    const res = await updateSectionTitle(args);
    expect(res).toEqual({ success: true });
    expect(prismadb.sections.update).toHaveBeenCalled();
  });

  it("manager bare write scope updates section title", async () => {
    mockUser("manager", "m1");
    (prismadb.sections.findUnique as jest.Mock).mockResolvedValue({ board: "b1" });
    (prismadb.boards.findFirst as jest.Mock).mockResolvedValue({ id: "b1" });
    (prismadb.sections.update as jest.Mock).mockResolvedValue({ id: "s1" });
    const res = await updateSectionTitle(args);
    expect(res).toEqual({ success: true });
    const assertCall = (prismadb.boards.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
