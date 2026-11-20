// Rules the account service enforces for every caller: partner limits, the
// assignee and price list checks, soft-deleted rows, the column allow-list,
// the events and admin-only restore.

jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn(async () => undefined) } }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(async () => undefined), diffObjects: jest.fn(() => []) }));
jest.mock("@/lib/authz/scopes/crm", () => ({
  PARTNER_EDIT: { partnerEdit: true },
  assertCanWriteAccount: jest.fn(),
}));
jest.mock("@/lib/authz/assignable-user", () => ({ assertAssignableUser: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    crm_PriceLists: { findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { assertCanWriteAccount } from "@/lib/authz/scopes/crm";
import { assertAssignableUser } from "@/lib/authz/assignable-user";
import { AuthorizationError } from "@/lib/authz/errors";
import * as svc from "@/lib/crm/accounts/service";
import { AccountError, accountErrorMessage } from "@/lib/crm/accounts/types";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const USER = { id: "u1", role: "user" as const };
const PARTNER = { id: "p1", role: "partner" as const };
const ADMIN = { id: "a1", role: "admin" as const };
const STORED = { id: "A", name: "Acme", assigned_to: "rep", partnerUserId: null, deletedAt: null };
const code = (p: Promise<unknown>) => p.then(() => "ok", (e) => (e instanceof AccountError ? e.code : e));
const created = () => db.crm_Accounts.create.mock.calls[0][0].data;
const updated = () => db.crm_Accounts.update.mock.calls[0][0].data;
const events = () => (inngest.send as jest.Mock).mock.calls.map(([e]) => e.name);

beforeEach(() => {
  jest.clearAllMocks();
  db.crm_Accounts.create.mockImplementation(async ({ data }) => ({ id: "A", ...data }));
  db.crm_Accounts.update.mockImplementation(async ({ data }) => ({ ...STORED, ...data }));
  db.crm_Accounts.findUnique.mockResolvedValue(STORED);
  db.crm_PriceLists.findUnique.mockResolvedValue({ id: "L" });
});

describe("createAccount", () => {
  it("assigns to the caller when no assignee is given, as an active account", async () => {
    await svc.createAccount(USER, { name: "X" });
    expect(created()).toMatchObject({ assigned_to: "u1", createdBy: "u1", updatedBy: "u1", status: "Active", v: 0 });
    expect(created().partnerUserId).toBeUndefined();
    expect(assertAssignableUser).not.toHaveBeenCalled();
    expect(events()).toEqual(["crm/account.saved"]);
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "created", entityId: "A", userId: "u1" }));
  });

  it("checks another assignee; an inactive one is refused and nothing is written", async () => {
    await svc.createAccount(USER, { name: "X", assigned_to: "rep" });
    expect(assertAssignableUser).toHaveBeenCalledWith(USER, "rep");
    expect(created().assigned_to).toBe("rep");

    jest.clearAllMocks();
    (assertAssignableUser as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.createAccount(USER, { name: "X", assigned_to: "inactive" }))).toBe("forbidden");
    expect(db.crm_Accounts.create).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("a partner's account names that partner and has no internal owner, whatever assigned_to says", async () => {
    await svc.createAccount(PARTNER, { name: "X", assigned_to: "rep" });
    expect(created()).toMatchObject({ assigned_to: null, partnerUserId: "p1" });
    expect(assertAssignableUser).not.toHaveBeenCalled();
  });

  it("maps an unknown price list to notFound and writes nothing", async () => {
    db.crm_PriceLists.findUnique.mockResolvedValueOnce(null);
    const err = await svc.createAccount(USER, { name: "X", pricelist_id: "gone" }).catch((e) => e);
    expect(err).toBeInstanceOf(AccountError);
    expect(accountErrorMessage(err)).toBe("Price list not found");
    expect(db.crm_Accounts.create).not.toHaveBeenCalled();
  });

  it("writes only account form columns", async () => {
    await svc.createAccount(USER, { name: "X", case_study_approved: true, partnerUserId: "p9", createdBy: "x", deletedAt: null } as never);
    expect(created()).not.toHaveProperty("case_study_approved");
    expect(created()).not.toHaveProperty("deletedAt");
    expect(created().partnerUserId).toBeUndefined();
    expect(created().createdBy).toBe("u1");
  });
});

describe("updateAccount", () => {
  it("checks write access with the partner opt-in, writes the diff and sends crm/account.saved", async () => {
    await svc.updateAccount(USER, "A", { name: "Y" });
    expect(assertCanWriteAccount).toHaveBeenCalledWith(USER, "A", { partnerEdit: true });
    expect(updated()).toMatchObject({ name: "Y", updatedBy: "u1" });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "updated", entityId: "A" }));
    expect(events()).toEqual(["crm/account.saved"]);
  });

  it("a denied caller writes nothing", async () => {
    (assertCanWriteAccount as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.updateAccount(USER, "A", { name: "Y" }))).toBe("forbidden");
    expect(db.crm_Accounts.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("refuses a soft-deleted account", async () => {
    db.crm_Accounts.findUnique.mockResolvedValueOnce(null);
    expect(await code(svc.updateAccount(USER, "A", { name: "Y" }))).toBe("forbidden");
    expect(db.crm_Accounts.findUnique.mock.calls[0][0].where).toEqual({ id: "A", deletedAt: null });
    expect(db.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("checks only a new assignee other than the caller; null unassigns", async () => {
    await svc.updateAccount(USER, "A", { assigned_to: "rep" });
    await svc.updateAccount(USER, "A", { assigned_to: "u1" });
    await svc.updateAccount(USER, "A", { assigned_to: null });
    expect(assertAssignableUser).not.toHaveBeenCalled();
    expect(db.crm_Accounts.update.mock.calls[2][0].data.assigned_to).toBeNull();

    (assertAssignableUser as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.updateAccount(USER, "A", { assigned_to: "inactive" }))).toBe("forbidden");
    expect(assertAssignableUser).toHaveBeenCalledWith(USER, "inactive");
    expect(db.crm_Accounts.update).toHaveBeenCalledTimes(3);
  });

  it("a partner never changes the internal owner", async () => {
    await svc.updateAccount(PARTNER, "A", { name: "Y", assigned_to: "other" });
    expect(updated()).not.toHaveProperty("assigned_to");
    expect(assertAssignableUser).not.toHaveBeenCalled();
  });

  it("maps an unknown price list to notFound; null clears it without a lookup", async () => {
    db.crm_PriceLists.findUnique.mockResolvedValueOnce(null);
    expect(await code(svc.updateAccount(USER, "A", { pricelist_id: "gone" }))).toBe("notFound");
    expect(db.crm_Accounts.update).not.toHaveBeenCalled();
    db.crm_PriceLists.findUnique.mockClear();
    await svc.updateAccount(USER, "A", { pricelist_id: null });
    expect(db.crm_PriceLists.findUnique).not.toHaveBeenCalled();
    expect(updated().pricelist_id).toBeNull();
  });

  it("writes only account form columns", async () => {
    await svc.updateAccount(USER, "A", { name: "Y", partnerUserId: "p9", case_study_approved: true, deletedAt: null } as never);
    expect(updated()).not.toHaveProperty("partnerUserId");
    expect(updated()).not.toHaveProperty("case_study_approved");
    expect(updated()).not.toHaveProperty("deletedAt");
  });
});

describe("deleteAccount", () => {
  it("soft-deletes with an audit row and crm/account.deleted; partners get no opt-in", async () => {
    await svc.deleteAccount(USER, "A");
    expect(assertCanWriteAccount).toHaveBeenCalledWith(USER, "A");
    expect(updated()).toMatchObject({ deletedBy: "u1", deletedAt: expect.any(Date) });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "deleted", entityId: "A" }));
    expect(events()).toEqual(["crm/account.deleted"]);
  });

  it("refuses an account that is already deleted", async () => {
    db.crm_Accounts.findUnique.mockResolvedValueOnce(null);
    expect(await code(svc.deleteAccount(USER, "A"))).toBe("forbidden");
    expect(db.crm_Accounts.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });
});

describe("restoreAccount", () => {
  it("is admin only, writes an audit row and sends no event", async () => {
    expect(await code(svc.restoreAccount(USER, "A"))).toBe("forbidden");
    expect(await code(svc.restoreAccount({ id: "m1", role: "manager" }, "A"))).toBe("forbidden");
    expect(db.crm_Accounts.update).not.toHaveBeenCalled();
    await svc.restoreAccount(ADMIN, "A");
    expect(updated()).toEqual({ deletedAt: null, deletedBy: null });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "restored", userId: "a1" }));
    expect(inngest.send).not.toHaveBeenCalled();
  });
});
