jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    documentsToAccounts: { delete: jest.fn() },
    documents: { findFirst: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { unlinkFromAccount } from "@/actions/documents/unlink-from-account";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("unlinkFromAccount auth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401: unauthenticated throws and does not delete junction", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    await expect(unlinkFromAccount("d1", "a1")).rejects.toThrow("Unauthorized");
    expect(prismadb.documentsToAccounts.delete).not.toHaveBeenCalled();
  });

  it("user out-of-scope document: throws Forbidden", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(unlinkFromAccount("d1", "a1")).rejects.toThrow("Forbidden");
    expect(prismadb.documentsToAccounts.delete).not.toHaveBeenCalled();
  });

  it("user out-of-scope account (doc passes, account fails): throws Forbidden", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "d1" });
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(unlinkFromAccount("d1", "a1")).rejects.toThrow("Forbidden");
    expect(prismadb.documentsToAccounts.delete).not.toHaveBeenCalled();
  });

  it("user in-scope owner: deletes junction", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "d1" });
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.documentsToAccounts.delete as jest.Mock).mockResolvedValue({});
    await unlinkFromAccount("d1", "a1");
    expect(prismadb.documentsToAccounts.delete).toHaveBeenCalled();
  });

  it("manager: bypasses OR scope and deletes", async () => {
    mockUser("manager", "m1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "d1" });
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.documentsToAccounts.delete as jest.Mock).mockResolvedValue({});
    await unlinkFromAccount("d1", "a1");
    const acctWhere = (prismadb.crm_Accounts.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(acctWhere.OR).toBeUndefined();
  });
});
