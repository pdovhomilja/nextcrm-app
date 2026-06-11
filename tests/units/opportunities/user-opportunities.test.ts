import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: vi.fn() },
    crm_Opportunities: { findMany: vi.fn() },
  },
}));

import { getUserOpportunities } from "@/actions/crm/get-user-opportunities";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("getUserOpportunities scope", () => {
  beforeEach(() => vi.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getUserOpportunities("u1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Opportunities.findMany).not.toHaveBeenCalled();
  });

  it("user querying own id: queries with assigned_to:userId", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "o1" }]);
    const res = await getUserOpportunities("u1");
    expect(res).toEqual([{ id: "o1" }]);
    const call = (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.assigned_to).toBe("u1");
    expect(call.where.deletedAt).toBeNull();
  });

  it("user querying someone else: returns [] without query", async () => {
    mockUser("user", "u1");
    const res = await getUserOpportunities("u2");
    expect(res).toEqual([]);
    expect(prismadb.crm_Opportunities.findMany).not.toHaveBeenCalled();
  });

  it("manager querying any user: queries with assigned_to:userId", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "o2" }]);
    const res = await getUserOpportunities("u9");
    expect(res).toEqual([{ id: "o2" }]);
    const call = (prismadb.crm_Opportunities.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.assigned_to).toBe("u9");
    expect(call.where.deletedAt).toBeNull();
  });
});
