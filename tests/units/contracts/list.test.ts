import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", () => ({
  ...vi.importActual("react"),
  cache: <T extends (...a: unknown[]) => unknown>(fn: T) => fn,
}));

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: vi.fn() },
    crm_Accounts: { findFirst: vi.fn() },
    crm_Contracts: { findMany: vi.fn() },
  },
}));

import { getContractsByAccountId, getContractsWithIncludes } from "@/actions/crm/get-contracts";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

const userOR = (uid: string) => [
  { assigned_to: uid },
  { createdBy: uid },
  {
    assigned_account: {
      OR: [{ assigned_to: uid }, { createdBy: uid }, { watchers: { some: { user_id: uid } } }],
    },
  },
];

describe("getContractsWithIncludes scope (list-all)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getContractsWithIncludes();
    expect(res).toEqual([]);
    expect(prismadb.crm_Contracts.findMany).not.toHaveBeenCalled();
  });

  it("user role: where includes deletedAt:null and OR scope", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Contracts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await getContractsWithIncludes();
    const call = (prismadb.crm_Contracts.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.OR).toEqual(userOR("u1"));
  });

  it("manager: where = { deletedAt:null } (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Contracts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await getContractsWithIncludes();
    const call = (prismadb.crm_Contracts.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where).toEqual({ deletedAt: null });
    expect(call.where.OR).toBeUndefined();
  });
});

describe("getContractsByAccountId scope (list-by-account)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getContractsByAccountId("a1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Accounts.findFirst).not.toHaveBeenCalled();
    expect(prismadb.crm_Contracts.findMany).not.toHaveBeenCalled();
  });

  it("returns [] when assertCanReadAccount misses (out-of-scope)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getContractsByAccountId("a1");
    expect(res).toEqual([]);
    expect(prismadb.crm_Accounts.findFirst).toHaveBeenCalledTimes(1);
    expect(prismadb.crm_Contracts.findMany).not.toHaveBeenCalled();
  });

  it("user with account access: where merges account + contractReadScopeWhere", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Accounts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    (prismadb.crm_Contracts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "c1" }]);
    const res = await getContractsByAccountId("a1");
    expect(res).toEqual([{ id: "c1" }]);
    const call = (prismadb.crm_Contracts.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where.account).toBe("a1");
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.OR).toEqual(userOR("u1"));
  });

  it("manager: where = { account, deletedAt:null } (no OR)", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Accounts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a1" });
    (prismadb.crm_Contracts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await getContractsByAccountId("a1");
    const call = (prismadb.crm_Contracts.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.where).toEqual({ account: "a1", deletedAt: null });
    expect(call.where.OR).toBeUndefined();
  });
});
