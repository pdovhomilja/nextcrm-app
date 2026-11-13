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

const mcp = (name: string, args: unknown) => {
  const tool = crmOpportunityTools.find((t) => t.name === name)!;
  return (tool.handler as any)(tool.schema.parse(args), OWNER.id, OWNER);
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
  (getSession as jest.Mock).mockResolvedValue({ user: { id: OWNER.id } });
  db.users.findUnique.mockResolvedValue({ id: OWNER.id, role: "user" });
  db.users.findFirst.mockResolvedValue({ id: REP, email: "rep@example.com", userLanguage: "en" });
  db.crm_Opportunities.findFirst.mockResolvedValue({ id: OPP });
  db.crm_Opportunities.findUnique.mockResolvedValue(STORED);
  db.crm_Opportunities.create.mockImplementation(async ({ data }) => ({ ...STORED, ...defined(data), id: OPP }));
  db.crm_Opportunities.update.mockImplementation(async ({ data }) => ({ ...STORED, ...defined(data) }));
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
