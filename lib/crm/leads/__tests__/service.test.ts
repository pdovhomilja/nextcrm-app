// Rules the lead service enforces for every caller: partner limits, assignee
// checks, lookup ids, admin-only restore and the web-form create.

jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn(async () => undefined) } }));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(async () => undefined), diffObjects: jest.fn(() => []) }));
jest.mock("@/lib/authz/scopes/crm", () => ({
  PARTNER_EDIT: { partnerEdit: true },
  assertCanWriteLead: jest.fn(),
  assertCanWriteAccount: jest.fn(),
}));
jest.mock("@/lib/authz/assignable-user", () => ({ assertAssignableUser: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findFirst: jest.fn() },
    crm_Leads: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    crm_Lead_Statuses: { findUnique: jest.fn() },
    crm_Lead_Sources: { findUnique: jest.fn() },
    crm_Lead_Types: { findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import sendEmail from "@/lib/sendmail";
import { writeAuditLog } from "@/lib/audit-log";
import { assertCanWriteAccount, assertCanWriteLead } from "@/lib/authz/scopes/crm";
import { assertAssignableUser } from "@/lib/authz/assignable-user";
import { AuthorizationError } from "@/lib/authz/errors";
import * as svc from "@/lib/crm/leads/service";
import { LeadError } from "@/lib/crm/leads/types";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const USER = { id: "u1", role: "user" as const };
const PARTNER = { id: "p1", role: "partner" as const };
const ADMIN = { id: "a1", role: "admin" as const };
const code = (p: Promise<unknown>) => p.then(() => "ok", (e) => (e instanceof LeadError ? e.code : e));

beforeEach(() => {
  jest.clearAllMocks();
  db.users.findFirst.mockResolvedValue({ email: "rep@example.com", userLanguage: "en" });
  db.crm_Leads.create.mockImplementation(async ({ data }) => ({ id: "L", firstName: null, ...data }));
  db.crm_Leads.update.mockImplementation(async ({ data }) => ({ id: "L", firstName: null, lastName: "X", ...data }));
  db.crm_Leads.findUnique.mockResolvedValue({ id: "L", assigned_to: "rep" });
});

describe("createLead", () => {
  it("a partner must link one of his accounts, and the lead is his", async () => {
    expect(await code(svc.createLead(PARTNER, { lastName: "X" }))).toBe("forbidden");
    await svc.createLead(PARTNER, { lastName: "X", accountsIDs: "acc", assigned_to: "rep" });
    expect(assertCanWriteAccount).toHaveBeenCalledWith(PARTNER, "acc", { partnerEdit: true });
    expect(db.crm_Leads.create.mock.calls[0][0].data.assigned_to).toBe("p1");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("maps a denied account link to forbidden and writes nothing", async () => {
    (assertCanWriteAccount as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.createLead(USER, { lastName: "X", accountsIDs: "acc" }))).toBe("forbidden");
    expect(db.crm_Leads.create).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("checks and mails another assignee", async () => {
    await svc.createLead(USER, { lastName: "X", assigned_to: "rep" });
    expect(assertAssignableUser).toHaveBeenCalledWith(USER, "rep");
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "rep@example.com" }));
  });

  it("refuses an inactive assignee", async () => {
    (assertAssignableUser as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.createLead(USER, { lastName: "X", assigned_to: "gone" }))).toBe("forbidden");
    expect(db.crm_Leads.create).not.toHaveBeenCalled();
  });

  it("an unknown status id is notFound", async () => {
    db.crm_Lead_Statuses.findUnique.mockResolvedValue(null);
    expect(await code(svc.createLead(USER, { lastName: "X", lead_status_id: "s" }))).toBe("notFound");
    expect(db.crm_Leads.create).not.toHaveBeenCalled();
  });
});

describe("updateLead", () => {
  it("a partner keeps the assignee and the account link", async () => {
    await svc.updateLead(PARTNER, "L", { lastName: "X", assigned_to: "p1", accountsIDs: "" });
    expect(assertCanWriteLead).toHaveBeenCalledWith(PARTNER, "L", { partnerEdit: true });
    const data = db.crm_Leads.update.mock.calls[0][0].data;
    expect(data.assigned_to).toBeUndefined();
    expect(data.accountsIDs).toBeUndefined();
  });

  it("a partner may relink only to another of his accounts", async () => {
    (assertCanWriteAccount as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.updateLead(PARTNER, "L", { accountsIDs: "other" }))).toBe("forbidden");
    expect(db.crm_Leads.update).not.toHaveBeenCalled();
  });

  it("a user may not relink to an account he can't write, and nothing is written", async () => {
    (assertCanWriteAccount as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.updateLead(USER, "L", { lastName: "X", accountsIDs: "foreign" }))).toBe("forbidden");
    expect(assertCanWriteAccount).toHaveBeenCalledWith(USER, "foreign", { partnerEdit: true });
    expect(db.crm_Leads.update).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("a user may relink to an account he can write", async () => {
    await svc.updateLead(USER, "L", { lastName: "X", accountsIDs: "mine" });
    expect(assertCanWriteAccount).toHaveBeenCalledWith(USER, "mine", { partnerEdit: true });
    expect(db.crm_Leads.update.mock.calls[0][0].data.accountsIDs).toBe("mine");
  });

  it("re-saving the current account link is not re-checked", async () => {
    db.crm_Leads.findUnique.mockResolvedValue({ id: "L", assigned_to: "rep", accountsIDs: "theirs" });
    await svc.updateLead(USER, "L", { lastName: "X", accountsIDs: "theirs" });
    expect(assertCanWriteAccount).not.toHaveBeenCalled();
    expect(db.crm_Leads.update).toHaveBeenCalled();
  });

  it.each([null, ""])("a user may unlink the account (%p) without an account check", async (accountsIDs) => {
    db.crm_Leads.findUnique.mockResolvedValue({ id: "L", assigned_to: "rep", accountsIDs: "theirs" });
    await svc.updateLead(USER, "L", { lastName: "X", accountsIDs });
    expect(assertCanWriteAccount).not.toHaveBeenCalled();
    expect(db.crm_Leads.update.mock.calls[0][0].data.accountsIDs).toBe(accountsIDs);
  });

  it("re-saving the current assignee neither re-checks nor re-mails", async () => {
    await svc.updateLead(USER, "L", { lastName: "X", assigned_to: "rep" });
    expect(assertAssignableUser).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("a new assignee is checked and mailed", async () => {
    await svc.updateLead(USER, "L", { assigned_to: "rep2" });
    expect(assertAssignableUser).toHaveBeenCalledWith(USER, "rep2");
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(inngest.send).toHaveBeenCalledWith({ name: "crm/lead.saved", data: { record_id: "L" } });
  });
});

describe("deleteLead and restoreLead", () => {
  it("delete writes the audit row and sends no event", async () => {
    await svc.deleteLead(USER, "L");
    expect(assertCanWriteLead).toHaveBeenCalledWith(USER, "L");
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "deleted", userId: "u1" }));
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("restore is admin only", async () => {
    expect(await code(svc.restoreLead(USER, "L"))).toBe("forbidden");
    expect(db.crm_Leads.update).not.toHaveBeenCalled();
    await svc.restoreLead(ADMIN, "L");
    expect(db.crm_Leads.update.mock.calls[0][0].data).toEqual({ deletedAt: null, deletedBy: null });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "restored", userId: "a1" }));
  });
});

it("createWebLead writes an audit row marked as the web form's, without a user, and sends crm/lead.saved", async () => {
  await svc.createWebLead({ lastName: "X", email: "x@example.com" });
  expect(db.crm_Leads.create.mock.calls[0][0].data).toEqual({ v: 1, lastName: "X", email: "x@example.com" });
  expect(writeAuditLog).toHaveBeenCalledWith(
    expect.objectContaining({ action: "created", userId: null, changes: [{ field: "web_form", old: null, new: "create-lead-from-web" }] }),
  );
  expect(inngest.send).toHaveBeenCalledWith({ name: "crm/lead.saved", data: { record_id: "L" } });
});
