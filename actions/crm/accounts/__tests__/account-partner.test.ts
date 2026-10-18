class AuthorizationError extends Error {}
class AuthenticationError extends Error {}
const requireRole = jest.fn();
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn().mockResolvedValue({ id: "u1", role: "user" }),
  requireRole: (...a: unknown[]) => requireRole(...a),
  assertCanWriteAccount: jest.fn(),
  AuthenticationError,
  AuthorizationError,
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: {
      update: jest.fn().mockResolvedValue({ id: "acc-1" }),
      findUnique: jest.fn().mockResolvedValue({ id: "acc-1" }),
      findFirst: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: "acc-1" }),
    },
    users: { findUnique: jest.fn(), findMany: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(), diffObjects: jest.fn(() => null) }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/plugins/action-errors", () => ({ pluginRuleErrorMessage: jest.fn(async () => null) }));

import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { updateAccount } from "@/actions/crm/accounts/update-account";
import { setAccountPartner } from "@/actions/crm/accounts/set-account-partner";
import { getPartnerUsers } from "@/actions/crm/accounts/get-partner-users";

const db = prismadb as unknown as { crm_Accounts: Record<string, jest.Mock>; users: Record<string, jest.Mock> };

beforeEach(() => {
  jest.clearAllMocks();
  requireRole.mockResolvedValue({ id: "m1", role: "manager" });
  db.crm_Accounts.findFirst.mockResolvedValue({ id: "acc-1", partnerUserId: null });
  db.users.findUnique.mockResolvedValue({ id: "p1", role: "partner" });
});

describe("create/update account cannot set the partner", () => {
  it("createAccount drops a partnerUserId sent by the client", async () => {
    await createAccount({ name: "A", partnerUserId: "p1" } as never);
    expect(db.crm_Accounts.create.mock.calls[0][0].data.partnerUserId).toBeUndefined();
  });

  it("updateAccount drops a partnerUserId sent by the client", async () => {
    await updateAccount({ id: "acc-1", name: "A", partnerUserId: "p1" } as never);
    expect(db.crm_Accounts.update.mock.calls[0][0].data.partnerUserId).toBeUndefined();
  });
});

describe("setAccountPartner", () => {
  it("is refused below manager", async () => {
    requireRole.mockRejectedValue(new AuthorizationError());
    expect(await setAccountPartner("acc-1", "p1")).toEqual({ error: "Forbidden" });
    expect(requireRole).toHaveBeenCalledWith(["admin", "manager"]);
    expect(db.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("manager sets a partner and the change is audited", async () => {
    db.crm_Accounts.update.mockResolvedValue({ id: "acc-1", partnerUserId: "p1" });
    expect(await setAccountPartner("acc-1", "p1")).toEqual({ data: { id: "acc-1", partnerUserId: "p1" } });
    expect(db.crm_Accounts.update.mock.calls[0][0]).toMatchObject({
      where: { id: "acc-1" },
      data: { partnerUserId: "p1", updatedBy: "m1" },
    });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      entityType: "account", entityId: "acc-1", action: "updated",
      changes: [{ field: "partnerUserId", old: null, new: "p1" }], userId: "m1",
    }));
  });

  it("clears the partner with null", async () => {
    db.crm_Accounts.update.mockResolvedValue({ id: "acc-1", partnerUserId: null });
    await setAccountPartner("acc-1", null);
    expect(db.crm_Accounts.update.mock.calls[0][0].data.partnerUserId).toBeNull();
    expect(db.users.findUnique).not.toHaveBeenCalled();
  });

  it("rethrows an unexpected error instead of calling it Unauthorized", async () => {
    requireRole.mockRejectedValue(new Error("db down"));
    await expect(setAccountPartner("acc-1", "p1")).rejects.toThrow("db down");
  });

  it("refuses a user whose role is not partner", async () => {
    db.users.findUnique.mockResolvedValue({ id: "u2", role: "user" });
    expect(await setAccountPartner("acc-1", "u2")).toEqual({ error: "User is not a partner" });
    expect(db.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("refuses an unknown or deleted account", async () => {
    db.crm_Accounts.findFirst.mockResolvedValue(null);
    expect(await setAccountPartner("acc-x", "p1")).toEqual({ error: "Account not found" });
    expect(db.crm_Accounts.findFirst.mock.calls[0][0]).toMatchObject({ where: { id: "acc-x", deletedAt: null } });
    expect(db.crm_Accounts.update).not.toHaveBeenCalled();
  });
});

describe("getPartnerUsers (options for the Partner picker)", () => {
  it("lists only users with role partner, for managers", async () => {
    db.users.findMany.mockResolvedValue([{ id: "p1", name: "P", email: "p@x" }]);
    expect(await getPartnerUsers()).toEqual([{ id: "p1", name: "P", email: "p@x" }]);
    expect(requireRole).toHaveBeenCalledWith(["admin", "manager"]);
    expect(db.users.findMany.mock.calls[0][0]).toMatchObject({ where: { role: "partner", userStatus: "ACTIVE" } });
  });

  it("gives nothing below manager", async () => {
    requireRole.mockRejectedValue(new AuthorizationError());
    expect(await getPartnerUsers()).toEqual([]);
    expect(db.users.findMany).not.toHaveBeenCalled();
  });
});
