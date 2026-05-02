jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Opportunities: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getUserOpportunities } from "@/actions/crm/get-user-opportunities";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getUserOpportunities scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getUserOpportunities("u1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Opportunities.findMany).not.toHaveBeenCalled();
  });

  it("user querying own id: queries with assigned_to:userId", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([{ id: "o1" }]);
    const res = await getUserOpportunities("u1");
    expect(res).toEqual([{ id: "o1" }]);
    const call = (prismadb.crm_Opportunities.findMany as jest.Mock).mock.calls[0][0];
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
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([{ id: "o2" }]);
    const res = await getUserOpportunities("u9");
    expect(res).toEqual([{ id: "o2" }]);
    const call = (prismadb.crm_Opportunities.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.assigned_to).toBe("u9");
    expect(call.where.deletedAt).toBeNull();
  });
});
