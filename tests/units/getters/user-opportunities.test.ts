import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthenticated: vi.fn(),
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

import { getUserOpportunities } from "@/actions/crm/get-user-opportunities";
import { AuthenticationError, requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("getUserOpportunities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthenticationError returns empty array", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getUserOpportunities("u1");
    expect(res).toEqual([]);
  });

  it("user can only fetch their own opportunities", async () => {
    mockUser("user", "u1");
    const res = await getUserOpportunities("u2");
    expect(res).toEqual([]);
    expect(prismadb.crm_Opportunities.findMany).not.toHaveBeenCalled();
  });

  it("user can fetch their own opportunities", async () => {
    mockUser("user", "u1");
    const opportunities = [{ id: "o1", name: "Opp 1", assigned_sales_stage: { name: "Prospecting" } }];
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(opportunities);
    const res = await getUserOpportunities("u1");
    expect(res).toEqual(opportunities);
  });

  it("manager can fetch opportunities for any user", async () => {
    mockUser("manager", "m1");
    const opportunities = [{ id: "o1", name: "Opp 1", assigned_sales_stage: { name: "Closed" } }];
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(opportunities);
    const res = await getUserOpportunities("u2");
    expect(res).toEqual(opportunities);
  });

  it("admin can fetch opportunities for any user", async () => {
    mockUser("admin", "a1");
    const opportunities = [{ id: "o1", name: "Opp 1", assigned_sales_stage: { name: "Won" } }];
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(opportunities);
    const res = await getUserOpportunities("u2");
    expect(res).toEqual(opportunities);
  });
});
