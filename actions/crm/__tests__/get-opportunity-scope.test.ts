jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Opportunities: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getOpportunity } from "@/actions/crm/get-opportunity";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getOpportunity scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns null and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getOpportunity("o1");
    expect(res).toBeNull();
    expect(prismadb.crm_Opportunities.findFirst).not.toHaveBeenCalled();
  });

  it("user out-of-scope returns null (assert miss)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getOpportunity("o1");
    expect(res).toBeNull();
    expect(prismadb.crm_Opportunities.findFirst).toHaveBeenCalledTimes(1);
  });

  it("owner returns opportunity detail", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Opportunities.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "o1" })
      .mockResolvedValueOnce({ id: "o1", name: "Big Deal" });
    const res = await getOpportunity("o1");
    expect(res).toEqual({ id: "o1", name: "Big Deal" });
    expect(prismadb.crm_Opportunities.findFirst).toHaveBeenCalledTimes(2);
  });

  it("manager returns detail (assert where has no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Opportunities.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "o1" })
      .mockResolvedValueOnce({ id: "o1", name: "Big Deal" });
    const res = await getOpportunity("o1");
    expect(res).toEqual({ id: "o1", name: "Big Deal" });
    const assertCall = (prismadb.crm_Opportunities.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
