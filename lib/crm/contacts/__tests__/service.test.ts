// Rules the contact service enforces for every caller: partner limits, the account
// link and assignee checks, soft-deleted rows, the column allow-lists, the scoped
// enrichment write, the events and admin-only restore.

jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn(async () => undefined) } }));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock("@/lib/audit-log", () => ({
  ...jest.requireActual("@/lib/audit-log"),
  writeAuditLog: jest.fn(async () => undefined),
}));
jest.mock("@/lib/authz/scopes/crm", () => ({
  PARTNER_EDIT: { partnerEdit: true },
  assertCanWriteAccount: jest.fn(),
  assertCanWriteContact: jest.fn(),
  tryScopedUpdateContact: jest.fn(),
}));
jest.mock("@/lib/authz/assignable-user", () => ({ assertAssignableUser: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contacts: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    users: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import sendEmail from "@/lib/sendmail";
import { writeAuditLog } from "@/lib/audit-log";
import { assertCanWriteAccount, assertCanWriteContact, tryScopedUpdateContact } from "@/lib/authz/scopes/crm";
import { assertAssignableUser } from "@/lib/authz/assignable-user";
import { AuthorizationError } from "@/lib/authz/errors";
import * as svc from "@/lib/crm/contacts/service";
import { ContactError } from "@/lib/crm/contacts/types";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const USER = { id: "u1", role: "user" as const };
const PARTNER = { id: "p1", role: "partner" as const };
const ADMIN = { id: "a1", role: "admin" as const };
const STORED = { id: "C", first_name: "Jan", last_name: "Novak", website: null, assigned_to: "rep", accountsIDs: "acc", deletedAt: null };
const code = (p: Promise<unknown>) => p.then(() => "ok", (e) => (e instanceof ContactError ? e.code : e));
const created = () => db.crm_Contacts.create.mock.calls[0][0].data;
const updated = () => db.crm_Contacts.update.mock.calls[0][0].data;
const events = () => (inngest.send as jest.Mock).mock.calls.map(([e]) => e.name);
const nothingWritten = () => {
  expect(db.crm_Contacts.create).not.toHaveBeenCalled();
  expect(db.crm_Contacts.update).not.toHaveBeenCalled();
  expect(writeAuditLog).not.toHaveBeenCalled();
  expect(inngest.send).not.toHaveBeenCalled();
};

beforeEach(() => {
  jest.clearAllMocks();
  db.crm_Contacts.create.mockImplementation(async ({ data }) => ({ id: "C", first_name: null, ...data }));
  db.crm_Contacts.update.mockImplementation(async ({ data }) => ({ ...STORED, ...data }));
  db.crm_Contacts.findUnique.mockResolvedValue(STORED);
  db.crm_Accounts.findFirst.mockResolvedValue({ id: "acc" });
  db.users.findFirst.mockResolvedValue({ id: "rep", email: "rep@example.com", userLanguage: "en" });
  (tryScopedUpdateContact as jest.Mock).mockResolvedValue(true);
});

describe("createContact", () => {
  it("assigns to the caller when no assignee is given; audit row and crm/contact.saved, no mail", async () => {
    await svc.createContact(USER, { last_name: "X" });
    expect(created()).toMatchObject({ last_name: "X", assigned_to: "u1", createdBy: "u1", updatedBy: "u1", v: 0 });
    expect(assertAssignableUser).not.toHaveBeenCalled();
    expect(assertCanWriteAccount).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(events()).toEqual(["crm/contact.saved"]);
    expect(writeAuditLog).toHaveBeenCalledWith({ entityType: "contact", entityId: "C", action: "created", changes: null, userId: "u1" });
  });

  it("checks and mails another assignee; an inactive one is refused and nothing is written", async () => {
    await svc.createContact(USER, { last_name: "X", assigned_to: "rep" });
    expect(assertAssignableUser).toHaveBeenCalledWith(USER, "rep");
    expect(created().assigned_to).toBe("rep");
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "rep@example.com" }));

    jest.clearAllMocks();
    (assertAssignableUser as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.createContact(USER, { last_name: "X", assigned_to: "inactive" }))).toBe("forbidden");
    nothingWritten();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("a linked account needs write access with the partner opt-in; a denied one writes nothing", async () => {
    await svc.createContact(USER, { last_name: "X", accountsIDs: "acc" });
    expect(assertCanWriteAccount).toHaveBeenCalledWith(USER, "acc", { partnerEdit: true });
    expect(created().accountsIDs).toBe("acc");

    jest.clearAllMocks();
    (assertCanWriteAccount as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.createContact(USER, { last_name: "X", accountsIDs: "foreign" }))).toBe("forbidden");
    nothingWritten();
  });

  it("refuses a soft-deleted account like a foreign one", async () => {
    db.crm_Accounts.findFirst.mockResolvedValueOnce(null);
    expect(await code(svc.createContact(USER, { last_name: "X", accountsIDs: "gone" }))).toBe("forbidden");
    expect(db.crm_Accounts.findFirst.mock.calls[0][0].where).toEqual({ id: "gone", deletedAt: null });
    nothingWritten();
  });

  it("a partner must link an account", async () => {
    expect(await code(svc.createContact(PARTNER, { last_name: "X" }))).toBe("forbidden");
    nothingWritten();
  });

  it("a partner's contact is assigned to that partner, whatever assigned_to says", async () => {
    await svc.createContact(PARTNER, { last_name: "X", accountsIDs: "acc", assigned_to: "rep" });
    expect(created()).toMatchObject({ assigned_to: "p1", accountsIDs: "acc" });
    expect(assertAssignableUser).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("writes only contact form columns", async () => {
    await svc.createContact(USER, { last_name: "X", createdBy: "x", deletedAt: null, tags: ["t"], opportunities: {} } as never);
    expect(created()).not.toHaveProperty("deletedAt");
    expect(created()).not.toHaveProperty("tags");
    expect(created()).not.toHaveProperty("opportunities");
    expect(created().createdBy).toBe("u1");
  });
});

describe("createRemoteContact", () => {
  it("writes an audit row with no user and the route's marker, and sends crm/contact.saved", async () => {
    const input = { first_name: "F", last_name: "L", email: "e@example.com", mobile_phone: "1", tags: ["t"], notes: ["n"] };
    await svc.createRemoteContact(input);
    expect(created()).toEqual(input);
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "contact", entityId: "C", action: "created", userId: null,
      changes: [{ field: "remote_form", old: null, new: "create-from-remote" }],
    });
    expect(events()).toEqual(["crm/contact.saved"]);
  });
});

describe("updateContact", () => {
  it("checks write access with the partner opt-in, writes the diff and sends crm/contact.saved", async () => {
    await svc.updateContact(USER, "C", { last_name: "Svoboda" });
    expect(assertCanWriteContact).toHaveBeenCalledWith(USER, "C", { partnerEdit: true });
    expect(updated()).toMatchObject({ last_name: "Svoboda", updatedBy: "u1" });
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "contact", entityId: "C", action: "updated", userId: "u1",
      changes: [{ field: "last_name", old: "Novak", new: "Svoboda" }],
    });
    expect(events()).toEqual(["crm/contact.saved"]);
  });

  it("a denied caller writes nothing", async () => {
    (assertCanWriteContact as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.updateContact(USER, "C", { last_name: "Y" }))).toBe("forbidden");
    nothingWritten();
  });

  it("refuses a soft-deleted contact", async () => {
    db.crm_Contacts.findUnique.mockResolvedValueOnce(null);
    expect(await code(svc.updateContact(USER, "C", { last_name: "Y" }))).toBe("forbidden");
    expect(db.crm_Contacts.findUnique.mock.calls[0][0].where).toEqual({ id: "C", deletedAt: null });
    nothingWritten();
  });

  it("checks only a new account link; re-saving the stored one and unlinking are not checked", async () => {
    await svc.updateContact(USER, "C", { accountsIDs: "acc" });
    await svc.updateContact(USER, "C", { accountsIDs: null });
    expect(assertCanWriteAccount).not.toHaveBeenCalled();
    expect(db.crm_Contacts.update.mock.calls[1][0].data.accountsIDs).toBeNull();

    (assertCanWriteAccount as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.updateContact(USER, "C", { accountsIDs: "foreign" }))).toBe("forbidden");
    expect(assertCanWriteAccount).toHaveBeenCalledWith(USER, "foreign", { partnerEdit: true });
    expect(db.crm_Contacts.update).toHaveBeenCalledTimes(2);
  });

  it("checks only a new assignee other than the caller; null unassigns", async () => {
    await svc.updateContact(USER, "C", { assigned_to: "rep" });
    await svc.updateContact(USER, "C", { assigned_to: "u1" });
    await svc.updateContact(USER, "C", { assigned_to: null });
    expect(assertAssignableUser).not.toHaveBeenCalled();
    expect(db.crm_Contacts.update.mock.calls[2][0].data.assigned_to).toBeNull();

    (assertAssignableUser as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.updateContact(USER, "C", { assigned_to: "inactive" }))).toBe("forbidden");
    expect(assertAssignableUser).toHaveBeenCalledWith(USER, "inactive");
    expect(db.crm_Contacts.update).toHaveBeenCalledTimes(3);
  });

  it("a partner never changes the assignee or unlinks the account", async () => {
    await svc.updateContact(PARTNER, "C", { last_name: "Y", assigned_to: "other", accountsIDs: null });
    expect(updated()).not.toHaveProperty("assigned_to");
    expect(updated()).not.toHaveProperty("accountsIDs");
    expect(assertAssignableUser).not.toHaveBeenCalled();
  });

  it("writes only contact form columns", async () => {
    await svc.updateContact(USER, "C", { last_name: "Y", createdBy: "x", deletedAt: null, notes: ["n"] } as never);
    expect(updated()).not.toHaveProperty("createdBy");
    expect(updated()).not.toHaveProperty("deletedAt");
    expect(updated()).not.toHaveProperty("notes");
  });
});

describe("updateContactFields", () => {
  it("writes through the scoped update, with an audit diff of the written fields and crm/contact.saved", async () => {
    await svc.updateContactFields(USER, "C", { website: "https://w.example" });
    expect(tryScopedUpdateContact).toHaveBeenCalledWith(USER, "C", { website: "https://w.example" });
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "contact", entityId: "C", action: "updated", userId: "u1",
      changes: [{ field: "website", old: null, new: "https://w.example" }],
    });
    expect(events()).toEqual(["crm/contact.saved"]);
  });

  it("a contact outside the caller's scope is notFound, with no audit row or event", async () => {
    (tryScopedUpdateContact as jest.Mock).mockResolvedValueOnce(false);
    expect(await code(svc.updateContactFields(USER, "C", { website: "x" }))).toBe("notFound");
    expect(writeAuditLog).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("a missing or soft-deleted contact is notFound and not written", async () => {
    db.crm_Contacts.findUnique.mockResolvedValueOnce(null);
    expect(await code(svc.updateContactFields(USER, "C", { website: "x" }))).toBe("notFound");
    expect(db.crm_Contacts.findUnique.mock.calls[0][0].where).toEqual({ id: "C", deletedAt: null });
    expect(tryScopedUpdateContact).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("writes only the enrichment columns", async () => {
    await svc.updateContactFields(USER, "C", { website: "w", assigned_to: "x", accountsIDs: "y" } as never);
    expect(tryScopedUpdateContact).toHaveBeenCalledWith(USER, "C", { website: "w" });
  });
});

describe("deleteContact", () => {
  it("soft-deletes with an audit row and no event; partners get no opt-in", async () => {
    await svc.deleteContact(USER, "C");
    expect(assertCanWriteContact).toHaveBeenCalledWith(USER, "C");
    expect(updated()).toMatchObject({ deletedBy: "u1", deletedAt: expect.any(Date) });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "deleted", entityId: "C" }));
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("a denied caller writes nothing", async () => {
    (assertCanWriteContact as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
    expect(await code(svc.deleteContact(USER, "C"))).toBe("forbidden");
    nothingWritten();
  });

  it("refuses a contact that is already deleted", async () => {
    db.crm_Contacts.findUnique.mockResolvedValueOnce(null);
    expect(await code(svc.deleteContact(USER, "C"))).toBe("forbidden");
    nothingWritten();
  });
});

describe("restoreContact", () => {
  it("is admin only, writes an audit row and sends no event", async () => {
    expect(await code(svc.restoreContact(USER, "C"))).toBe("forbidden");
    expect(await code(svc.restoreContact({ id: "m1", role: "manager" }, "C"))).toBe("forbidden");
    expect(db.crm_Contacts.update).not.toHaveBeenCalled();
    await svc.restoreContact(ADMIN, "C");
    expect(updated()).toEqual({ deletedAt: null, deletedBy: null });
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "restored", userId: "a1" }));
    expect(inngest.send).not.toHaveBeenCalled();
  });
});
