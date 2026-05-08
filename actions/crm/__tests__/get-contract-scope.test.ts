jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Contracts: { findFirst: jest.fn(), findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getContract } from "@/actions/crm/get-contract";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getContract scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns null and does not query contract", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getContract("c1");
    expect(res).toBeNull();
    expect(prismadb.crm_Contracts.findFirst).not.toHaveBeenCalled();
    expect(prismadb.crm_Contracts.findUnique).not.toHaveBeenCalled();
  });

  it("user out-of-scope returns null (assert miss)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Contracts.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getContract("c1");
    expect(res).toBeNull();
    expect(prismadb.crm_Contracts.findFirst).toHaveBeenCalledTimes(1);
    expect(prismadb.crm_Contracts.findUnique).not.toHaveBeenCalled();
  });

  it("user in-scope returns contract detail", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Contracts.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_Contracts.findUnique as jest.Mock).mockResolvedValue({ id: "c1", title: "X" });
    const res = await getContract("c1");
    expect(res).toEqual({ id: "c1", title: "X" });
    expect(prismadb.crm_Contracts.findUnique).toHaveBeenCalledTimes(1);
  });

  it("manager returns contract detail (no OR in assert where)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Contracts.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    (prismadb.crm_Contracts.findUnique as jest.Mock).mockResolvedValue({ id: "c1", title: "X" });
    const res = await getContract("c1");
    expect(res).toEqual({ id: "c1", title: "X" });
    const assertCall = (prismadb.crm_Contracts.findFirst as jest.Mock).mock.calls[0][0];
    expect(assertCall.where.OR).toBeUndefined();
  });
});
