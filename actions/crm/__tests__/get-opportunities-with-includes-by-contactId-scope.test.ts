jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Contacts: { findFirst: jest.fn() },
    crm_Opportunities: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getOpportunitiesFullByContactId } from "@/actions/crm/get-opportunities-with-includes-by-contactId";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getOpportunitiesFullByContactId scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getOpportunitiesFullByContactId("c1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Contacts.findFirst).not.toHaveBeenCalled();
    expect(prismadb.crm_Opportunities.findMany).not.toHaveBeenCalled();
  });

  it("returns [] when assertCanReadContact misses (out-of-scope user)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Contacts.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getOpportunitiesFullByContactId("c1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Opportunities.findMany).not.toHaveBeenCalled();
  });

  it("user with contact access: scopes opportunities by contacts-junction + opportunityReadScopeWhere", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Contacts.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([{ id: "o1" }]);
    const res = await getOpportunitiesFullByContactId("c1");
    expect(res).toEqual([{ id: "o1" }]);
    const call = (prismadb.crm_Opportunities.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.contacts).toEqual({
      some: { contact_id: "c1" },
    });
    expect(Array.isArray(call.where.OR)).toBe(true);
    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
      ]),
    );
  });

  it("manager: where keeps junction filter and deletedAt:null (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Contacts.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([]);
    await getOpportunitiesFullByContactId("c1");
    const call = (prismadb.crm_Opportunities.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({
      deletedAt: null,
      contacts: { some: { contact_id: "c1" } },
    });
    expect(call.where.OR).toBeUndefined();
  });
});
