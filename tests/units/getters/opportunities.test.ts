import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthenticated: vi.fn(),
  opportunityReadScopeWhere: vi.fn(() => ({})),
  AuthenticationError: class extends Error {
    readonly code = "UNAUTHENTICATED";
    constructor(message = "Unauthenticated") {
      super(message);
      this.name = "AuthenticationError";
    }
  },
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: {
      findMany: vi.fn(),
    },
  },
}));

import { getOpportunities } from "@/actions/crm/get-opportunities";
import { AuthenticationError, opportunityReadScopeWhere, requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("getOpportunities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthenticationError returns empty array", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getOpportunities();
    expect(res).toEqual([]);
  });

  it("uses opportunityReadScopeWhere in where clause", async () => {
    mockUser("user");
    (opportunityReadScopeWhere as ReturnType<typeof vi.fn>).mockReturnValue({ deletedAt: null });
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await getOpportunities();
    expect(opportunityReadScopeWhere).toHaveBeenCalledWith(expect.objectContaining({ id: "u1", role: "user" }));
    expect(prismadb.crm_Opportunities.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
        include: expect.objectContaining({
          assigned_to_user: {
            select: { avatar: true, name: true },
          },
          created_by_user: {
            select: { name: true },
          },
          contacts: {
            include: {
              contact: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
          documents: {
            include: {
              document: {
                select: { id: true, document_name: true },
              },
            },
          },
        }),
      }),
    );
  });

  it("returns opportunities on success", async () => {
    mockUser("admin");
    const opportunities = [
      {
        id: "o1",
        name: "Opportunity 1",
        assigned_to_user: { name: "User", avatar: "url" },
      },
    ];
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(opportunities);
    const res = await getOpportunities();
    expect(res).toEqual(opportunities);
  });
});

describe("getOpportunitiesByMonth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty object when no opportunities", async () => {
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { getOpportunitiesByMonth } = await import("@/actions/crm/get-opportunities");
    const res = await getOpportunitiesByMonth();
    expect(res).toEqual({});
  });

  it("groups opportunities by month", async () => {
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { created_on: new Date("2024-01-15") },
      { created_on: new Date("2024-01-20") },
      { created_on: new Date("2024-02-10") },
    ]);
    const { getOpportunitiesByMonth } = await import("@/actions/crm/get-opportunities");
    const res = await getOpportunitiesByMonth();
    expect(res).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: expect.any(String), Number: 2 }),
        expect.objectContaining({ name: expect.any(String), Number: 1 }),
      ]),
    );
  });
});

describe("getOpportunitiesByStage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty object when no opportunities", async () => {
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const { getOpportunitiesByStage } = await import("@/actions/crm/get-opportunities");
    const res = await getOpportunitiesByStage();
    expect(res).toEqual({});
  });

  it("groups opportunities by stage name", async () => {
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { assigned_sales_stage: { name: "Prospecting" } },
      { assigned_sales_stage: { name: "Prospecting" } },
      { assigned_sales_stage: { name: "Closed" } },
    ]);
    const { getOpportunitiesByStage } = await import("@/actions/crm/get-opportunities");
    const res = await getOpportunitiesByStage();
    expect(res).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Prospecting", Number: 2 }),
        expect.objectContaining({ name: "Closed", Number: 1 }),
      ]),
    );
  });
});
