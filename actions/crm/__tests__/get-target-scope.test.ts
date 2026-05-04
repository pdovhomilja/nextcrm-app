jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Targets: { findFirst: jest.fn(), findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getTarget } from "@/actions/crm/get-target";

const VALID_ID = "11111111-1111-1111-1111-111111111111";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getTarget scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns null and does not query target", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getTarget(VALID_ID);
    expect(res).toBeNull();
    expect(prismadb.crm_Targets.findFirst).not.toHaveBeenCalled();
    expect(prismadb.crm_Targets.findUnique).not.toHaveBeenCalled();
  });

  it("user out-of-scope returns null (assert miss)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getTarget(VALID_ID);
    expect(res).toBeNull();
    expect(prismadb.crm_Targets.findFirst).toHaveBeenCalledTimes(1);
    expect(prismadb.crm_Targets.findUnique).not.toHaveBeenCalled();
  });

  it("owner returns target detail", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({ id: VALID_ID });
    (prismadb.crm_Targets.findUnique as jest.Mock).mockResolvedValue({ id: VALID_ID, name: "T1" });
    const res = await getTarget(VALID_ID);
    expect(res).toEqual({ id: VALID_ID, name: "T1" });
    const assertCall = (prismadb.crm_Targets.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.created_by).toBe("u1");
    expect(assertCall.where.deletedAt).toBeUndefined();
  });

  it("manager returns target detail (no created_by filter)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Targets.findFirst as jest.Mock).mockResolvedValue({ id: VALID_ID });
    (prismadb.crm_Targets.findUnique as jest.Mock).mockResolvedValue({ id: VALID_ID, name: "T1" });
    const res = await getTarget(VALID_ID);
    expect(res).toEqual({ id: VALID_ID, name: "T1" });
    const assertCall = (prismadb.crm_Targets.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.created_by).toBeUndefined();
  });
});
