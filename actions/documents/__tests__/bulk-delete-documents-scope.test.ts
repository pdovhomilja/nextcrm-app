jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    documents: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));
jest.mock("@/lib/minio", () => ({
  minioClient: { send: jest.fn().mockResolvedValue(undefined) },
  MINIO_BUCKET: "test-bucket",
}));
jest.mock("@aws-sdk/client-s3", () => ({
  DeleteObjectCommand: jest.fn().mockImplementation((args) => args),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { bulkDeleteDocuments } from "@/actions/documents/bulk-delete-documents";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("bulkDeleteDocuments auth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401: unauthenticated throws and does not delete", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    await expect(bulkDeleteDocuments(["d1", "d2"])).rejects.toThrow("Unauthenticated");
    expect(prismadb.documents.deleteMany).not.toHaveBeenCalled();
  });

  it("403: partial unauthorized → fail-closed, nothing deleted", async () => {
    mockUser("user", "u1");
    // Filter returns only 1 of 2 ids → unauthorized.
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([{ id: "d1" }]);
    await expect(bulkDeleteDocuments(["d1", "d2"])).rejects.toThrow("Forbidden");
    expect(prismadb.documents.deleteMany).not.toHaveBeenCalled();
  });

  it("403: all unauthorized → fail-closed", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([]);
    await expect(bulkDeleteDocuments(["d1", "d2"])).rejects.toThrow("Forbidden");
    expect(prismadb.documents.deleteMany).not.toHaveBeenCalled();
  });

  it("200: all authorized → deletes all", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([
      { id: "d1" },
      { id: "d2" },
    ]);
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([
      { id: "d1", key: "k1" },
      { id: "d2", key: null },
    ]);
    (prismadb.documents.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
    await bulkDeleteDocuments(["d1", "d2"]);
    expect(prismadb.documents.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["d1", "d2"] } },
    });
  });

  it("manager: bypasses OR and deletes", async () => {
    mockUser("manager", "m1");
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([
      { id: "d1" },
      { id: "d2" },
    ]);
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([
      { id: "d1", key: null },
      { id: "d2", key: null },
    ]);
    (prismadb.documents.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
    await bulkDeleteDocuments(["d1", "d2"]);
    const where = (prismadb.documents.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
    expect(prismadb.documents.deleteMany).toHaveBeenCalled();
  });
});
