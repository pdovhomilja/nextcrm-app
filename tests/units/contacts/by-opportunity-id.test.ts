import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: vi.fn() },
    crm_Opportunities: { findFirst: vi.fn() },
    crm_Contacts: { findMany: vi.fn() },
  },
}));

import { getContactsByOpportunityId } from "@/actions/crm/get-contacts-by-opportunityId";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("getContactsByOpportunityId scope", () => {
  beforeEach(() => vi.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getContactsByOpportunityId("o1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Opportunities.findFirst).not.toHaveBeenCalled();
    expect(prismadb.crm_Contacts.findMany).not.toHaveBeenCalled();
  });

  it("returns [] when assertCanReadOpportunity misses (out-of-scope user)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Opportunities.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getContactsByOpportunityId("o1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Contacts.findMany).not.toHaveBeenCalled();
  });

  it("user with opportunity access: scopes contacts by opportunity-junction + contactReadScopeWhere", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Opportunities.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    (prismadb.crm_Contacts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "c1" }]);
    const res = await getContactsByOpportunityId("o1");
    expect(res).toEqual([{ id: "c1" }]);
    const call = (prismadb.crm_Contacts.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.opportunities).toEqual({
      some: { opportunity_id: "o1" },
    });
    expect(call.where.OR).toEqual([
      { assigned_to: "u1" },
      { createdBy: "u1" },
      {
        assigned_accounts: {
          OR: [{ assigned_to: "u1" }, { createdBy: "u1" }, { watchers: { some: { user_id: "u1" } } }],
        },
      },
    ]);
  });

  it("manager: where keeps junction filter and deletedAt:null (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Opportunities.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "o1" });
    (prismadb.crm_Contacts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await getContactsByOpportunityId("o1");
    const call = (prismadb.crm_Contacts.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where).toEqual({
      deletedAt: null,
      opportunities: { some: { opportunity_id: "o1" } },
    });
    expect(call.where.OR).toBeUndefined();
  });
});
