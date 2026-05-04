jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    crm_AuditLog: { findMany: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getAuditLogByEntity } from "../get-audit-log-by-entity";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const fa = (prismadb as any).crm_Accounts.findFirst as jest.Mock;
const auditFm = (prismadb as any).crm_AuditLog.findMany as jest.Mock;

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => jest.clearAllMocks());

describe("getAuditLogByEntity entity-scope", () => {
  it("returns empty page when unauthenticated and does not query audit log", async () => {
    gs.mockResolvedValue(null as any);
    const r = await getAuditLogByEntity("account", ACCOUNT_ID);
    expect(r).toEqual({ data: [], nextCursor: null });
    expect(auditFm).not.toHaveBeenCalled();
  });

  it("returns empty page when user cannot read the entity", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fa.mockResolvedValue(null);
    const r = await getAuditLogByEntity("account", ACCOUNT_ID);
    expect(r).toEqual({ data: [], nextCursor: null });
    expect(auditFm).not.toHaveBeenCalled();
  });

  it("returns audit entries when user can read the entity", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    fa.mockResolvedValue({ id: ACCOUNT_ID });
    auditFm.mockResolvedValue([
      { id: "e1", entityType: "account", entityId: ACCOUNT_ID, user: null },
    ]);
    const r = await getAuditLogByEntity("account", ACCOUNT_ID);
    expect(r.data).toHaveLength(1);
    expect(r.nextCursor).toBeNull();
    expect(auditFm).toHaveBeenCalledTimes(1);
  });

  it("manager can read any entity audit log", async () => {
    gs.mockResolvedValue({ user: { id: "m" } } as any);
    fu.mockResolvedValue({ id: "m", role: "manager" } as any);
    fa.mockResolvedValue({ id: ACCOUNT_ID });
    auditFm.mockResolvedValue([]);
    const r = await getAuditLogByEntity("account", ACCOUNT_ID);
    expect(r).toEqual({ data: [], nextCursor: null });
    expect(auditFm).toHaveBeenCalledTimes(1);
  });
});
