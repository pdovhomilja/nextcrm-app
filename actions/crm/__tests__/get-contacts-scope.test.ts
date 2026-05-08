jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: <T extends (...a: unknown[]) => unknown>(fn: T) => fn,
}));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Contacts: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getContacts } from "@/actions/crm/get-contacts";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getContacts scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getContacts();
    expect(res).toEqual([]);
    expect(prismadb.crm_Contacts.findMany).not.toHaveBeenCalled();
  });

  it("user role: where includes deletedAt:null and OR with assigned/created/legacy/linked-account", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Contacts.findMany as jest.Mock).mockResolvedValue([]);
    await getContacts();
    const call = (prismadb.crm_Contacts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.OR).toEqual([
      { assigned_to: "u1" },
      { createdBy: "u1" },
      {
        assigned_accounts: {
          OR: [
            { assigned_to: "u1" },
            { createdBy: "u1" },
            { watchers: { some: { user_id: "u1" } } },
          ],
        },
      },
    ]);
  });

  it("user role: returns contact rows from findMany", async () => {
    mockUser("user", "u1");
    const rows = [{ id: "c1" }];
    (prismadb.crm_Contacts.findMany as jest.Mock).mockResolvedValue(rows);
    const res = await getContacts();
    expect(res).toEqual(rows);
  });

  it("manager: where = { deletedAt: null } (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Contacts.findMany as jest.Mock).mockResolvedValue([]);
    await getContacts();
    const call = (prismadb.crm_Contacts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ deletedAt: null });
    expect(call.where.OR).toBeUndefined();
  });
});
