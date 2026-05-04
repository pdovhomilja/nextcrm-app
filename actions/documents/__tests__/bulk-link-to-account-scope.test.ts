jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    documentsToAccounts: { createMany: jest.fn() },
    documents: { findMany: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { bulkLinkToAccount } from "@/actions/documents/bulk-link-to-account";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("bulkLinkToAccount auth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401: unauthenticated throws and does not createMany", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    await expect(bulkLinkToAccount(["d1"], "a1")).rejects.toThrow("Unauthenticated");
    expect(prismadb.documentsToAccounts.createMany).not.toHaveBeenCalled();
  });

  it("403: account out-of-scope → fail-closed", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(bulkLinkToAccount(["d1"], "a1")).rejects.toThrow("Forbidden");
    expect(prismadb.documentsToAccounts.createMany).not.toHaveBeenCalled();
  });

  it("403: account ok but partial unauthorized doc → fail-closed", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([{ id: "d1" }]);
    await expect(bulkLinkToAccount(["d1", "d2"], "a1")).rejects.toThrow("Forbidden");
    expect(prismadb.documentsToAccounts.createMany).not.toHaveBeenCalled();
  });

  it("200: all authorized → createMany junction rows", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([
      { id: "d1" },
      { id: "d2" },
    ]);
    (prismadb.documentsToAccounts.createMany as jest.Mock).mockResolvedValue({ count: 2 });
    await bulkLinkToAccount(["d1", "d2"], "a1");
    expect(prismadb.documentsToAccounts.createMany).toHaveBeenCalledWith({
      data: [
        { document_id: "d1", account_id: "a1" },
        { document_id: "d2", account_id: "a1" },
      ],
      skipDuplicates: true,
    });
  });

  it("manager: bypasses OR scope and links", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.documents.findMany as jest.Mock).mockResolvedValue([{ id: "d1" }]);
    (prismadb.documentsToAccounts.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    await bulkLinkToAccount(["d1"], "a1");
    const acctWhere = (prismadb.crm_Accounts.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(acctWhere.OR).toBeUndefined();
    expect(prismadb.documentsToAccounts.createMany).toHaveBeenCalled();
  });
});
