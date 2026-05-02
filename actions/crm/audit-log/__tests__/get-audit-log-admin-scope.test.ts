jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_AuditLog: { findMany: jest.fn(), count: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getAuditLogAdmin } from "../get-audit-log-admin";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const auditFm = (prismadb as any).crm_AuditLog.findMany as jest.Mock;
const auditCount = (prismadb as any).crm_AuditLog.count as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("getAuditLogAdmin role guard", () => {
  it("returns Unauthorized when not authenticated", async () => {
    gs.mockResolvedValue(null as any);
    const r = await getAuditLogAdmin();
    expect(r).toEqual({ error: "Unauthorized" });
    expect(auditFm).not.toHaveBeenCalled();
  });

  it("returns Forbidden when user is not admin", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "user" } as any);
    const r = await getAuditLogAdmin();
    expect(r).toEqual({ error: "Forbidden" });
    expect(auditFm).not.toHaveBeenCalled();
  });

  it("returns audit log data for admin", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    auditFm.mockResolvedValue([{ id: "e1" }]);
    auditCount.mockResolvedValue(1);
    const r = await getAuditLogAdmin();
    expect(r).toEqual({ data: [{ id: "e1" }], total: 1, page: 1, totalPages: 1 });
    expect(auditFm).toHaveBeenCalledTimes(1);
  });
});
