// The server action and the MCP tool are two doors to the same lead service, so
// each operation must leave the same side effects: audit row, Inngest event and
// assignee email. Prisma, the mailer and Inngest are mocked; the authz checks,
// the diff and the service run for real.

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
    crm_Leads: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
    crm_Lead_Statuses: { findUnique: jest.fn() },
    crm_Lead_Sources: { findUnique: jest.fn() },
    crm_Lead_Types: { findUnique: jest.fn() },
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import sendEmail from "@/lib/sendmail";
import { writeAuditLog } from "@/lib/audit-log";
import { createLead } from "@/actions/crm/leads/create-lead";
import { updateLead } from "@/actions/crm/leads/update-lead";
import { deleteLead } from "@/actions/crm/leads/delete-lead";
import { crmLeadTools } from "@/lib/mcp/tools/crm-leads";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const OWNER = { id: "11111111-1111-4111-8111-111111111111", role: "user" as const };
const REP = "22222222-2222-4222-8222-222222222222";
const LEAD = "33333333-3333-4333-8333-333333333333";
const STORED = {
  id: LEAD, v: 1, firstName: "Jan", lastName: "Novák", company: "Acme", jobTitle: null, email: null,
  phone: null, description: null, lead_source_id: null, lead_status_id: null, lead_type_id: null,
  refered_by: null, campaign: null, assigned_to: OWNER.id, accountsIDs: null, createdBy: OWNER.id,
  updatedBy: OWNER.id, deletedAt: null, deletedBy: null,
};

// Prisma ignores undefined keys; the mocks do too, so the diff sees what the database would.
const defined = (data: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

const mcp = (name: string, args: unknown) => {
  const tool = crmLeadTools.find((t) => t.name === name)!;
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
  db.crm_Leads.findFirst.mockResolvedValue({ id: LEAD });
  db.crm_Leads.findUnique.mockResolvedValue(STORED);
  db.crm_Leads.create.mockImplementation(async ({ data }) => ({ ...STORED, ...defined(data), id: LEAD }));
  db.crm_Leads.update.mockImplementation(async ({ data }) => ({ ...STORED, ...defined(data) }));
});

async function both(viaAction: () => Promise<unknown>, viaMcp: () => Promise<unknown>) {
  const action = await viaAction();
  expect(action).not.toHaveProperty("error");
  const fromAction = sideEffects();
  jest.clearAllMocks();
  await viaMcp();
  return { fromAction, fromMcp: sideEffects() };
}

it("create: one audit row, crm/lead.saved, no email (assigned to the caller)", async () => {
  const { fromAction, fromMcp } = await both(
    () => createLead({ first_name: "Jan", last_name: "Novák", company: "Acme" }),
    () => mcp("crm_create_lead", { firstName: "Jan", lastName: "Novák", company: "Acme" }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction).toEqual({
    audit: [{ entityType: "lead", entityId: LEAD, action: "created", changes: null, userId: OWNER.id }],
    events: [{ name: "crm/lead.saved", data: { record_id: LEAD } }],
    emails: [],
  });
});

it("update with reassignment: audit diff, crm/lead.saved, email to the new assignee", async () => {
  const { fromAction, fromMcp } = await both(
    () => updateLead({ id: LEAD, firstName: "Jan", lastName: "Novák", company: "Acme", assigned_to: REP }),
    () => mcp("crm_update_lead", { id: LEAD, assigned_to: REP }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction.audit).toEqual([
    {
      entityType: "lead", entityId: LEAD, action: "updated", userId: OWNER.id,
      changes: [{ field: "assigned_to", old: OWNER.id, new: REP }],
    },
  ]);
  expect(fromAction.events).toEqual([{ name: "crm/lead.saved", data: { record_id: LEAD } }]);
  expect(fromAction.emails).toEqual([
    expect.objectContaining({ to: "rep@example.com", subject: expect.stringContaining("Jan Novák") }),
  ]);
});

it("update without reassignment: audit diff and crm/lead.saved, no email", async () => {
  const { fromAction, fromMcp } = await both(
    () => updateLead({ id: LEAD, firstName: "Jan", lastName: "Novák", company: "Initech", assigned_to: OWNER.id }),
    () => mcp("crm_update_lead", { id: LEAD, company: "Initech" }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction.audit[0].changes).toEqual([{ field: "company", old: "Acme", new: "Initech" }]);
  expect(fromAction.events).toHaveLength(1);
  expect(fromAction.emails).toEqual([]);
});

it("delete: one audit row, no event, no email", async () => {
  const { fromAction, fromMcp } = await both(
    () => deleteLead(LEAD),
    () => mcp("crm_delete_lead", { id: LEAD }),
  );
  expect(fromMcp).toEqual(fromAction);
  expect(fromAction).toEqual({
    audit: [{ entityType: "lead", entityId: LEAD, action: "deleted", changes: null, userId: OWNER.id }],
    events: [],
    emails: [],
  });
});

it("a denied write leaves no side effects on either path", async () => {
  db.crm_Leads.findFirst.mockResolvedValue(null);
  await expect(updateLead({ id: LEAD, lastName: "X", assigned_to: REP })).resolves.toEqual({ error: "Forbidden" });
  await expect(mcp("crm_update_lead", { id: LEAD, assigned_to: REP })).rejects.toThrow("NOT_FOUND");
  expect(db.crm_Leads.update).not.toHaveBeenCalled();
  expect(sideEffects()).toEqual({ audit: [], events: [], emails: [] });
});
