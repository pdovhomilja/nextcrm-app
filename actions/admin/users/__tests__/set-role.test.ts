jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => {
  const prismadb: Record<string, unknown> = {
    users: { findUnique: jest.fn(), update: jest.fn() },
    crm_Accounts: { findMany: jest.fn(), updateMany: jest.fn() },
  };
  prismadb.$transaction = jest.fn(async (fn: (tx: unknown) => unknown) => fn(prismadb));
  return { prismadb };
});
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { setUserRole } from "../set-role";
import { writeAuditLog } from "@/lib/audit-log";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<
  typeof prismadb.users.findUnique
>;
const upd = prismadb.users.update as jest.MockedFunction<
  typeof prismadb.users.update
>;

beforeEach(() => jest.clearAllMocks());

describe("setUserRole", () => {
  it("returns Unauthorized when no session", async () => {
    gs.mockResolvedValue(null as any);
    const res = await setUserRole("target", "manager");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(upd).not.toHaveBeenCalled();
  });

  it("returns Forbidden when not admin", async () => {
    gs.mockResolvedValue({ user: { id: "u" } } as any);
    fu.mockResolvedValue({ id: "u", role: "manager" } as any);
    const res = await setUserRole("target", "user");
    expect(res).toEqual({ error: "Forbidden" });
    expect(upd).not.toHaveBeenCalled();
  });

  it("admin updates role only — does NOT write is_admin", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    upd.mockResolvedValue({ id: "target", role: "manager" } as any);

    const res = await setUserRole("target", "manager");
    expect(res).toEqual({ data: expect.objectContaining({ id: "target" }) });

    expect(upd).toHaveBeenCalledTimes(1);
    const callArgs = upd.mock.calls[0]![0]!;
    expect(callArgs.data).toEqual({ role: "manager" });
    expect(callArgs.data).not.toHaveProperty("is_admin");
  });

  it("admin can make a user a partner", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    upd.mockResolvedValue({ id: "target", role: "partner" } as any);

    const res = await setUserRole("target", "partner");
    expect(res).toEqual({ data: expect.objectContaining({ role: "partner" }) });
    expect(upd.mock.calls[0]![0]!.data).toEqual({ role: "partner" });
  });

  it("rejects a role that does not exist", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    const res = await setUserRole("target", "owner" as any);
    expect(res).toEqual({ error: "Invalid role" });
    expect(upd).not.toHaveBeenCalled();
  });

  it("blocks self-demotion from admin", async () => {
    gs.mockResolvedValue({ user: { id: "a" } } as any);
    fu.mockResolvedValue({ id: "a", role: "admin" } as any);
    const res = await setUserRole("a", "manager");
    expect(res).toEqual({ error: "Cannot remove your own admin role" });
    expect(upd).not.toHaveBeenCalled();
  });

  describe("leaving the partner role", () => {
    const accounts = prismadb.crm_Accounts as unknown as Record<string, jest.Mock>;

    // requireRole reads the actor, then the action reads the target's old role.
    function adminChanging(targetOldRole: string) {
      gs.mockResolvedValue({ user: { id: "a" } } as any);
      fu.mockResolvedValueOnce({ id: "a", role: "admin" } as any);
      fu.mockResolvedValueOnce({ id: "p", role: targetOldRole, partnerAccountId: "own-1" } as any);
      upd.mockResolvedValue({ id: "p", role: "user" } as any);
    }

    it("clears his own account and every account pointing at him, in one transaction, audited", async () => {
      adminChanging("partner");
      accounts.findMany.mockResolvedValue([{ id: "acc-1" }, { id: "acc-2" }]);
      accounts.updateMany.mockResolvedValue({ count: 2 });

      const res = await setUserRole("p", "user");
      expect(res).toEqual({ data: expect.objectContaining({ id: "p" }) });
      expect(prismadb.$transaction).toHaveBeenCalledTimes(1);
      expect(upd.mock.calls[0]![0]!.data).toEqual({ role: "user", partnerAccountId: null });
      expect(accounts.updateMany).toHaveBeenCalledWith({
        where: { partnerUserId: "p" },
        data: { partnerUserId: null, updatedBy: "a" },
      });
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        entityType: "user", entityId: "p", action: "updated", userId: "a",
        changes: [
          { field: "role", old: "partner", new: "user" },
          { field: "partnerAccountId", old: "own-1", new: null },
        ],
      }));
      for (const id of ["acc-1", "acc-2"]) {
        expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
          entityType: "account", entityId: id, action: "updated", userId: "a",
          changes: [{ field: "partnerUserId", old: "p", new: null }],
        }));
      }
    });

    it("leaves partner links alone for other role changes", async () => {
      adminChanging("user");
      await setUserRole("p", "manager");
      expect(prismadb.$transaction).not.toHaveBeenCalled();
      expect(accounts.updateMany).not.toHaveBeenCalled();
      expect(upd.mock.calls[0]![0]!.data).toEqual({ role: "manager" });
    });
  });
});
