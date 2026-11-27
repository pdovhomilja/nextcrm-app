// The server action and the MCP tool are two doors to the same contact service,
// so each operation must leave the same side effects: audit row and Inngest event.
// Prisma, Inngest and the mailer are mocked; the authz checks, the diff and the
// service run for real.

jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn(async () => undefined) } }));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock("@/lib/audit-log", () => ({
  ...jest.requireActual("@/lib/audit-log"),
  writeAuditLog: jest.fn(async () => undefined),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn(), findFirst: jest.fn() },
    crm_Contacts: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { createContact } from "@/actions/crm/contacts/create-contact";
import { updateContact } from "@/actions/crm/contacts/update-contact";
import { deleteContact } from "@/actions/crm/contacts/delete-contact";
import { crmContactTools } from "@/lib/mcp/tools/crm-contacts";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const OWNER = { id: "11111111-1111-4111-8111-111111111111", role: "user" as const };
const REP = "22222222-2222-4222-8222-222222222222";
const CON = "33333333-3333-4333-8333-333333333333";
const ACC = "55555555-5555-4555-8555-555555555555";
const FOREIGN_ACC = "66666666-6666-4666-8666-666666666666";
const STORED = {
  id: CON, v: 0, first_name: "Jan", last_name: "Novak", email: null, office_phone: null, mobile_phone: null,
  position: null, assigned_to: OWNER.id, accountsIDs: null as string | null, birthday: null, contact_type_id: null,
  createdBy: OWNER.id, updatedBy: OWNER.id, deletedAt: null as Date | null, deletedBy: null, tags: [], notes: [],
};
const ACCOUNTS: Record<string, Record<string, unknown>> = {
  [ACC]: { id: ACC, assigned_to: OWNER.id, createdBy: OWNER.id, deletedAt: null },
  [FOREIGN_ACC]: { id: FOREIGN_ACC, assigned_to: REP, createdBy: REP, deletedAt: null },
};

// Prisma ignores undefined keys; the mocks do too, so the diff sees what the database would.
const defined = (data: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

type Caller = { id: string; role: "user" | "manager" };

const mcp = (name: string, args: unknown, user: Caller = OWNER) => {
  const tool = crmContactTools.find((t) => t.name === name)!;
  return (tool.handler as any)(tool.schema.parse(args), user.id, user);
};

// The server action resolves its caller from the session and the users table.
function signIn(user: Caller) {
  (getSession as jest.Mock).mockResolvedValue({ user: { id: user.id } });
  db.users.findUnique.mockResolvedValue({ id: user.id, role: user.role });
}

// A small evaluator for the Prisma `where` shapes the write scopes build
// (equality, OR); list relations (account watchers) are empty here.
type Row = Record<string, unknown>;
let stored: Row = {};
function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (k === "OR") return (v as Row[]).some((c) => matches(row, c));
    if (v && typeof v === "object" && "some" in (v as Row)) return false;
    return (row[k] ?? null) === v;
  });
}

function sideEffects() {
  return {
    audit: (writeAuditLog as jest.Mock).mock.calls.map(([p]) => p),
    events: (inngest.send as jest.Mock).mock.calls.map(([e]) => e),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  signIn(OWNER);
  stored = { ...STORED };
  db.users.findFirst.mockResolvedValue({ id: REP });
  db.crm_Contacts.findFirst.mockImplementation(async ({ where }) => (matches(stored, where) ? { id: stored.id } : null));
  db.crm_Contacts.findUnique.mockImplementation(async ({ where }) => (matches(stored, where) ? stored : null));
  db.crm_Contacts.create.mockImplementation(async ({ data }) => ({ ...STORED, ...defined(data), id: CON }));
  db.crm_Contacts.update.mockImplementation(async ({ data }) => ({ ...stored, ...defined(data) }));
  db.crm_Accounts.findFirst.mockImplementation(async ({ where }) => {
    const row = ACCOUNTS[where.id as string];
    return row && matches(row, where) ? { id: row.id } : null;
  });
});

async function both(viaAction: () => Promise<unknown>, viaMcp: () => Promise<unknown>) {
  const action = await viaAction();
  expect(action).not.toHaveProperty("error");
  const fromAction = sideEffects();
  const actionWrite = [...db.crm_Contacts.create.mock.calls, ...db.crm_Contacts.update.mock.calls];
  jest.clearAllMocks();
  await viaMcp();
  const mcpWrite = [...db.crm_Contacts.create.mock.calls, ...db.crm_Contacts.update.mock.calls];
  return { fromAction, fromMcp: sideEffects(), actionWrite, mcpWrite };
}

it("create: one audit row and crm/contact.saved; assigned to the caller", async () => {
  const { fromAction, fromMcp, actionWrite, mcpWrite } = await both(
    () => createContact({ last_name: "Novak", first_name: "Jan" }),
    () => mcp("crm_create_contact", { last_name: "Novak", first_name: "Jan" }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction).toEqual({
    audit: [{ entityType: "contact", entityId: CON, action: "created", changes: null, userId: OWNER.id }],
    events: [{ name: "crm/contact.saved", data: { record_id: CON } }],
  });
  for (const write of [actionWrite, mcpWrite])
    expect(write[0][0].data).toMatchObject({ last_name: "Novak", first_name: "Jan", assigned_to: OWNER.id, createdBy: OWNER.id, v: 0 });
});

it("create linked to an account: both paths check the account and write the link", async () => {
  const { fromAction, fromMcp, actionWrite, mcpWrite } = await both(
    () => createContact({ last_name: "Novak", assigned_account: ACC }),
    () => mcp("crm_create_contact", { last_name: "Novak", account: ACC }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(actionWrite[0][0].data.accountsIDs).toBe(ACC);
  expect(mcpWrite[0][0].data.accountsIDs).toBe(ACC);
});

it("update with reassignment: audit diff and crm/contact.saved", async () => {
  const { fromAction, fromMcp } = await both(
    () => updateContact({ id: CON, assigned_to: REP }),
    () => mcp("crm_update_contact", { id: CON, assigned_to: REP }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction).toEqual({
    audit: [
      {
        entityType: "contact", entityId: CON, action: "updated", userId: OWNER.id,
        changes: [{ field: "assigned_to", old: OWNER.id, new: REP }],
      },
    ],
    events: [{ name: "crm/contact.saved", data: { record_id: CON } }],
  });
});

it("update without reassignment: audit diff and crm/contact.saved", async () => {
  const { fromAction, fromMcp } = await both(
    () => updateContact({ id: CON, last_name: "Svoboda", assigned_to: OWNER.id }),
    () => mcp("crm_update_contact", { id: CON, last_name: "Svoboda" }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction.audit[0].changes).toEqual([{ field: "last_name", old: "Novak", new: "Svoboda" }]);
  expect(fromAction.events).toEqual([{ name: "crm/contact.saved", data: { record_id: CON } }]);
});

it("delete: one audit row and no event, on both paths", async () => {
  const { fromAction, fromMcp } = await both(
    () => deleteContact(CON),
    () => mcp("crm_delete_contact", { id: CON }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction).toEqual({
    audit: [{ entityType: "contact", entityId: CON, action: "deleted", changes: null, userId: OWNER.id }],
    events: [],
  });
});

it("a denied write leaves no side effects on either path", async () => {
  const STRANGER = { id: "44444444-4444-4444-8444-444444444444", role: "user" as const };
  signIn(STRANGER);
  await expect(updateContact({ id: CON, last_name: "X" })).resolves.toEqual({ error: "Forbidden" });
  await expect(mcp("crm_update_contact", { id: CON, last_name: "X" }, STRANGER)).rejects.toThrow("NOT_FOUND");
  await expect(deleteContact(CON)).resolves.toEqual({ error: "Forbidden" });
  await expect(mcp("crm_delete_contact", { id: CON }, STRANGER)).rejects.toThrow("NOT_FOUND");
  expect(db.crm_Contacts.update).not.toHaveBeenCalled();
  expect(sideEffects()).toEqual({ audit: [], events: [] });
});

it("linking another user's account is refused on both paths, with no side effects", async () => {
  await expect(updateContact({ id: CON, assigned_account: FOREIGN_ACC })).resolves.toEqual({ error: "Forbidden" });
  await expect(mcp("crm_update_contact", { id: CON, account: FOREIGN_ACC })).rejects.toThrow("NOT_FOUND");
  await expect(createContact({ last_name: "X", assigned_account: FOREIGN_ACC })).resolves.toEqual({ error: "Forbidden" });
  await expect(mcp("crm_create_contact", { last_name: "X", account: FOREIGN_ACC })).rejects.toThrow("NOT_FOUND");
  expect(db.crm_Contacts.update).not.toHaveBeenCalled();
  expect(db.crm_Contacts.create).not.toHaveBeenCalled();
  expect(sideEffects()).toEqual({ audit: [], events: [] });
});

it("an inactive new assignee is refused on both paths, with no side effects", async () => {
  db.users.findFirst.mockResolvedValue(null);
  await expect(updateContact({ id: CON, assigned_to: REP })).resolves.toEqual({ error: "Forbidden" });
  await expect(mcp("crm_update_contact", { id: CON, assigned_to: REP })).rejects.toThrow("NOT_FOUND");
  expect(db.crm_Contacts.update).not.toHaveBeenCalled();
  expect(sideEffects()).toEqual({ audit: [], events: [] });
});

it("a soft-deleted contact is neither edited nor deleted again, on either path", async () => {
  stored = { ...STORED, deletedAt: new Date("2026-01-01") };
  await expect(updateContact({ id: CON, last_name: "X" })).resolves.toEqual({ error: "Forbidden" });
  await expect(mcp("crm_update_contact", { id: CON, last_name: "X" })).rejects.toThrow("NOT_FOUND");
  await expect(deleteContact(CON)).resolves.toEqual({ error: "Forbidden" });
  await expect(mcp("crm_delete_contact", { id: CON })).rejects.toThrow("NOT_FOUND");
  expect(db.crm_Contacts.update).not.toHaveBeenCalled();
  expect(sideEffects()).toEqual({ audit: [], events: [] });
});
