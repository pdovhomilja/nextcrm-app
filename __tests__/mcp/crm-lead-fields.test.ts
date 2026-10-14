// crm_create_lead / crm_update_lead carry the same detail fields as the web form
// (description, campaign, referral, status/source/type); crm_list_lead_options
// exposes the lookup ids those fields need.

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Leads: { create: jest.fn(), update: jest.fn() },
    crm_Lead_Statuses: { findMany: jest.fn(), findUnique: jest.fn() },
    crm_Lead_Sources: { findMany: jest.fn(), findUnique: jest.fn() },
    crm_Lead_Types: { findMany: jest.fn(), findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/authz/scopes/crm", () => ({
  leadReadScopeWhere: jest.fn(),
  assertCanWriteLead: jest.fn(),
}));

import { prismadb } from "@/lib/prisma";
import { crmLeadTools } from "@/lib/mcp/tools/crm-leads";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const USER = { id: "u1", role: "user" as const };
const run = (name: string, args: unknown) =>
  (crmLeadTools.find((t) => t.name === name)!.handler as any)(args, USER.id, USER);
const STATUS = "11111111-1111-4111-8111-111111111111";
const SOURCE = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  jest.clearAllMocks();
  db.crm_Leads.create.mockImplementation(({ data }) => ({ id: "L", ...data }));
  db.crm_Leads.update.mockImplementation(({ data }) => ({ id: "L", ...data }));
});

it("lists lead statuses, sources and types", async () => {
  db.crm_Lead_Statuses.findMany.mockResolvedValue([{ id: STATUS, name: "New" }]);
  db.crm_Lead_Sources.findMany.mockResolvedValue([{ id: SOURCE, name: "Web" }]);
  db.crm_Lead_Types.findMany.mockResolvedValue([]);
  await expect(run("crm_list_lead_options", {})).resolves.toEqual({
    data: { statuses: [{ id: STATUS, name: "New" }], sources: [{ id: SOURCE, name: "Web" }], types: [] },
  });
});

it("creates a lead with detail fields", async () => {
  db.crm_Lead_Statuses.findUnique.mockResolvedValue({ id: STATUS });
  db.crm_Lead_Sources.findUnique.mockResolvedValue({ id: SOURCE });
  const schema = crmLeadTools.find((t) => t.name === "crm_create_lead")!.schema;
  const args = schema.parse({
    lastName: "Novák",
    description: "Priorita A",
    campaign: "Q4",
    refered_by: "Jana",
    lead_status_id: STATUS,
    lead_source_id: SOURCE,
  });
  await run("crm_create_lead", args);
  expect(db.crm_Leads.create.mock.calls[0][0].data).toMatchObject({
    lastName: "Novák",
    description: "Priorita A",
    campaign: "Q4",
    refered_by: "Jana",
    lead_status_id: STATUS,
    lead_source_id: SOURCE,
    assigned_to: "u1",
  });
});

it("rejects an unknown status id as NOT_FOUND", async () => {
  db.crm_Lead_Statuses.findUnique.mockResolvedValue(null);
  await expect(run("crm_create_lead", { lastName: "X", lead_status_id: STATUS })).rejects.toThrow("NOT_FOUND");
  expect(db.crm_Leads.create).not.toHaveBeenCalled();
});

it("updates detail fields and clears the status with null", async () => {
  await run("crm_update_lead", { id: "L", campaign: "Q1", lead_status_id: null });
  expect(db.crm_Lead_Statuses.findUnique).not.toHaveBeenCalled();
  expect(db.crm_Leads.update.mock.calls[0][0].data).toMatchObject({ campaign: "Q1", lead_status_id: null, updatedBy: "u1" });
});
