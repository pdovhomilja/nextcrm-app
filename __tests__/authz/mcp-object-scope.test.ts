/**
 * MCP tools apply the same per-object checks as the web UI for the same
 * action (Sentinel F1). DB-backed: CI runs it in the integration job.
 *
 * Fixture: two plain users (`rep`, `other`) and a `boss` (manager). `other`
 * owns one of each record. Each tool is called through its real handler as
 * `rep` on `other`'s record (must be NOT_FOUND and change nothing), as `rep`
 * on his own record, and as `boss` on `other`'s record (both allowed).
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/api-keys", () => ({ getApiKey: jest.fn().mockResolvedValue("test-key") }));
jest.mock("@/lib/enrichment/target-enrichment-keys", () => ({
  missingTargetEnrichmentKey: jest.fn().mockResolvedValue(null),
}));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import type { AuthzUser } from "@/lib/authz";
import { inngest } from "@/inngest/client";
import { crmContractTools } from "@/lib/mcp/tools/crm-contracts";
import { crmEnrichmentTools } from "@/lib/mcp/tools/crm-enrichment";
import { crmTargetListTools } from "@/lib/mcp/tools/crm-target-lists";
import { campaignTools } from "@/lib/mcp/tools/campaigns";
import { crmActivityTools } from "@/lib/mcp/tools/crm-activities";

const tag = randomUUID().slice(0, 8);
const U = { rep: randomUUID(), other: randomUUID(), boss: randomUUID() };
const rep: AuthzUser = { id: U.rep, role: "user" };
const boss: AuthzUser = { id: U.boss, role: "manager" };
const ACC = { rep: randomUUID(), other: randomUUID() };
const CONTRACT = { rep: randomUUID(), other: randomUUID() };
const CONTACT = { rep: randomUUID(), other: randomUUID() };
const LEAD = { rep: randomUUID(), other: randomUUID() };
const OPP = { rep: randomUUID(), other: randomUUID() };
const TARGET = { rep: randomUUID(), other: randomUUID() };
const LIST = { rep: randomUUID(), other: randomUUID() };
const TPL = { rep: randomUUID(), other: randomUUID() };
const CAMP = { rep: randomUUID(), other: randomUUID() };
const STEP = { rep: randomUUID(), other: randomUUID() };

const call = (tools: readonly { name: string; handler: unknown }[], name: string, args: unknown, user: AuthzUser) => {
  const tool = tools.find((t) => t.name === name)!;
  return (tool.handler as any)(args, user.id, user);
};

beforeAll(async () => {
  await prismadb.users.createMany({
    data: (["rep", "other", "boss"] as const).map((k) => ({
      id: U[k], email: `${k}-${tag}@mcp-scope.test`, name: `${k}-${tag}`,
      role: k === "boss" ? "manager" : "user", userStatus: "ACTIVE",
    })),
  });
  for (const k of ["rep", "other"] as const) {
    await prismadb.crm_Accounts.create({
      data: { id: ACC[k], v: 0, name: `${k}-${tag}`, assigned_to: U[k], createdBy: U[k] },
    });
    await prismadb.crm_Contracts.create({
      data: { id: CONTRACT[k], v: 0, title: `${k}-${tag}`, value: 1, assigned_to: U[k], createdBy: U[k] },
    });
    await prismadb.crm_Contacts.create({
      data: { id: CONTACT[k], last_name: `${k}-${tag}`, email: `c-${k}-${tag}@mcp-scope.test`, assigned_to: U[k], createdBy: U[k] },
    });
    await prismadb.crm_Leads.create({
      data: { id: LEAD[k], lastName: `${k}-${tag}`, assigned_to: U[k], createdBy: U[k] },
    });
    await prismadb.crm_Opportunities.create({
      data: { id: OPP[k], name: `${k}-${tag}`, assigned_to: U[k], createdBy: U[k] },
    });
    await prismadb.crm_Targets.create({
      data: { id: TARGET[k], last_name: `${k}-${tag}`, email: `t-${k}-${tag}@mcp-scope.test`, created_by: U[k] },
    });
    await prismadb.crm_TargetLists.create({ data: { id: LIST[k], name: `${k}-${tag}`, created_by: U[k] } });
    await prismadb.crm_campaign_templates.create({
      data: { id: TPL[k], name: `${k}-${tag}`, content_html: "<p>x</p>", content_json: {}, created_by: U[k] },
    });
    await prismadb.crm_campaigns.create({
      data: { id: CAMP[k], v: 0, name: `${k}-${tag}`, status: "draft", template_id: TPL[k], created_by: U[k] },
    });
    await prismadb.crm_campaign_steps.create({
      data: { id: STEP[k], campaign_id: CAMP[k], order: 1, template_id: TPL[k], subject: "s" },
    });
  }
});

afterAll(async () => {
  const activities = await prismadb.crm_Activities.findMany({ where: { title: { startsWith: `act-${tag}` } }, select: { id: true } });
  const activityIds = activities.map((a) => a.id);
  await prismadb.crm_ActivityLinks.deleteMany({ where: { activityId: { in: activityIds } } });
  await prismadb.crm_Activities.deleteMany({ where: { id: { in: activityIds } } });
  const campaigns = await prismadb.crm_campaigns.findMany({ where: { name: { contains: tag } }, select: { id: true } });
  const campaignIds = campaigns.map((c) => c.id);
  await prismadb.campaignToTargetLists.deleteMany({ where: { campaign_id: { in: campaignIds } } });
  await prismadb.crm_campaign_steps.deleteMany({ where: { campaign_id: { in: campaignIds } } });
  await prismadb.crm_campaigns.deleteMany({ where: { id: { in: campaignIds } } });
  await prismadb.crm_campaign_templates.deleteMany({ where: { id: { in: Object.values(TPL) } } });
  await prismadb.crm_Contact_Enrichment.deleteMany({ where: { contactId: { in: Object.values(CONTACT) } } });
  await prismadb.crm_Target_Enrichment.deleteMany({ where: { targetId: { in: Object.values(TARGET) } } });
  await prismadb.targetsToTargetLists.deleteMany({ where: { target_list_id: { in: Object.values(LIST) } } });
  await prismadb.crm_TargetLists.deleteMany({ where: { id: { in: Object.values(LIST) } } });
  await prismadb.crm_Leads.deleteMany({ where: { id: { in: Object.values(LEAD) } } });
  await prismadb.crm_Opportunities.deleteMany({ where: { id: { in: Object.values(OPP) } } });
  await prismadb.crm_Contacts.deleteMany({ where: { id: { in: Object.values(CONTACT) } } });
  await prismadb.crm_Targets.deleteMany({ where: { id: { in: Object.values(TARGET) } } });
  await prismadb.crm_Contracts.deleteMany({ where: { OR: [{ id: { in: Object.values(CONTRACT) } }, { title: { startsWith: `new-${tag}` } }] } });
  await prismadb.crm_Accounts.deleteMany({ where: { id: { in: Object.values(ACC) } } });
  await prismadb.users.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prismadb.$disconnect();
});

describe("crm-contracts", () => {
  const titleOf = async (id: string) =>
    (await prismadb.crm_Contracts.findUnique({ where: { id }, select: { title: true } }))!.title;

  it("crm_update_contract: user cannot update another user's contract", async () => {
    await expect(call(crmContractTools, "crm_update_contract", { id: CONTRACT.other, title: "hijack" }, rep)).rejects.toThrow("NOT_FOUND");
    expect(await titleOf(CONTRACT.other)).toBe(`other-${tag}`);
  });

  it("crm_update_contract: own contract as user, any contract as manager", async () => {
    await call(crmContractTools, "crm_update_contract", { id: CONTRACT.rep, title: `rep-${tag}` }, rep);
    await call(crmContractTools, "crm_update_contract", { id: CONTRACT.other, title: `other-${tag}` }, boss);
  });

  it("crm_create_contract: user cannot attach a contract to another user's account", async () => {
    await expect(
      call(crmContractTools, "crm_create_contract", { title: `new-${tag}-x`, value: 1, account: ACC.other }, rep),
    ).rejects.toThrow("NOT_FOUND");
    expect(await prismadb.crm_Contracts.count({ where: { title: `new-${tag}-x` } })).toBe(0);
    await call(crmContractTools, "crm_create_contract", { title: `new-${tag}-own`, value: 1, account: ACC.rep }, rep);
    await call(crmContractTools, "crm_create_contract", { title: `new-${tag}-boss`, value: 1, account: ACC.other }, boss);
  });

  it("crm_delete_contract: user cannot delete another user's contract", async () => {
    await expect(call(crmContractTools, "crm_delete_contract", { id: CONTRACT.other }, rep)).rejects.toThrow("NOT_FOUND");
    expect((await prismadb.crm_Contracts.findUnique({ where: { id: CONTRACT.other } }))!.deletedAt).toBeNull();
  });

  it("crm_delete_contract: own contract as user, any contract as manager", async () => {
    await call(crmContractTools, "crm_delete_contract", { id: CONTRACT.rep }, rep);
    await call(crmContractTools, "crm_delete_contract", { id: CONTRACT.other }, boss);
  });
});

describe("crm-enrichment", () => {
  const fields = [{ name: "industry" }];
  const enrich = (name: string, args: object, user: AuthzUser) =>
    call(crmEnrichmentTools, name, { ...args, fields }, user);

  beforeEach(() => (inngest.send as jest.Mock).mockClear());

  it.each([
    ["crm_enrich_contact", { contactId: CONTACT.other }],
    ["crm_enrich_contact_bulk", { contactIds: [CONTACT.rep, CONTACT.other] }],
    ["crm_enrich_target", { targetId: TARGET.other }],
    ["crm_enrich_target_bulk", { targetIds: [TARGET.rep, TARGET.other] }],
  ])("%s: user cannot enrich another user's record", async (name, args) => {
    await expect(enrich(name, args, rep)).rejects.toThrow("NOT_FOUND");
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it.each([
    ["crm_enrich_contact", { contactId: CONTACT.rep }, { contactId: CONTACT.other }],
    ["crm_enrich_contact_bulk", { contactIds: [CONTACT.rep] }, { contactIds: [CONTACT.other] }],
    ["crm_enrich_target", { targetId: TARGET.rep }, { targetId: TARGET.other }],
    ["crm_enrich_target_bulk", { targetIds: [TARGET.rep] }, { targetIds: [TARGET.other] }],
  ])("%s: own record as user, any record as manager", async (name, own, foreign) => {
    await enrich(name, own, rep);
    await enrich(name, foreign, boss);
    expect(inngest.send).toHaveBeenCalledTimes(2);
  });
});

describe("crm-target-lists", () => {
  const members = async (listId: string) =>
    (await prismadb.targetsToTargetLists.findMany({ where: { target_list_id: listId }, select: { target_id: true } }))
      .map((r) => r.target_id);

  it("crm_add_to_target_list: user cannot add another user's target to his list", async () => {
    // Same as the addTargetsToList action: targets the caller cannot access are dropped.
    await call(crmTargetListTools, "crm_add_to_target_list", { target_list_id: LIST.rep, target_ids: [TARGET.rep, TARGET.other] }, rep);
    expect(await members(LIST.rep)).toEqual([TARGET.rep]);
    const list = await call(crmTargetListTools, "crm_get_target_list", { id: LIST.rep, limit: 50, offset: 0 }, rep);
    expect(JSON.stringify(list)).not.toContain(TARGET.other);
  });

  it("crm_add_to_target_list: user can add his own target to his own list", async () => {
    await prismadb.targetsToTargetLists.deleteMany({ where: { target_list_id: LIST.rep } });
    const res = await call(crmTargetListTools, "crm_add_to_target_list", { target_list_id: LIST.rep, target_ids: [TARGET.rep] }, rep);
    expect(res.data.added).toBe(1);
    expect(await members(LIST.rep)).toContain(TARGET.rep);
  });

  it("crm_add_to_target_list: manager can add any target", async () => {
    await call(crmTargetListTools, "crm_add_to_target_list", { target_list_id: LIST.other, target_ids: [TARGET.other] }, boss);
    expect(await members(LIST.other)).toEqual([TARGET.other]);
  });
});

describe("campaigns", () => {
  const camp = (name: string, args: object, user: AuthzUser) => call(campaignTools, name, args, user);
  // Each tool that takes a template_id: [tool, args using template t, campaign/step owned by "who"]
  const templateCases = [
    ["campaigns_create", (t: string, who: "rep" | "other") => ({ name: `new-${tag}-${who}`, template_id: t })],
    ["campaigns_update", (t: string, who: "rep" | "other") => ({ id: CAMP[who], template_id: t })],
    ["campaigns_create_step", (t: string, who: "rep" | "other") => ({ campaign_id: CAMP[who], order: 2, template_id: t, subject: "s", delay_days: 0, send_to: "all" })],
    ["campaigns_update_step", (t: string, who: "rep" | "other") => ({ id: STEP[who], template_id: t })],
  ] as const;

  it.each(templateCases)("%s: user cannot use another user's template", async (name, args) => {
    await expect(camp(name, args(TPL.other, "rep"), rep)).rejects.toThrow("NOT_FOUND");
    expect(await prismadb.crm_campaigns.count({ where: { name: `new-${tag}-rep` } })).toBe(0);
    expect((await prismadb.crm_campaigns.findUnique({ where: { id: CAMP.rep } }))!.template_id).toBe(TPL.rep);
    expect(await prismadb.crm_campaign_steps.count({ where: { campaign_id: CAMP.rep } })).toBe(1);
    expect((await prismadb.crm_campaign_steps.findUnique({ where: { id: STEP.rep } }))!.template_id).toBe(TPL.rep);
  });

  it.each(templateCases)("%s: own template as user, any template as manager", async (name, args) => {
    await camp(name, args(TPL.rep, "rep"), rep);
    await camp(name, args(TPL.other, "other"), boss);
  });

  it("campaigns_assign_target_list: user cannot attach another user's target list", async () => {
    await expect(
      camp("campaigns_assign_target_list", { campaign_id: CAMP.rep, target_list_id: LIST.other }, rep),
    ).rejects.toThrow("NOT_FOUND");
    expect(await prismadb.campaignToTargetLists.count({ where: { campaign_id: CAMP.rep } })).toBe(0);
  });

  it("campaigns_assign_target_list: own list as user, any list as manager", async () => {
    await camp("campaigns_assign_target_list", { campaign_id: CAMP.rep, target_list_id: LIST.rep }, rep);
    await camp("campaigns_assign_target_list", { campaign_id: CAMP.other, target_list_id: LIST.other }, boss);
  });
});

describe("crm-activities", () => {
  const note = (title: string, entityType: string, entityId: string, user: AuthzUser) =>
    call(crmActivityTools, "crm_create_activity", {
      type: "note", title, date: new Date().toISOString(), status: "completed", links: [{ entityType, entityId }],
    }, user);

  it.each([
    ["account", ACC],
    ["contact", CONTACT],
    ["contract", CONTRACT],
    ["lead", LEAD],
    ["opportunity", OPP],
  ] as const)("crm_create_activity: user cannot link to another user's %s", async (entityType, ids) => {
    await expect(note(`act-${tag}-x`, entityType, ids.other, rep)).rejects.toThrow("NOT_FOUND");
    expect(await prismadb.crm_Activities.count({ where: { title: `act-${tag}-x` } })).toBe(0);
  });

  it.each([
    ["account", ACC],
    ["lead", LEAD],
    ["opportunity", OPP],
  ] as const)("crm_create_activity: own %s as user, any as manager", async (entityType, ids) => {
    await note(`act-${tag}-own`, entityType, ids.rep, rep);
    await note(`act-${tag}-boss`, entityType, ids.other, boss);
  });
});
