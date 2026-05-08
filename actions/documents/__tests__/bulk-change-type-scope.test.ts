jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    documents: { updateMany: jest.fn(), findMany: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { bulkChangeType } from "@/actions/documents/bulk-change-type";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("bulkChangeType auth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401: unauthenticated throws and does not updateMany", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    await expect(bulkChangeType(["d1"], "private" as any)).rejects.toThrow("Unauthenticated");
    expect(prismadb.documents.updateMany).not.toHaveBeenCalled();
  });

  it("403: partial unauthorized → fail-closed, no update", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([{ id: "d1" }]);
    await expect(bulkChangeType(["d1", "d2"], "private" as any)).rejects.toThrow("Forbidden");
    expect(prismadb.documents.updateMany).not.toHaveBeenCalled();
  });

  it("403: all unauthorized → fail-closed", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([]);
    await expect(bulkChangeType(["d1", "d2"], "private" as any)).rejects.toThrow("Forbidden");
    expect(prismadb.documents.updateMany).not.toHaveBeenCalled();
  });

  it("200: all authorized → updateMany applies system type", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([
      { id: "d1" },
      { id: "d2" },
    ]);
    (prismadb.documents.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
    await bulkChangeType(["d1", "d2"], "private" as any);
    expect(prismadb.documents.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["d1", "d2"] } },
      data: { document_system_type: "private" },
    });
  });

  it("manager: bypasses OR scope and updates", async () => {
    mockUser("manager", "m1");
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([{ id: "d1" }]);
    (prismadb.documents.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    await bulkChangeType(["d1"], "private" as any);
    const where = (prismadb.documents.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
    expect(prismadb.documents.updateMany).toHaveBeenCalled();
  });
});
