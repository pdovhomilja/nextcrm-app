// Regression tests for GHSA-q96c-2vj9-8v7f: getAllCrmData must scope the five
// CRM entity lists to the caller instead of returning every row.
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: <T extends (...a: unknown[]) => unknown>(fn: T) => fn,
}));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => {
  const m = () => ({ findMany: jest.fn().mockResolvedValue([]) });
  return {
    prismadb: {
      users: { findUnique: jest.fn() },
      crm_Accounts: m(),
      crm_Opportunities: m(),
      crm_Leads: m(),
      crm_Contacts: m(),
      crm_Contracts: m(),
      crm_Opportunities_Type: m(),
      crm_Opportunities_Sales_Stages: m(),
      crm_campaigns: m(),
      crm_Industry_Type: m(),
      crm_Contact_Types: m(),
      crm_Lead_Sources: m(),
      crm_Lead_Statuses: m(),
      crm_Lead_Types: m(),
      currency: m(),
      exchangeRate: m(),
      crm_ProductCategories: m(),
    },
  };
});

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getAllCrmData } from "@/actions/crm/get-crm-data";

const mockUser = (role: "user" | "manager" | "admin" | "partner", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const ENTITIES = [
  "crm_Accounts",
  "crm_Opportunities",
  "crm_Leads",
  "crm_Contacts",
  "crm_Contracts",
] as const;

const whereOf = (model: (typeof ENTITIES)[number]) =>
  ((prismadb as any)[model].findMany as jest.Mock).mock.calls[0][0].where;

describe("getAllCrmData scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated throws and queries nothing", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    await expect(getAllCrmData()).rejects.toThrow();
    for (const model of ENTITIES) {
      expect((prismadb as any)[model].findMany).not.toHaveBeenCalled();
    }
  });

  it("user role: every entity query carries an ownership OR scoped to the caller", async () => {
    mockUser("user", "u1");
    await getAllCrmData();
    for (const model of ENTITIES) {
      const where = whereOf(model);
      expect(where.deletedAt).toBeNull();
      expect(where.OR).toEqual(expect.arrayContaining([{ createdBy: "u1" }]));
    }
  });

  it.each(["manager", "admin"] as const)("%s: entity queries are unscoped", async (role) => {
    mockUser(role, "m1");
    await getAllCrmData();
    for (const model of ENTITIES) {
      expect(whereOf(model)).toEqual({ deletedAt: null });
    }
  });

  // Campaign picker in the opportunity forms: same scope as the campaigns
  // list, and both delete markers (status "deleted", deletedAt) are hidden.
  // Literal on purpose: pins the exact where shape, not the helper's output.
  const NOT_DELETED = {
    deletedAt: null,
    OR: [{ status: null }, { status: { not: "deleted" } }],
  };
  const campaignWhere = () =>
    (prismadb.crm_campaigns.findMany as jest.Mock).mock.calls[0][0].where;

  it("user role: campaigns are limited to ones the caller created, deleted ones hidden", async () => {
    mockUser("user", "u1");
    await getAllCrmData();
    expect(campaignWhere()).toEqual({ AND: [NOT_DELETED], created_by: "u1" });
  });

  it.each(["manager", "admin"] as const)(
    "%s: all campaigns except deleted ones",
    async (role) => {
      mockUser(role, "m1");
      await getAllCrmData();
      expect(campaignWhere()).toEqual({ AND: [NOT_DELETED] });
    },
  );

  it("partner: no campaigns (partner is not a scoped role for campaigns)", async () => {
    mockUser("partner", "p1");
    await getAllCrmData();
    expect(campaignWhere()).toEqual({
      AND: [NOT_DELETED],
      OR: [{ id: { in: [] } }],
    });
  });
});
