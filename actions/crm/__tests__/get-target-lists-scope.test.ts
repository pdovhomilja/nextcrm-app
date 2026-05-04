jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_TargetLists: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getTargetLists } from "@/actions/crm/get-target-lists";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getTargetLists scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getTargetLists();
    expect(res).toEqual([]);
    expect(prismadb.crm_TargetLists.findMany).not.toHaveBeenCalled();
  });

  it("user role: where includes deletedAt:null and created_by:u1", async () => {
    mockUser("user", "u1");
    (prismadb.crm_TargetLists.findMany as jest.Mock).mockResolvedValue([]);
    await getTargetLists();
    const call = (prismadb.crm_TargetLists.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.created_by).toBe("u1");
  });

  it("manager: where = { deletedAt:null } (no created_by)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_TargetLists.findMany as jest.Mock).mockResolvedValue([]);
    await getTargetLists();
    const call = (prismadb.crm_TargetLists.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ deletedAt: null });
    expect(call.where.created_by).toBeUndefined();
  });

  it("returns rows from prisma", async () => {
    mockUser("user", "u1");
    (prismadb.crm_TargetLists.findMany as jest.Mock).mockResolvedValue([{ id: "l1" }]);
    const res = await getTargetLists();
    expect(res).toEqual([{ id: "l1" }]);
  });
});
