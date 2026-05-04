jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    documents: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
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

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { deleteDocument } from "@/actions/documents/delete-document";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("deleteDocument auth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401: unauthenticated throws Unauthenticated and does not delete", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    await expect(deleteDocument("d1")).rejects.toThrow("Unauthenticated");
    expect(prismadb.documents.delete).not.toHaveBeenCalled();
  });

  it("user out-of-scope: throws Forbidden", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(deleteDocument("d1")).rejects.toThrow("Forbidden");
    expect(prismadb.documents.delete).not.toHaveBeenCalled();
  });

  it("user in-scope owner: deletes document and applies minio cleanup", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "d1" });
    (prismadb.documents.findUnique as jest.Mock).mockResolvedValue({
      id: "d1",
      key: "k1",
    });
    (prismadb.documents.delete as jest.Mock).mockResolvedValue({});
    await deleteDocument("d1");
    expect(prismadb.documents.delete).toHaveBeenCalledWith({ where: { id: "d1" } });
  });

  it("manager: bypasses OR scope and deletes", async () => {
    mockUser("manager", "m1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "d1" });
    (prismadb.documents.findUnique as jest.Mock).mockResolvedValue({
      id: "d1",
      key: null,
    });
    (prismadb.documents.delete as jest.Mock).mockResolvedValue({});
    await deleteDocument("d1");
    const where = (prismadb.documents.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
  });
});
