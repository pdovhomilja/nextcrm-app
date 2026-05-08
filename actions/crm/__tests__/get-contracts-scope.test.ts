jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: <T extends (...a: unknown[]) => unknown>(fn: T) => fn,
}));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    crm_Contracts: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import {
  getContractsWithIncludes,
  getContractsByAccountId,
} from "@/actions/crm/get-contracts";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const userOR = (uid: string) => [
  { assigned_to: uid },
  { createdBy: uid },
  {
    assigned_account: {
      OR: [
        { assigned_to: uid },
        { createdBy: uid },
        { watchers: { some: { user_id: uid } } },
      ],
    },
  },
];

describe("getContractsWithIncludes scope (list-all)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getContractsWithIncludes();
    expect(res).toEqual([]);
    expect(prismadb.crm_Contracts.findMany).not.toHaveBeenCalled();
  });

  it("user role: where includes deletedAt:null and OR scope", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Contracts.findMany as jest.Mock).mockResolvedValue([]);
    await getContractsWithIncludes();
    const call = (prismadb.crm_Contracts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.OR).toEqual(userOR("u1"));
  });

  it("manager: where = { deletedAt:null } (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Contracts.findMany as jest.Mock).mockResolvedValue([]);
    await getContractsWithIncludes();
    const call = (prismadb.crm_Contracts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ deletedAt: null });
    expect(call.where.OR).toBeUndefined();
  });
});

describe("getContractsByAccountId scope (list-by-account)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getContractsByAccountId("a1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Accounts.findFirst).not.toHaveBeenCalled();
    expect(prismadb.crm_Contracts.findMany).not.toHaveBeenCalled();
  });

  it("returns [] when assertCanReadAccount misses (out-of-scope)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getContractsByAccountId("a1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Accounts.findFirst).toHaveBeenCalledTimes(1);
    expect(prismadb.crm_Contracts.findMany).not.toHaveBeenCalled();
  });

  it("user with account access: where merges account + contractReadScopeWhere", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.crm_Contracts.findMany as jest.Mock).mockResolvedValue([{ id: "c1" }]);
    const res = await getContractsByAccountId("a1");
    expect(res).toEqual([{ id: "c1" }]);
    const call = (prismadb.crm_Contracts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.account).toBe("a1");
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.OR).toEqual(userOR("u1"));
  });

  it("manager: where = { account, deletedAt:null } (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({ id: "a1" });
    (prismadb.crm_Contracts.findMany as jest.Mock).mockResolvedValue([]);
    await getContractsByAccountId("a1");
    const call = (prismadb.crm_Contracts.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ account: "a1", deletedAt: null });
    expect(call.where.OR).toBeUndefined();
  });
});
