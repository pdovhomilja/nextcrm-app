jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Leads: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getLead } from "@/actions/crm/get-lead";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getLead scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns null and does not query lead", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getLead("l1");
    expect(res).toBeNull();
    expect(prismadb.crm_Leads.findFirst).not.toHaveBeenCalled();
  });

  it("user out-of-scope returns null (assert miss)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Leads.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getLead("l1");
    expect(res).toBeNull();
    // only the assert call ran; detail call short-circuited
    expect(prismadb.crm_Leads.findFirst).toHaveBeenCalledTimes(1);
  });

  it("owner returns lead detail", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Leads.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "l1" })
      .mockResolvedValueOnce({ id: "l1", firstName: "Alice" });
    const res = await getLead("l1");
    expect(res).toEqual({ id: "l1", firstName: "Alice" });
    expect(prismadb.crm_Leads.findFirst).toHaveBeenCalledTimes(2);
  });

  it("manager returns lead detail (no OR in assert where)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Leads.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "l1" })
      .mockResolvedValueOnce({ id: "l1", firstName: "Alice" });
    const res = await getLead("l1");
    expect(res).toEqual({ id: "l1", firstName: "Alice" });
    const assertCall = (prismadb.crm_Leads.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
