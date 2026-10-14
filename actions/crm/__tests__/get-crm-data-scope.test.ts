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

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
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
});
