jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => {
  const tx = jest.fn();
  return {
    prismadb: {
      users: { findUnique: jest.fn() },
      documents: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      $transaction: tx,
    },
  };
});
jest.mock("@/lib/minio", () => ({
  MINIO_PUBLIC_URL: "https://files.example",
  MINIO_BUCKET: "nextcrm",
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue(undefined) },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createDocumentVersion } from "@/actions/documents/create-document-version";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const baseInput = {
  parentDocumentId: "p1",
  key: "documents/v2.pdf",
  size: 1,
  mimeType: "application/pdf",
};

describe("createDocumentVersion auth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401: unauthenticated throws and does not create", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    await expect(createDocumentVersion(baseInput)).rejects.toThrow("Unauthorized");
    expect(prismadb.$transaction).not.toHaveBeenCalled();
  });

  it("user out-of-scope parent: throws Forbidden", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(createDocumentVersion(baseInput)).rejects.toThrow("Forbidden");
    expect(prismadb.$transaction).not.toHaveBeenCalled();
  });

  it("user in-scope owner: creates new version with createdBy=user.id", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "p1" });
    (prismadb.documents.findUnique as jest.Mock).mockResolvedValue({
      id: "p1",
      document_name: "n",
      version: 1,
      accounts: [],
    });
    (prismadb.$transaction as jest.Mock).mockResolvedValue([{ id: "d2" }, {}]);
    const res = await createDocumentVersion(baseInput);
    expect(res).toEqual({ id: "d2" });
    expect(prismadb.$transaction).toHaveBeenCalled();
  });

  it("manager: bypasses OR scope and creates new version", async () => {
    mockUser("manager", "m1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "p1" });
    (prismadb.documents.findUnique as jest.Mock).mockResolvedValue({
      id: "p1",
      document_name: "n",
      version: 2,
      accounts: [],
    });
    (prismadb.$transaction as jest.Mock).mockResolvedValue([{ id: "d3" }, {}]);
    await createDocumentVersion(baseInput);
    const where = (prismadb.documents.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
  });

  it("refuses another user's key and stores the URL derived from the key", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "p1" });
    (prismadb.documents.count as jest.Mock).mockResolvedValue(1);
    await expect(createDocumentVersion(baseInput)).rejects.toThrow("Invalid file");
    expect(prismadb.$transaction).not.toHaveBeenCalled();

    jest.clearAllMocks();
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "p1" });
    (prismadb.documents.count as jest.Mock).mockResolvedValue(0);
    (prismadb.documents.findUnique as jest.Mock).mockResolvedValue({
      id: "p1", document_name: "n", version: 1, accounts: [],
    });
    (prismadb.$transaction as jest.Mock).mockResolvedValue([{ id: "d2" }, {}]);
    await createDocumentVersion({ ...baseInput, url: "https://evil.example/x" } as any);
    const created = (prismadb.documents.create as jest.Mock).mock.calls[0][0].data;
    const updated = (prismadb.documents.update as jest.Mock).mock.calls[0][0].data;
    expect(created.document_file_url).toBe("https://files.example/nextcrm/documents/v2.pdf");
    expect(updated.document_file_url).toBe("https://files.example/nextcrm/documents/v2.pdf");
  });

  it("refuses a key outside the document folders", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "p1" });
    (prismadb.documents.count as jest.Mock).mockResolvedValue(0);
    await expect(
      createDocumentVersion({ ...baseInput, key: "avatars/x.png" }),
    ).rejects.toThrow("Invalid file");
    expect(prismadb.$transaction).not.toHaveBeenCalled();
  });
});
