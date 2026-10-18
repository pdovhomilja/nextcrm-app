jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    documents: { create: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
  },
}));
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
import { createDocument } from "@/actions/documents/create-document";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const baseInput = {
  name: "f.pdf",
  key: "documents/a.pdf",
  size: 10,
  mimeType: "application/pdf",
};

describe("createDocument auth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401: unauthenticated throws Unauthorized and does not write", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    await expect(createDocument(baseInput)).rejects.toThrow("Unauthorized");
    expect(prismadb.documents.create).not.toHaveBeenCalled();
  });

  it("user out-of-scope account: throws Forbidden", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      createDocument({ ...baseInput, accountId: "a1" })
    ).rejects.toThrow("Forbidden");
    expect(prismadb.documents.create).not.toHaveBeenCalled();
  });

  it("user in-scope owner: creates with createdBy=user.id and assigned_user=user.id", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.documents.create as jest.Mock).mockResolvedValue({ id: "d1" });
    await createDocument({ ...baseInput, accountId: "a1" });
    const data = (prismadb.documents.create as jest.Mock).mock.calls[0][0].data;
    expect(data.createdBy).toBe("u1");
    expect(data.assigned_user).toBe("u1");
  });

  it("manager: bypasses account scope OR (assertCanWriteAccount admin/manager only checks id)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.documents.create as jest.Mock).mockResolvedValue({ id: "d1" });
    await createDocument({ ...baseInput, accountId: "a1" });
    const where = (prismadb.crm_Accounts.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where.id).toBe("a1");
    expect(where.OR).toBeUndefined();
    expect(prismadb.documents.create).toHaveBeenCalled();
  });
});

describe("createDocument file key (client-supplied, checked on the server)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("stores document_file_url derived from the key, not from the client", async () => {
    mockUser("user", "u1");
    (prismadb.documents.count as jest.Mock).mockResolvedValue(0);
    (prismadb.documents.create as jest.Mock).mockResolvedValue({ id: "d1" });
    await createDocument({ ...baseInput, url: "https://evil.example/x" } as any);
    const data = (prismadb.documents.create as jest.Mock).mock.calls[0][0].data;
    expect(data.key).toBe("documents/a.pdf");
    expect(data.document_file_url).toBe("https://files.example/nextcrm/documents/a.pdf");
  });

  it("refuses a key outside the document folders", async () => {
    mockUser("admin", "a1");
    (prismadb.documents.count as jest.Mock).mockResolvedValue(0);
    await expect(
      createDocument({ ...baseInput, key: "invoices/i1.pdf" }),
    ).rejects.toThrow("Invalid file");
    expect(prismadb.documents.create).not.toHaveBeenCalled();
  });

  it("refuses another user's key (already referenced by a Documents row)", async () => {
    mockUser("user", "attacker");
    (prismadb.documents.count as jest.Mock).mockResolvedValue(1);
    await expect(
      createDocument({ ...baseInput, key: "documents/victim-uuid.pdf" }),
    ).rejects.toThrow("Invalid file");
    expect(prismadb.documents.create).not.toHaveBeenCalled();
    const where = (prismadb.documents.count as jest.Mock).mock.calls[0][0].where;
    expect(where).toEqual({
      OR: [
        { key: "documents/victim-uuid.pdf" },
        { document_file_url: { endsWith: "/nextcrm/documents/victim-uuid.pdf" } },
      ],
    });
  });
});
