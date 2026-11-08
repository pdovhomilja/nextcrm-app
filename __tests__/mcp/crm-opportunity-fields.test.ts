// crm_create_opportunity / crm_update_opportunity carry the sales stage and type
// like the web form, and react to a stage move the way the web actions do;
// crm_list_opportunity_options exposes the lookup ids those fields need.

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    crm_Opportunities_Sales_Stages: { findMany: jest.fn(), findUnique: jest.fn() },
    crm_Opportunities_Type: { findMany: jest.fn(), findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/authz/scopes/crm", () => ({
  opportunityReadScopeWhere: jest.fn(),
  assertCanWriteOpportunity: jest.fn(),
  assertCanWriteAccount: jest.fn(),
  assertCanWriteContact: jest.fn(),
}));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/audit-log", () => ({
  ...jest.requireActual("@/lib/audit-log"),
  writeAuditLog: jest.fn(),
}));

import { prismadb } from "@/lib/prisma";
import { assertCanWriteOpportunity } from "@/lib/authz/scopes/crm";
import { AuthorizationError } from "@/lib/authz/errors";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";
import { crmOpportunityTools } from "@/lib/mcp/tools/crm-opportunities";

const db = prismadb as unknown as Record<string, Record<string, jest.Mock>>;
const USER = { id: "u1", role: "user" as const };
const run = (name: string, args: unknown) =>
  (crmOpportunityTools.find((t) => t.name === name)!.handler as any)(args, USER.id, USER);
const STAGE = "11111111-1111-4111-8111-111111111111";
const TYPE = "22222222-2222-4222-8222-222222222222";
const OTHER_STAGE = "33333333-3333-4333-8333-333333333333";
const sentEvents = () => (inngest.send as jest.Mock).mock.calls.map(([e]) => e);
const STAGE_CHANGED = { name: "crm/opportunity.stage-changed", data: { record_id: "O", to_stage: STAGE } };
const SAVED = { name: "crm/opportunity.saved", data: { record_id: "O" } };

beforeEach(() => {
  jest.clearAllMocks();
  db.crm_Opportunities.create.mockImplementation(({ data }) => ({ id: "O", ...data }));
  db.crm_Opportunities.update.mockImplementation(({ where, data }) => ({ id: where.id, sales_stage: null, ...data }));
  db.crm_Opportunities.findUnique.mockResolvedValue({ id: "O", sales_stage: null, approval_status: "NONE" });
  db.crm_Opportunities_Sales_Stages.findUnique.mockResolvedValue({ id: STAGE, stage_kind: null });
  db.crm_Opportunities_Type.findUnique.mockResolvedValue({ id: TYPE });
});

it("lists stages (with probability and stage_kind) and types, each sorted by order", async () => {
  const stages = [
    { id: STAGE, name: "Prospecting", order: 1, probability: 10, stage_kind: null },
    { id: OTHER_STAGE, name: "Quote sent", order: 2, probability: 50, stage_kind: "qualified" },
  ];
  const types = [{ id: TYPE, name: "New business", order: 1 }];
  db.crm_Opportunities_Sales_Stages.findMany.mockResolvedValue(stages);
  db.crm_Opportunities_Type.findMany.mockResolvedValue(types);

  await expect(run("crm_list_opportunity_options", {})).resolves.toEqual({ data: { stages, types } });
  expect(db.crm_Opportunities_Sales_Stages.findMany).toHaveBeenCalledWith({
    select: { id: true, name: true, order: true, probability: true, stage_kind: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  expect(db.crm_Opportunities_Type.findMany).toHaveBeenCalledWith({
    select: { id: true, name: true, order: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
});

it("creates an opportunity with a stage and a type", async () => {
  const schema = crmOpportunityTools.find((t) => t.name === "crm_create_opportunity")!.schema;
  await run("crm_create_opportunity", schema.parse({ name: "Deal", sales_stage_id: STAGE, type_id: TYPE }));
  expect(db.crm_Opportunities.create.mock.calls[0][0].data).toMatchObject({
    name: "Deal",
    sales_stage: STAGE,
    type: TYPE,
    assigned_to: "u1",
  });
  expect(db.crm_Opportunities.create.mock.calls[0][0].data).not.toHaveProperty("sales_stage_id");
  expect(db.crm_Opportunities.create.mock.calls[0][0].data).not.toHaveProperty("type_id");
});

it.each([
  ["crm_create_opportunity", { name: "X", sales_stage_id: STAGE }, "crm_Opportunities_Sales_Stages"],
  ["crm_create_opportunity", { name: "X", type_id: TYPE }, "crm_Opportunities_Type"],
  ["crm_update_opportunity", { id: "O", sales_stage_id: STAGE }, "crm_Opportunities_Sales_Stages"],
  ["crm_update_opportunity", { id: "O", type_id: TYPE }, "crm_Opportunities_Type"],
])("%s rejects an unknown id as NOT_FOUND: %j", async (tool, args, table) => {
  db[table].findUnique.mockResolvedValue(null);
  await expect(run(tool, args)).rejects.toThrow("NOT_FOUND");
  expect(db.crm_Opportunities.create).not.toHaveBeenCalled();
  expect(db.crm_Opportunities.update).not.toHaveBeenCalled();
});

it("updates the stage and the type", async () => {
  await run("crm_update_opportunity", { id: "O", sales_stage_id: STAGE, type_id: TYPE });
  expect(db.crm_Opportunities.update.mock.calls[0][0].data).toMatchObject({
    sales_stage: STAGE,
    type: TYPE,
    updatedBy: "u1",
  });
});

it("clears the stage and the type with null, without looking up an id", async () => {
  await run("crm_update_opportunity", { id: "O", sales_stage_id: null, type_id: null });
  expect(db.crm_Opportunities_Sales_Stages.findUnique).not.toHaveBeenCalled();
  expect(db.crm_Opportunities_Type.findUnique).not.toHaveBeenCalled();
  expect(db.crm_Opportunities.update.mock.calls[0][0].data).toMatchObject({ sales_stage: null, type: null });
});

it("leaves the stage and the type alone when they are omitted", async () => {
  await run("crm_update_opportunity", { id: "O", name: "Renamed" });
  const data = db.crm_Opportunities.update.mock.calls[0][0].data;
  expect(data).not.toHaveProperty("sales_stage");
  expect(data).not.toHaveProperty("type");
});

it("schema: ids must be uuids; null is accepted on update only", () => {
  const create = crmOpportunityTools.find((t) => t.name === "crm_create_opportunity")!.schema;
  const update = crmOpportunityTools.find((t) => t.name === "crm_update_opportunity")!.schema;
  expect(create.safeParse({ name: "X", sales_stage_id: "not-a-uuid" }).success).toBe(false);
  expect(create.safeParse({ name: "X", type_id: null }).success).toBe(false);
  expect(update.safeParse({ id: STAGE, sales_stage_id: null, type_id: null }).success).toBe(true);
});

describe("after-save path, same as the web actions", () => {
  it("a stage move stamps stage_entered_at, fires stage-changed and saved, and is audited", async () => {
    db.crm_Opportunities.findUnique.mockResolvedValue({ id: "O", sales_stage: OTHER_STAGE, approval_status: "NONE" });
    await run("crm_update_opportunity", { id: "O", sales_stage_id: STAGE });

    expect(db.crm_Opportunities.update).toHaveBeenCalledWith({
      where: { id: "O" },
      data: { stage_entered_at: expect.any(Date) },
    });
    expect(sentEvents()).toEqual([STAGE_CHANGED, SAVED]);
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "opportunity",
      entityId: "O",
      action: "updated",
      changes: expect.arrayContaining([{ field: "sales_stage", old: OTHER_STAGE, new: STAGE }]),
      userId: "u1",
    });
  });

  it("re-sending the current stage does not restart the timers", async () => {
    db.crm_Opportunities.findUnique.mockResolvedValue({ id: "O", sales_stage: STAGE, approval_status: "NONE" });
    db.crm_Opportunities.update.mockImplementation(({ where, data }) => ({ id: where.id, sales_stage: STAGE, ...data }));
    await run("crm_update_opportunity", { id: "O", sales_stage_id: STAGE });
    expect(sentEvents()).toEqual([SAVED]);
    expect(db.crm_Opportunities.update).toHaveBeenCalledTimes(1);
  });

  it("an edit that does not touch the stage fires no stage-changed, but keeps the deal's current stage", async () => {
    db.crm_Opportunities.findUnique.mockResolvedValue({ id: "O", sales_stage: STAGE, approval_status: "NONE" });
    db.crm_Opportunities.update.mockImplementation(({ where, data }) => ({ id: where.id, sales_stage: STAGE, ...data }));
    await run("crm_update_opportunity", { id: "O", name: "Renamed" });
    expect(sentEvents()).toEqual([SAVED]);
    expect(writeAuditLog).toHaveBeenCalledTimes(1);
  });

  it("clearing the stage fires no stage-changed (no stage to enter)", async () => {
    db.crm_Opportunities.findUnique.mockResolvedValue({ id: "O", sales_stage: STAGE, approval_status: "NONE" });
    await run("crm_update_opportunity", { id: "O", sales_stage_id: null });
    expect(sentEvents()).toEqual([SAVED]);
  });

  it("a stage move reactivates an inactive deal; other edits leave its status alone", async () => {
    db.crm_Opportunities.findUnique.mockResolvedValue({ id: "O", sales_stage: OTHER_STAGE, status: "INACTIVE", approval_status: "NONE" });
    await run("crm_update_opportunity", { id: "O", sales_stage_id: STAGE });
    expect(db.crm_Opportunities.update.mock.calls[0][0].data).toMatchObject({ status: "ACTIVE" });

    db.crm_Opportunities.update.mockClear();
    await run("crm_update_opportunity", { id: "O", name: "Renamed" });
    expect(db.crm_Opportunities.update.mock.calls[0][0].data).not.toHaveProperty("status");
  });

  it("create with a stage fires stage-changed and saved, and is audited", async () => {
    await run("crm_create_opportunity", { name: "Deal", sales_stage_id: STAGE });
    expect(sentEvents()).toEqual([STAGE_CHANGED, SAVED]);
    expect(writeAuditLog).toHaveBeenCalledWith({
      entityType: "opportunity",
      entityId: "O",
      action: "created",
      changes: null,
      userId: "u1",
    });
  });

  it("create without a stage fires only saved", async () => {
    await run("crm_create_opportunity", { name: "Deal" });
    expect(sentEvents()).toEqual([SAVED]);
  });
});

describe("quote approval gate", () => {
  const GATE = /quote approval is required/i;

  it("refuses to enter a qualified stage without an approved quote, and writes nothing", async () => {
    db.crm_Opportunities_Sales_Stages.findUnique.mockResolvedValue({ id: STAGE, stage_kind: "qualified" });
    await expect(run("crm_update_opportunity", { id: "O", sales_stage_id: STAGE })).rejects.toThrow(GATE);
    expect(db.crm_Opportunities.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("lets an approved deal enter the qualified stage", async () => {
    db.crm_Opportunities_Sales_Stages.findUnique.mockResolvedValue({ id: STAGE, stage_kind: "qualified" });
    db.crm_Opportunities.findUnique.mockResolvedValue({ id: "O", sales_stage: null, approval_status: "APPROVED" });
    await run("crm_update_opportunity", { id: "O", sales_stage_id: STAGE });
    expect(sentEvents()).toEqual([STAGE_CHANGED, SAVED]);
  });

  it("refuses to create a deal directly in a qualified stage", async () => {
    db.crm_Opportunities_Sales_Stages.findUnique.mockResolvedValue({ id: STAGE, stage_kind: "qualified" });
    await expect(run("crm_create_opportunity", { name: "X", sales_stage_id: STAGE })).rejects.toThrow(GATE);
    expect(db.crm_Opportunities.create).not.toHaveBeenCalled();
  });
});

it("a user who cannot edit the opportunity cannot move its stage", async () => {
  (assertCanWriteOpportunity as jest.Mock).mockRejectedValueOnce(new AuthorizationError());
  await expect(run("crm_update_opportunity", { id: "O", sales_stage_id: STAGE })).rejects.toThrow("NOT_FOUND");
  expect(db.crm_Opportunities.update).not.toHaveBeenCalled();
  expect(inngest.send).not.toHaveBeenCalled();
  expect(writeAuditLog).not.toHaveBeenCalled();
});
