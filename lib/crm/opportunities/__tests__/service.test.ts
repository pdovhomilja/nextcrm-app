// Rules the opportunity service enforces for every caller: partner limits, link
// and assignee checks, lookup ids, the approval gate, the status rule and
// admin-only restore.

jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn(async () => undefined) } }));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(async () => undefined), diffObjects: jest.fn(() => []) }));
jest.mock("@/lib/currency", () => ({
  getDefaultCurrency: jest.fn(async () => "USD"),
  getSnapshotRate: jest.fn(async () => "1.25"),
}));
jest.mock("@/lib/crm/stage-transition", () => ({ handleStageTransition: jest.fn(async () => false) }));
jest.mock("@/lib/authz/scopes/crm", () => ({
  PARTNER_EDIT: { partnerEdit: true },
  assertCanWriteOpportunity: jest.fn(),
  assertCanWriteAccount: jest.fn(),
  assertCanWriteContact: jest.fn(),
  assertCanReadCampaign: jest.fn(),
}));
jest.mock("@/lib/authz/assignable-user", () => ({ assertAssignableUser: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findFirst: jest.fn() },
    crm_Opportunities: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    crm_Contacts: { findFirst: jest.fn() },
    crm_Opportunities_Sales_Stages: { findUnique: jest.fn() },
    crm_Opportunities_Type: { findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import sendEmail from "@/lib/sendmail";
import { writeAuditLog } from "@/lib/audit-log";
import {
  assertCanWriteAccount,
  assertCanWriteContact,
  assertCanWriteOpportunity,
  assertCanReadCampaign,
} from "@/lib/authz/scopes/crm";
import { assertAssignableUser } from "@/lib/authz/assignable-user";
import { AuthorizationError } from "@/lib/authz/errors";
import * as svc from "@/lib/crm/opportunities/service";
import { OpportunityError, opportunityErrorMessage } from "@/lib/crm/opportunities/types";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const USER = { id: "u1", role: "user" as const };
const PARTNER = { id: "p1", role: "partner" as const };
const ADMIN = { id: "a1", role: "admin" as const };
const STORED = {
  id: "O", name: "Deal", account: "acc", contact: "con", campaign: "camp", assigned_to: "rep",
  sales_stage: "s1", approval_status: "NONE",
};
const code = (p: Promise<unknown>) => p.then(() => "ok", (e) => (e instanceof OpportunityError ? e.code : e));
const created = () => db.crm_Opportunities.create.mock.calls[0][0].data;
const updated = () => db.crm_Opportunities.update.mock.calls[0][0].data;

beforeEach(() => {
  jest.clearAllMocks();
  db.users.findFirst.mockResolvedValue({ email: "rep@example.com", userLanguage: "en" });
  db.crm_Opportunities.create.mockImplementation(async ({ data }) => ({ id: "O", ...data }));
  db.crm_Opportunities.update.mockImplementation(async ({ data }) => ({ ...STORED, ...data }));
  db.crm_Opportunities.findUnique.mockResolvedValue(STORED);
  db.crm_Accounts.findFirst.mockResolvedValue({ id: "acc" });
  db.crm_Contacts.findFirst.mockResolvedValue({ id: "con" });
  db.crm_Opportunities_Sales_Stages.findUnique.mockResolvedValue({ id: "s", stage_kind: null });
  db.crm_Opportunities_Type.findUnique.mockResolvedValue({ id: "t" });
});

describe("createOpportunity", () => {
  it("a partner must link one of his accounts and contacts, and the deal is his", async () => {
    expect(await code(svc.createOpportunity(PARTNER, { name: "X" }))).toBe("forbidden");
    await svc.createOpportunity(PARTNER, { name: "X", account: "acc", contact: "con", assigned_to: "rep" });
    expect(assertCanWriteAccount).toHaveBeenCalledWith(PARTNER, "acc", { partnerEdit: true });
    expect(assertCanWriteContact).toHaveBeenCalledWith(PARTNER, "con", { partnerEdit: true });
    expect(created().assigned_to).toBe("p1");
    expect(assertAssignableUser).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("refuses a soft-deleted account, contact or a denied campaign and writes nothing", async () => {
    db.crm_Accounts.findFirst.mockResolvedValueOnce(null);
    expect(await code(svc.createOpportunity(USER, { name: "X", account: "gone" }))).toBe("forbidden");
    expect(db.crm_Accounts.findFirst.mock.calls[0][0].where).toEqual({ id: "gone", deletedAt: null });
    db.crm_Contacts.findFirst.mockResolvedValueOnce(null);
    expect(await code(svc.createOpportunity(USER, { name: "X", contact: "gone" }))).toBe("forbidden");
    (assertCanReadCampaign as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.createOpportunity(USER, { name: "X", campaign: "foreign" }))).toBe("forbidden");
    expect(db.crm_Opportunities.create).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("checks a contact the user links, whatever his role", async () => {
    (assertCanWriteContact as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.createOpportunity(USER, { name: "X", contact: "foreign" }))).toBe("forbidden");
    expect(db.crm_Opportunities.create).not.toHaveBeenCalled();
  });

  it("checks and mails another assignee; an inactive one is refused", async () => {
    await svc.createOpportunity(USER, { name: "X", assigned_to: "rep" });
    expect(assertAssignableUser).toHaveBeenCalledWith(USER, "rep");
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "rep@example.com" }));

    jest.clearAllMocks();
    (assertAssignableUser as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.createOpportunity(USER, { name: "X", assigned_to: "inactive" }))).toBe("forbidden");
    expect(db.crm_Opportunities.create).not.toHaveBeenCalled();
  });

  it("refuses to start a deal in a qualified stage", async () => {
    db.crm_Opportunities_Sales_Stages.findUnique.mockResolvedValue({ id: "q", stage_kind: "qualified" });
    const err = await svc.createOpportunity(USER, { name: "X", sales_stage: "q" }).catch((e) => e);
    expect(err).toBeInstanceOf(OpportunityError);
    expect(err.code).toBe("blocked");
    expect(opportunityErrorMessage(err)).toContain("Quote approval is required");
    expect(db.crm_Opportunities.create).not.toHaveBeenCalled();
  });

  it("maps an unknown stage or type to notFound", async () => {
    db.crm_Opportunities_Sales_Stages.findUnique.mockResolvedValueOnce(null);
    const err = await svc.createOpportunity(USER, { name: "X", sales_stage: "nope" }).catch((e) => e);
    expect(opportunityErrorMessage(err)).toBe("Sales stage not found");
    db.crm_Opportunities_Type.findUnique.mockResolvedValueOnce(null);
    expect(await code(svc.createOpportunity(USER, { name: "X", type: "nope" }))).toBe("notFound");
    expect(db.crm_Opportunities.create).not.toHaveBeenCalled();
  });

  it("stores the snapshot rate, ACTIVE status and the caller as author", async () => {
    await svc.createOpportunity(USER, { name: "X", currency: "EUR" });
    expect(created()).toMatchObject({
      snapshot_rate: 1.25, status: "ACTIVE", assigned_to: "u1", createdBy: "u1", updatedBy: "u1", last_activity_by: "u1",
    });
    expect(inngest.send).toHaveBeenCalledWith({ name: "crm/opportunity.saved", data: { record_id: "O" } });
  });
});

describe("updateOpportunity", () => {
  it("does not re-check the stored account, contact, campaign or assignee", async () => {
    await svc.updateOpportunity(USER, "O", { account: "acc", contact: "con", campaign: "camp", assigned_to: "rep" });
    expect(assertCanWriteOpportunity).toHaveBeenCalledWith(USER, "O", { partnerEdit: true });
    expect(assertCanWriteAccount).not.toHaveBeenCalled();
    expect(assertCanWriteContact).not.toHaveBeenCalled();
    expect(assertCanReadCampaign).not.toHaveBeenCalled();
    expect(assertAssignableUser).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("checks each new link and refuses a denied one before writing", async () => {
    for (const [field, assert] of [
      ["account", assertCanWriteAccount],
      ["contact", assertCanWriteContact],
      ["campaign", assertCanReadCampaign],
      ["assigned_to", assertAssignableUser],
    ] as const) {
      jest.clearAllMocks();
      (assert as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
      expect(await code(svc.updateOpportunity(USER, "O", { [field]: "new" }))).toBe("forbidden");
      expect(assert).toHaveBeenCalled();
      expect(db.crm_Opportunities.update).not.toHaveBeenCalled();
    }
  });

  it("unlinks on null without checking anything", async () => {
    await svc.updateOpportunity(USER, "O", { account: null, contact: null });
    expect(updated()).toMatchObject({ account: null, contact: null });
    expect(db.crm_Accounts.findFirst).not.toHaveBeenCalled();
    expect(db.crm_Contacts.findFirst).not.toHaveBeenCalled();
  });

  it("a partner never reassigns or unlinks the account, and every contact he sends is checked", async () => {
    await svc.updateOpportunity(PARTNER, "O", { assigned_to: "someone", account: null, contact: "con" });
    expect(updated().assigned_to).toBeUndefined();
    expect(updated().account).toBeUndefined();
    expect(assertCanWriteContact).toHaveBeenCalledWith(PARTNER, "con", { partnerEdit: true });
    expect(assertAssignableUser).not.toHaveBeenCalled();
  });

  it("mails a new assignee only, never the caller", async () => {
    await svc.updateOpportunity(USER, "O", { assigned_to: "new-rep" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();
    await svc.updateOpportunity(USER, "O", { assigned_to: "u1" });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(assertAssignableUser).not.toHaveBeenCalled();
  });

  it("sets ACTIVE on a stage move or when the caller sends it, and not otherwise", async () => {
    await svc.updateOpportunity(USER, "O", { name: "Renamed" });
    expect(updated()).not.toHaveProperty("status");
    jest.clearAllMocks();
    await svc.updateOpportunity(USER, "O", { sales_stage: "s2" });
    expect(updated().status).toBe("ACTIVE");
    jest.clearAllMocks();
    await svc.updateOpportunity(USER, "O", { name: "Renamed", status: "ACTIVE" });
    expect(updated().status).toBe("ACTIVE");
  });

  it("refuses to enter a qualified stage without an approved quote, and allows it with one", async () => {
    db.crm_Opportunities_Sales_Stages.findUnique.mockResolvedValue({ id: "q", stage_kind: "qualified" });
    expect(await code(svc.updateOpportunity(USER, "O", { sales_stage: "q" }))).toBe("blocked");
    expect(db.crm_Opportunities.update).not.toHaveBeenCalled();
    db.crm_Opportunities.findUnique.mockResolvedValue({ ...STORED, approval_status: "APPROVED" });
    expect(await code(svc.updateOpportunity(USER, "O", { sales_stage: "q" }))).toBe("ok");
  });

  it("maps a denied opportunity to forbidden and writes nothing", async () => {
    (assertCanWriteOpportunity as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.updateOpportunity(USER, "O", { name: "X" }))).toBe("forbidden");
    expect(db.crm_Opportunities.update).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });
});

describe("deleteOpportunity / restoreOpportunity", () => {
  it("delete checks write without PARTNER_EDIT, audits and sends no event", async () => {
    await svc.deleteOpportunity(USER, "O");
    expect(assertCanWriteOpportunity).toHaveBeenCalledWith(USER, "O");
    expect(updated()).toMatchObject({ deletedBy: "u1" });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "deleted", entityId: "O" }));
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("restore is admin only", async () => {
    expect(await code(svc.restoreOpportunity(USER, "O"))).toBe("forbidden");
    expect(db.crm_Opportunities.update).not.toHaveBeenCalled();
    await svc.restoreOpportunity(ADMIN, "O");
    expect(updated()).toEqual({ deletedAt: null, deletedBy: null });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "restored", userId: "a1" }));
  });
});
