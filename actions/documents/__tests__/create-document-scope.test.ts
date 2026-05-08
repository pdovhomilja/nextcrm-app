jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    documents: { create: jest.fn(), findFirst: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
  },
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
  url: "https://example.com/f.pdf",
  key: "k1",
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
