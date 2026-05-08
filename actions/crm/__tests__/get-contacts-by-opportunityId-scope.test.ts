jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Opportunities: { findFirst: jest.fn() },
    crm_Contacts: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getContactsByOpportunityId } from "@/actions/crm/get-contacts-by-opportunityId";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getContactsByOpportunityId scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getContactsByOpportunityId("o1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Opportunities.findFirst).not.toHaveBeenCalled();
    expect(prismadb.crm_Contacts.findMany).not.toHaveBeenCalled();
  });

  it("returns [] when assertCanReadOpportunity misses (out-of-scope user)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getContactsByOpportunityId("o1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Contacts.findMany).not.toHaveBeenCalled();
  });

  it("user with opportunity access: scopes contacts by opportunity-junction + contactReadScopeWhere", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({ id: "o1" });
    (prismadb.crm_Contacts.findMany as jest.Mock).mockResolvedValue([{ id: "c1" }]);
    const res = await getContactsByOpportunityId("o1");
    expect(res).toEqual([{ id: "c1" }]);
    const call = (prismadb.crm_Contacts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.opportunities).toEqual({
      some: { opportunity_id: "o1" },
    });
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

  it("manager: where keeps junction filter and deletedAt:null (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({ id: "o1" });
    (prismadb.crm_Contacts.findMany as jest.Mock).mockResolvedValue([]);
    await getContactsByOpportunityId("o1");
    const call = (prismadb.crm_Contacts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({
      deletedAt: null,
      opportunities: { some: { opportunity_id: "o1" } },
    });
    expect(call.where.OR).toBeUndefined();
  });
});
