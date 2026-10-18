jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn(), update: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { setPartnerAccount } from "../set-partner-account";
import { writeAuditLog } from "@/lib/audit-log";

const gs = getSession as jest.Mock;
const findUser = prismadb.users.findUnique as jest.Mock;
const upd = prismadb.users.update as jest.Mock;
const findAccount = prismadb.crm_Accounts.findFirst as jest.Mock;

const ACC = "22222222-2222-2222-2222-222222222222";

// requireRole reads the actor first; the action then reads the target user.
function actorAndTarget(actorRole: string, targetRole: string | null) {
  gs.mockResolvedValue({ user: { id: "a" } });
  findUser.mockResolvedValueOnce({ id: "a", role: actorRole });
  findUser.mockResolvedValueOnce(targetRole ? { id: "p", role: targetRole, partnerAccountId: null } : null);
}

beforeEach(() => jest.resetAllMocks());

describe("setPartnerAccount", () => {
  it("is admin only", async () => {
    actorAndTarget("manager", "partner");
    expect(await setPartnerAccount("p", ACC)).toEqual({ error: "Forbidden" });
    expect(upd).not.toHaveBeenCalled();
  });

  it("sets the partner's own company account", async () => {
    actorAndTarget("admin", "partner");
    findAccount.mockResolvedValue({ id: ACC });
    upd.mockResolvedValue({ id: "p", partnerAccountId: ACC });
    expect(await setPartnerAccount("p", ACC)).toEqual({ data: { id: "p", partnerAccountId: ACC } });
    expect(upd.mock.calls[0][0]).toMatchObject({ where: { id: "p" }, data: { partnerAccountId: ACC } });
    expect(findAccount.mock.calls[0][0]).toMatchObject({ where: { id: ACC, deletedAt: null } });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      entityType: "user", entityId: "p", action: "updated", userId: "a",
      changes: [{ field: "partnerAccountId", old: null, new: ACC }],
    }));
  });

  it("rethrows an unexpected error instead of calling it Unauthorized", async () => {
    gs.mockRejectedValue(new Error("db down"));
    await expect(setPartnerAccount("p", ACC)).rejects.toThrow("db down");
  });

  it("clears it with null", async () => {
    actorAndTarget("admin", "partner");
    upd.mockResolvedValue({ id: "p", partnerAccountId: null });
    await setPartnerAccount("p", null);
    expect(upd.mock.calls[0][0].data).toEqual({ partnerAccountId: null });
    expect(findAccount).not.toHaveBeenCalled();
  });

  it("refuses a user who is not a partner", async () => {
    actorAndTarget("admin", "user");
    expect(await setPartnerAccount("p", ACC)).toEqual({ error: "User is not a partner" });
    expect(upd).not.toHaveBeenCalled();
  });

  it("refuses an unknown or deleted account", async () => {
    actorAndTarget("admin", "partner");
    findAccount.mockResolvedValue(null);
    expect(await setPartnerAccount("p", ACC)).toEqual({ error: "Account not found" });
    expect(upd).not.toHaveBeenCalled();
  });
});
