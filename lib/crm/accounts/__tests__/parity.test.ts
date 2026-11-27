// The server action and the MCP tool are two doors to the same account service,
// so each operation must leave the same side effects: audit row and Inngest event.
// Prisma and Inngest are mocked; the authz checks, the diff and the service run
// for real.

jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn(async () => undefined) } }));
jest.mock("@/lib/audit-log", () => ({
  ...jest.requireActual("@/lib/audit-log"),
  writeAuditLog: jest.fn(async () => undefined),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn(), findFirst: jest.fn() },
    crm_Accounts: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
    crm_PriceLists: { findUnique: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { updateAccount } from "@/actions/crm/accounts/update-account";
import { deleteAccount } from "@/actions/crm/accounts/delete-account";
import { crmAccountTools } from "@/lib/mcp/tools/crm-accounts";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const OWNER = { id: "11111111-1111-4111-8111-111111111111", role: "user" as const };
const REP = "22222222-2222-4222-8222-222222222222";
const ACC = "33333333-3333-4333-8333-333333333333";
const STORED = {
  id: ACC, v: 0, name: "Acme", email: null, description: null, office_phone: null, website: null,
  assigned_to: OWNER.id, status: "Active", partnerUserId: null, pricelist_id: null, industry: null,
  case_study_candidate: false, case_study_approved: false, external_ref: null,
  createdBy: OWNER.id, updatedBy: OWNER.id, deletedAt: null as Date | null, deletedBy: null,
};

// Prisma ignores undefined keys; the mocks do too, so the diff sees what the database would.
const defined = (data: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

type Caller = { id: string; role: "user" | "manager" };

const mcp = (name: string, args: unknown, user: Caller = OWNER) => {
  const tool = crmAccountTools.find((t) => t.name === name)!;
  return (tool.handler as any)(tool.schema.parse(args), user.id, user);
};

// The server action resolves its caller from the session and the users table.
function signIn(user: Caller) {
  (getSession as jest.Mock).mockResolvedValue({ user: { id: user.id } });
  db.users.findUnique.mockResolvedValue({ id: user.id, role: user.role });
}

// A small evaluator for the Prisma `where` shapes the account write scope builds
// (equality, OR); list relations (watchers) are empty here.
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
  db.crm_Accounts.findFirst.mockImplementation(async ({ where }) => (matches(stored, where) ? { id: stored.id } : null));
  db.crm_Accounts.findUnique.mockImplementation(async ({ where }) => (matches(stored, where) ? stored : null));
  db.crm_Accounts.create.mockImplementation(async ({ data }) => ({ ...STORED, ...defined(data), id: ACC }));
  db.crm_Accounts.update.mockImplementation(async ({ data }) => ({ ...stored, ...defined(data) }));
});

async function both(viaAction: () => Promise<unknown>, viaMcp: () => Promise<unknown>) {
  const action = await viaAction();
  expect(action).not.toHaveProperty("error");
  const fromAction = sideEffects();
  const actionWrite = [...db.crm_Accounts.create.mock.calls, ...db.crm_Accounts.update.mock.calls];
  jest.clearAllMocks();
  await viaMcp();
  const mcpWrite = [...db.crm_Accounts.create.mock.calls, ...db.crm_Accounts.update.mock.calls];
  return { fromAction, fromMcp: sideEffects(), actionWrite, mcpWrite };
}

it("create: one audit row and crm/account.saved; assigned to the caller", async () => {
  const { fromAction, fromMcp, actionWrite, mcpWrite } = await both(
    () => createAccount({ name: "Acme" }),
    () => mcp("crm_create_account", { name: "Acme" }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction).toEqual({
    audit: [{ entityType: "account", entityId: ACC, action: "created", changes: null, userId: OWNER.id }],
    events: [{ name: "crm/account.saved", data: { record_id: ACC } }],
  });
  expect(mcpWrite[0][0].data).toEqual(actionWrite[0][0].data);
  expect(actionWrite[0][0].data).toMatchObject({ assigned_to: OWNER.id, createdBy: OWNER.id, status: "Active" });
});

it("update with reassignment: audit diff and crm/account.saved", async () => {
  const { fromAction, fromMcp } = await both(
    () => updateAccount({ id: ACC, name: "Acme", assigned_to: REP }),
    () => mcp("crm_update_account", { id: ACC, name: "Acme", assigned_to: REP }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction).toEqual({
    audit: [
      {
        entityType: "account", entityId: ACC, action: "updated", userId: OWNER.id,
        changes: [{ field: "assigned_to", old: OWNER.id, new: REP }],
      },
    ],
    events: [{ name: "crm/account.saved", data: { record_id: ACC } }],
  });
});

it("update without reassignment: audit diff and crm/account.saved", async () => {
  const { fromAction, fromMcp } = await both(
    () => updateAccount({ id: ACC, name: "Renamed", assigned_to: OWNER.id }),
    () => mcp("crm_update_account", { id: ACC, name: "Renamed" }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction.audit[0].changes).toEqual([{ field: "name", old: "Acme", new: "Renamed" }]);
  expect(fromAction.events).toEqual([{ name: "crm/account.saved", data: { record_id: ACC } }]);
});

it("delete: one audit row and crm/account.deleted", async () => {
  const { fromAction, fromMcp } = await both(
    () => deleteAccount(ACC),
    () => mcp("crm_delete_account", { id: ACC }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction).toEqual({
    audit: [{ entityType: "account", entityId: ACC, action: "deleted", changes: null, userId: OWNER.id }],
    events: [{ name: "crm/account.deleted", data: { record_id: ACC } }],
  });
});

it("a denied write leaves no side effects on either path", async () => {
  const STRANGER = { id: "44444444-4444-4444-8444-444444444444", role: "user" as const };
  signIn(STRANGER);
  await expect(updateAccount({ id: ACC, name: "X" })).resolves.toEqual({ error: "Forbidden" });
  await expect(mcp("crm_update_account", { id: ACC, name: "X" }, STRANGER)).rejects.toThrow("NOT_FOUND");
  await expect(deleteAccount(ACC)).resolves.toEqual({ error: "Forbidden" });
  await expect(mcp("crm_delete_account", { id: ACC }, STRANGER)).rejects.toThrow("NOT_FOUND");
  expect(db.crm_Accounts.update).not.toHaveBeenCalled();
  expect(sideEffects()).toEqual({ audit: [], events: [] });
});

it("an inactive new assignee is refused on both paths, with no side effects", async () => {
  db.users.findFirst.mockResolvedValue(null);
  await expect(updateAccount({ id: ACC, name: "Acme", assigned_to: REP })).resolves.toEqual({ error: "Forbidden" });
  await expect(mcp("crm_update_account", { id: ACC, assigned_to: REP })).rejects.toThrow("NOT_FOUND");
  expect(db.crm_Accounts.update).not.toHaveBeenCalled();
  expect(sideEffects()).toEqual({ audit: [], events: [] });
});

it("a soft-deleted account is neither edited nor deleted again, on either path", async () => {
  stored = { ...STORED, deletedAt: new Date("2026-01-01") };
  await expect(updateAccount({ id: ACC, name: "X" })).resolves.toEqual({ error: "Forbidden" });
  await expect(mcp("crm_update_account", { id: ACC, name: "X" })).rejects.toThrow("NOT_FOUND");
  await expect(deleteAccount(ACC)).resolves.toEqual({ error: "Forbidden" });
  await expect(mcp("crm_delete_account", { id: ACC })).rejects.toThrow("NOT_FOUND");
  expect(db.crm_Accounts.update).not.toHaveBeenCalled();
  expect(sideEffects()).toEqual({ audit: [], events: [] });
});

it("columns outside the account form are not written through either path", async () => {
  const crafted = { partnerUserId: REP, case_study_approved: true, createdBy: REP, deletedAt: null, watchers: {} };
  // The server action refuses them (its input is the form's fields, strict) ...
  await expect(updateAccount({ id: ACC, name: "Acme", ...crafted } as never)).resolves.toEqual({ error: "Invalid input" });
  await expect(createAccount({ name: "Acme", ...crafted } as never)).resolves.toEqual({ error: "Invalid input" });
  expect(db.crm_Accounts.update).not.toHaveBeenCalled();
  expect(db.crm_Accounts.create).not.toHaveBeenCalled();
  // ... the MCP tool's schema drops them, and the service copies only AccountInput keys.
  await mcp("crm_update_account", { id: ACC, name: "Acme", ...crafted });
  await mcp("crm_create_account", { name: "Acme", ...crafted });
  const writes = [...db.crm_Accounts.update.mock.calls, ...db.crm_Accounts.create.mock.calls].map(([q]) => q.data);
  expect(writes).toHaveLength(2);
  for (const data of writes) {
    expect(data.partnerUserId).toBeUndefined();
    expect(data).not.toHaveProperty("case_study_approved");
    expect(data).not.toHaveProperty("deletedAt");
    expect(data).not.toHaveProperty("watchers");
    expect(data.createdBy === undefined || data.createdBy === OWNER.id).toBe(true);
  }
});
