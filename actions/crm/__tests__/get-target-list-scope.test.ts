jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_TargetLists: { findFirst: jest.fn(), findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getTargetList } from "@/actions/crm/get-target-list";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getTargetList scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns null and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getTargetList("l1");
    expect(res).toBeNull();
    expect(prismadb.crm_TargetLists.findFirst).not.toHaveBeenCalled();
    expect(prismadb.crm_TargetLists.findUnique).not.toHaveBeenCalled();
  });

  it("user out-of-scope returns null (assert miss)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_TargetLists.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getTargetList("l1");
    expect(res).toBeNull();
    expect(prismadb.crm_TargetLists.findFirst).toHaveBeenCalledTimes(1);
    expect(prismadb.crm_TargetLists.findUnique).not.toHaveBeenCalled();
  });

  it("owner returns target list detail (deletedAt:null + created_by)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_TargetLists.findFirst as jest.Mock).mockResolvedValue({ id: "l1" });
    (prismadb.crm_TargetLists.findUnique as jest.Mock).mockResolvedValue({ id: "l1", name: "L" });
    const res = await getTargetList("l1");
    expect(res).toEqual({ id: "l1", name: "L" });
    const assertCall = (prismadb.crm_TargetLists.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.created_by).toBe("u1");
    expect(assertCall.where.deletedAt).toBeNull();
  });

  it("manager returns target list (deletedAt:null only, no created_by)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_TargetLists.findFirst as jest.Mock).mockResolvedValue({ id: "l1" });
    (prismadb.crm_TargetLists.findUnique as jest.Mock).mockResolvedValue({ id: "l1", name: "L" });
    const res = await getTargetList("l1");
    expect(res).toEqual({ id: "l1", name: "L" });
    const assertCall = (prismadb.crm_TargetLists.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.created_by).toBeUndefined();
    expect(assertCall.where.deletedAt).toBeNull();
  });
});
