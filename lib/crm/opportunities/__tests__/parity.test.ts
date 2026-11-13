// The server action and the MCP tool are two doors to the same opportunity
// service, so each operation must leave the same side effects: audit row, Inngest
// event and assignee email. Prisma, the mailer, Inngest and the exchange rate are
// mocked; the authz checks, the approval gate, the diff and the service run for real.

jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn(async () => undefined) } }));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock("@/lib/currency", () => ({
  getDefaultCurrency: jest.fn(async () => "USD"),
  getSnapshotRate: jest.fn(async () => null),
}));
jest.mock("@/lib/audit-log", () => ({
  ...jest.requireActual("@/lib/audit-log"),
  writeAuditLog: jest.fn(async () => undefined),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn(), findFirst: jest.fn() },
    crm_Opportunities: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
    crm_Accounts: { findFirst: jest.fn() },
    crm_Opportunities_Sales_Stages: { findUnique: jest.fn() },
    crm_Opportunities_Type: { findUnique: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import sendEmail from "@/lib/sendmail";
import { writeAuditLog } from "@/lib/audit-log";
import { createOpportunity } from "@/actions/crm/opportunities/create-opportunity";
import { updateOpportunity } from "@/actions/crm/opportunities/update-opportunity";
import { deleteOpportunity } from "@/actions/crm/opportunities/delete-opportunity";
import { crmOpportunityTools } from "@/lib/mcp/tools/crm-opportunities";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const OWNER = { id: "11111111-1111-4111-8111-111111111111", role: "user" as const };
const REP = "22222222-2222-4222-8222-222222222222";
const OPP = "33333333-3333-4333-8333-333333333333";
const QUALIFIED = "44444444-4444-4444-8444-444444444444";
const STORED = {
  id: OPP, v: 0, name: "Deal", description: null, account: null, contact: null, campaign: null,
  assigned_to: OWNER.id, budget: 0, expected_revenue: 0, currency: null, snapshot_rate: null,
  close_date: null, delivery_deadline: null, next_step: null, sales_stage: null, type: null,
  status: "ACTIVE", approval_status: "NONE", createdBy: OWNER.id, updatedBy: OWNER.id,
  last_activity_by: OWNER.id, deletedAt: null, deletedBy: null,
};

// Prisma ignores undefined keys; the mocks do too, so the diff sees what the database would.
const defined = (data: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

type Caller = { id: string; role: "user" | "partner" };

const mcp = (name: string, args: unknown, user: Caller = OWNER) => {
  const tool = crmOpportunityTools.find((t) => t.name === name)!;
  return (tool.handler as any)(tool.schema.parse(args), user.id, user);
};

// The server action resolves its caller from the session and the users table.
function signIn(user: Caller) {
  (getSession as jest.Mock).mockResolvedValue({ user: { id: user.id } });
  db.users.findUnique.mockResolvedValue({ id: user.id, role: user.role });
}

// A small evaluator for the Prisma `where` shapes the authz scopes build (equality,
// OR, NOT, the assigned_account relation, `some` on a list relation), so the real
// scope checks decide who may write. List relations (watchers, partner_own_users)
// are empty here.
type Row = Record<string, unknown>;
let accounts: Record<string, Row> = {};
let stored: Row = {};
function matches(row: Row | undefined, where: Row): boolean {
  if (!row) return false;
  return Object.entries(where).every(([k, v]) => {
    if (k === "OR") return (v as Row[]).some((c) => matches(row, c));
    if (k === "NOT") return !matches(row, v as Row);
    if (k === "assigned_account") return matches(accounts[row.account as string], v as Row);
    if (v && typeof v === "object" && "some" in (v as Row)) return false;
    return (row[k] ?? null) === v;
  });
}
const findIn = (rows: Row[]) => async ({ where }: { where: Row }) => {
  const row = rows.find((r) => matches(r, where));
  return row ? { id: row.id } : null;
};

function sideEffects() {
  return {
    audit: (writeAuditLog as jest.Mock).mock.calls.map(([p]) => p),
    events: (inngest.send as jest.Mock).mock.calls.map(([e]) => e),
    emails: (sendEmail as jest.Mock).mock.calls.map(([m]) => m),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  signIn(OWNER);
  db.users.findFirst.mockResolvedValue({ id: REP, email: "rep@example.com", userLanguage: "en" });
  stored = { ...STORED };
  accounts = {};
  db.crm_Opportunities.findFirst.mockImplementation(async (q) => findIn([stored])(q));
  db.crm_Accounts.findFirst.mockImplementation(async (q) => findIn(Object.values(accounts))(q));
  db.crm_Opportunities.findUnique.mockImplementation(async () => stored);
  db.crm_Opportunities.create.mockImplementation(async ({ data }) => ({ ...STORED, ...defined(data), id: OPP }));
  db.crm_Opportunities.update.mockImplementation(async ({ data }) => ({ ...stored, ...defined(data) }));
  db.crm_Opportunities_Sales_Stages.findUnique.mockResolvedValue({ id: QUALIFIED, stage_kind: "qualified" });
});

async function both(viaAction: () => Promise<unknown>, viaMcp: () => Promise<unknown>) {
  const action = await viaAction();
  expect(action).not.toHaveProperty("error");
  const fromAction = sideEffects();
  jest.clearAllMocks();
  await viaMcp();
  return { fromAction, fromMcp: sideEffects() };
}

it("create: one audit row, crm/opportunity.saved, no email (assigned to the caller)", async () => {
  const { fromAction, fromMcp } = await both(
    () => createOpportunity({ name: "Deal" }),
    () => mcp("crm_create_opportunity", { name: "Deal" }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction).toEqual({
    audit: [{ entityType: "opportunity", entityId: OPP, action: "created", changes: null, userId: OWNER.id }],
    events: [{ name: "crm/opportunity.saved", data: { record_id: OPP } }],
    emails: [],
  });
});

it("update with reassignment: audit diff, crm/opportunity.saved, email to the new assignee", async () => {
  const { fromAction, fromMcp } = await both(
    () => updateOpportunity({ id: OPP, name: "Deal", assigned_to: REP }),
    () => mcp("crm_update_opportunity", { id: OPP, assigned_to: REP }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction.audit).toEqual([
    {
      entityType: "opportunity", entityId: OPP, action: "updated", userId: OWNER.id,
      changes: [{ field: "assigned_to", old: OWNER.id, new: REP }],
    },
  ]);
  expect(fromAction.events).toEqual([{ name: "crm/opportunity.saved", data: { record_id: OPP } }]);
  expect(fromAction.emails).toEqual([
    expect.objectContaining({ to: "rep@example.com", subject: expect.stringContaining("Deal") }),
  ]);
});

it("update without reassignment: audit diff and crm/opportunity.saved, no email", async () => {
  const { fromAction, fromMcp } = await both(
    () => updateOpportunity({ id: OPP, name: "Renamed", assigned_to: OWNER.id }),
    () => mcp("crm_update_opportunity", { id: OPP, name: "Renamed" }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction.audit[0].changes).toEqual([{ field: "name", old: "Deal", new: "Renamed" }]);
  expect(fromAction.events).toHaveLength(1);
  expect(fromAction.emails).toEqual([]);
});

it("delete: one audit row, no event, no email", async () => {
  const { fromAction, fromMcp } = await both(
    () => deleteOpportunity(OPP),
    () => mcp("crm_delete_opportunity", { id: OPP }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction).toEqual({
    audit: [{ entityType: "opportunity", entityId: OPP, action: "deleted", changes: null, userId: OWNER.id }],
    events: [],
    emails: [],
  });
});

it("a denied write leaves no side effects on either path", async () => {
  db.crm_Opportunities.findFirst.mockResolvedValue(null);
  await expect(updateOpportunity({ id: OPP, name: "X", assigned_to: REP })).resolves.toEqual({ error: "Forbidden" });
  await expect(mcp("crm_update_opportunity", { id: OPP, assigned_to: REP })).rejects.toThrow("NOT_FOUND");
  expect(db.crm_Opportunities.update).not.toHaveBeenCalled();
  expect(sideEffects()).toEqual({ audit: [], events: [], emails: [] });
});

it("the approval gate refuses a qualified stage on both paths, with no side effects", async () => {
  const action = await updateOpportunity({ id: OPP, name: "Deal", sales_stage: QUALIFIED });
  expect(action.error).toContain("Quote approval is required");
  await expect(mcp("crm_update_opportunity", { id: OPP, sales_stage_id: QUALIFIED })).rejects.toThrow(
    "CONFLICT: Quote approval is required",
  );
  expect(db.crm_Opportunities.update).not.toHaveBeenCalled();
  expect(sideEffects()).toEqual({ audit: [], events: [], emails: [] });
});

describe("a closed deal", () => {
  const PRESALE = "55555555-5555-4555-8555-555555555555";
  beforeEach(() => {
    stored = { ...STORED, status: "CLOSED" };
    db.crm_Opportunities_Sales_Stages.findUnique.mockImplementation(async ({ where }) =>
      where.id === QUALIFIED ? { id: QUALIFIED, stage_kind: "qualified" } : { id: where.id, stage_kind: "pre_sale" },
    );
  });

  it("a stage move reopens it on both paths, with the same audit diff and events", async () => {
    const { fromAction, fromMcp } = await both(
      () => updateOpportunity({ id: OPP, name: "Deal", sales_stage: PRESALE }),
      () => mcp("crm_update_opportunity", { id: OPP, sales_stage_id: PRESALE }),
    );
    expect(fromMcp).toEqual(fromAction);
    expect(fromAction.audit[0].changes).toEqual(
      expect.arrayContaining([
        { field: "sales_stage", old: null, new: PRESALE },
        { field: "status", old: "CLOSED", new: "ACTIVE" },
      ]),
    );
    expect(fromAction.events).toEqual([
      { name: "crm/opportunity.stage-changed", data: { record_id: OPP, to_stage: PRESALE } },
      { name: "crm/opportunity.saved", data: { record_id: OPP } },
    ]);
  });

  it("the approval gate still refuses a qualified stage on both paths", async () => {
    const action = await updateOpportunity({ id: OPP, name: "Deal", sales_stage: QUALIFIED });
    expect(action.error).toContain("Quote approval is required");
    await expect(mcp("crm_update_opportunity", { id: OPP, sales_stage_id: QUALIFIED })).rejects.toThrow("CONFLICT");
    expect(db.crm_Opportunities.update).not.toHaveBeenCalled();
    expect(sideEffects()).toEqual({ audit: [], events: [], emails: [] });
  });

  // The one intended difference: the web form sends ACTIVE on every save (as it did
  // before the service); MCP reopens a deal only on a stage move.
  it("an edit without a stage move: the form reopens it, MCP leaves it closed; nothing else differs", async () => {
    const { fromAction, fromMcp } = await both(
      () => updateOpportunity({ id: OPP, name: "Renamed" }),
      () => mcp("crm_update_opportunity", { id: OPP, name: "Renamed" }),
    );
    const withoutStatus = (changes: { field: string }[]) => changes.filter((c) => c.field !== "status");
    expect(fromAction.audit[0].changes).toContainEqual({ field: "status", old: "CLOSED", new: "ACTIVE" });
    expect(fromMcp.audit[0].changes).toEqual([{ field: "name", old: "Deal", new: "Renamed" }]);
    expect(withoutStatus(fromAction.audit[0].changes)).toEqual(fromMcp.audit[0].changes);
    expect(fromMcp.events).toEqual(fromAction.events);
    expect(fromMcp.emails).toEqual(fromAction.emails);
  });
});

describe("a partner on their partner account's deal", () => {
  const PARTNER = { id: "66666666-6666-4666-8666-666666666666", role: "partner" as const };
  const OWN_ACCOUNT = "77777777-7777-4777-8777-777777777777";
  const OTHER = "88888888-8888-4888-8888-888888888888";
  beforeEach(() => {
    accounts = {
      [OWN_ACCOUNT]: { id: OWN_ACCOUNT, partnerUserId: PARTNER.id, deletedAt: null },
      [OTHER]: { id: OTHER, partnerUserId: null, assigned_to: OWNER.id, deletedAt: null },
    };
    stored = { ...STORED, account: OWN_ACCOUNT };
    signIn(PARTNER);
  });

  it("edits it on both paths; neither path reassigns the deal or unlinks the account", async () => {
    const { fromAction, fromMcp } = await both(
      () => updateOpportunity({ id: OPP, name: "Renamed", assigned_to: REP, account: "" }),
      () => mcp("crm_update_opportunity", { id: OPP, name: "Renamed", assigned_to: REP, account: null }, PARTNER),
    );
    expect(fromMcp).toEqual(fromAction);
    expect(fromAction).toEqual({
      audit: [
        {
          entityType: "opportunity", entityId: OPP, action: "updated", userId: PARTNER.id,
          changes: [{ field: "name", old: "Deal", new: "Renamed" }],
        },
      ],
      events: [{ name: "crm/opportunity.saved", data: { record_id: OPP } }],
      emails: [],
    });
  });

  it("cannot move it to an account that is not theirs, on either path", async () => {
    await expect(updateOpportunity({ id: OPP, name: "Deal", account: OTHER })).resolves.toEqual({ error: "Forbidden" });
    await expect(mcp("crm_update_opportunity", { id: OPP, account: OTHER }, PARTNER)).rejects.toThrow("NOT_FOUND");
    expect(db.crm_Opportunities.update).not.toHaveBeenCalled();
    expect(sideEffects()).toEqual({ audit: [], events: [], emails: [] });
  });

  it("cannot edit a deal on someone else's account, on either path", async () => {
    stored = { ...STORED, account: OTHER };
    await expect(updateOpportunity({ id: OPP, name: "X" })).resolves.toEqual({ error: "Forbidden" });
    await expect(mcp("crm_update_opportunity", { id: OPP, name: "X" }, PARTNER)).rejects.toThrow("NOT_FOUND");
    expect(db.crm_Opportunities.update).not.toHaveBeenCalled();
    expect(sideEffects()).toEqual({ audit: [], events: [], emails: [] });
  });

  it("cannot delete it, on either path", async () => {
    // The delete action does not admit a partner session at all; the service refuses him too.
    await expect(deleteOpportunity(OPP)).resolves.toEqual({ error: "Unauthorized" });
    await expect(mcp("crm_delete_opportunity", { id: OPP }, PARTNER)).rejects.toThrow("NOT_FOUND");
    expect(db.crm_Opportunities.update).not.toHaveBeenCalled();
    expect(sideEffects()).toEqual({ audit: [], events: [], emails: [] });
  });
});

describe("a user linked to the deal as its assignee, not its creator", () => {
  const LINKED = { id: "99999999-9999-4999-8999-999999999999", role: "user" as const };
  const STRANGER = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", role: "user" as const };
  beforeEach(() => {
    stored = { ...STORED, assigned_to: LINKED.id, createdBy: OWNER.id };
  });

  it("edits it and hands it on, with the same audit, event and email on both paths", async () => {
    signIn(LINKED);
    const { fromAction, fromMcp } = await both(
      () => updateOpportunity({ id: OPP, name: "Deal", assigned_to: REP }),
      () => mcp("crm_update_opportunity", { id: OPP, assigned_to: REP }, LINKED),
    );
    expect(fromMcp).toEqual(fromAction);
    expect(fromAction.audit).toEqual([
      {
        entityType: "opportunity", entityId: OPP, action: "updated", userId: LINKED.id,
        changes: [{ field: "assigned_to", old: LINKED.id, new: REP }],
      },
    ]);
    expect(fromAction.emails).toEqual([expect.objectContaining({ to: "rep@example.com" })]);
  });

  it("a user with no link to it is refused on both paths", async () => {
    signIn(STRANGER);
    await expect(updateOpportunity({ id: OPP, name: "X" })).resolves.toEqual({ error: "Forbidden" });
    await expect(mcp("crm_update_opportunity", { id: OPP, name: "X" }, STRANGER)).rejects.toThrow("NOT_FOUND");
    expect(db.crm_Opportunities.update).not.toHaveBeenCalled();
    expect(sideEffects()).toEqual({ audit: [], events: [], emails: [] });
  });
});
