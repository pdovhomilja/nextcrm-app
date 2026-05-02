jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Targets: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getTargets } from "@/actions/crm/get-targets";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getTargets scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getTargets();
    expect(res).toEqual([]);
    expect(prismadb.crm_Targets.findMany).not.toHaveBeenCalled();
  });

  it("user role: where = { created_by: u1 } (no deletedAt — hard delete model)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Targets.findMany as jest.Mock).mockResolvedValue([]);
    await getTargets();
    const call = (prismadb.crm_Targets.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.created_by).toBe("u1");
    expect(call.where.deletedAt).toBeUndefined();
  });

  it("manager: where = {} (no scope, no deletedAt)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Targets.findMany as jest.Mock).mockResolvedValue([]);
    await getTargets();
    const call = (prismadb.crm_Targets.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({});
  });

  it("returns rows from prisma", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Targets.findMany as jest.Mock).mockResolvedValue([{ id: "t1" }]);
    const res = await getTargets();
    expect(res).toEqual([{ id: "t1" }]);
  });
});
