jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: <T extends (...a: unknown[]) => unknown>(fn: T) => fn,
}));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Opportunities: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getOpportunitiesFull } from "@/actions/crm/get-opportunities-with-includes";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getOpportunitiesFull scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getOpportunitiesFull();
    expect(res).toEqual([]);
    expect(prismadb.crm_Opportunities.findMany).not.toHaveBeenCalled();
  });

  it("user role: where includes deletedAt:null and OR scope", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([]);
    await getOpportunitiesFull();
    const call = (prismadb.crm_Opportunities.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
    expect(Array.isArray(call.where.OR)).toBe(true);
    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
      ]),
    );
  });

  it("user role: returns rows", async () => {
    mockUser("user", "u1");
    const rows = [{ id: "o1" }];
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue(rows);
    const res = await getOpportunitiesFull();
    expect(res).toEqual(rows);
  });

  it("manager: where = { deletedAt: null } (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([]);
    await getOpportunitiesFull();
    const call = (prismadb.crm_Opportunities.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ deletedAt: null });
    expect(call.where.OR).toBeUndefined();
  });
});
