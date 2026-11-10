/**
 * Web UI actions check every record id they are given, the same way the MCP
 * tools do (Sentinel F1b). DB-backed: CI runs it in the integration job.
 *
 * Fixture: two plain users (`rep`, `other`) and a `boss` (manager). Each
 * action is called as `rep` with `other`'s template/account (refused, nothing
 * changes), as `rep` with his own (allowed) and as `boss` with `other`'s
 * (allowed). The session is mocked; the role comes from the DB.
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn(async () => undefined) } }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { updateCampaign } from "@/actions/campaigns/update-campaign";
import { createCampaign } from "@/actions/campaigns/create-campaign";
import { updateContract } from "@/actions/crm/contracts/update-contract";
import { createOpportunity } from "@/actions/crm/opportunities/create-opportunity";
import { updateOpportunity } from "@/actions/crm/opportunities/update-opportunity";

const tag = randomUUID().slice(0, 8);
const U = { rep: randomUUID(), other: randomUUID(), boss: randomUUID(), partner: randomUUID() };
const TPL = { rep: randomUUID(), other: randomUUID() };
const CAMP = { rep: randomUUID(), other: randomUUID() };
const ACC = { rep: randomUUID(), other: randomUUID() };
// rep's contract on his own account; rep's contract that a manager put on other's account; other's contract
const CONTRACT = { rep: randomUUID(), repOnOther: randomUUID(), other: randomUUID() };
// rep's opportunity on his campaign; rep's opportunity a manager linked to other's campaign;
// an opportunity on the partner's account linked to other's campaign
const OPP = { rep: randomUUID(), repOnOther: randomUUID(), partner: randomUUID() };
const PARTNER_ACC = randomUUID();

const as = (who: keyof typeof U) => (getSession as jest.Mock).mockResolvedValue({ user: { id: U[who] } });

beforeAll(async () => {
  await prismadb.users.createMany({
    data: (["rep", "other", "boss", "partner"] as const).map((k) => ({
      id: U[k], email: `${k}-${tag}@ui-scope.test`, name: `${k}-${tag}`,
      role: k === "boss" ? "manager" : k === "partner" ? "partner" : "user", userStatus: "ACTIVE",
    })),
  });
  for (const k of ["rep", "other"] as const) {
    await prismadb.crm_Accounts.create({
      data: { id: ACC[k], v: 0, name: `${k}-${tag}`, assigned_to: U[k], createdBy: U[k] },
    });
    await prismadb.crm_campaign_templates.create({
      data: { id: TPL[k], name: `${k}-${tag}`, content_html: "<p>x</p>", content_json: {}, created_by: U[k] },
    });
    await prismadb.crm_campaigns.create({
      data: { id: CAMP[k], v: 0, name: `${k}-${tag}`, status: "draft", template_id: TPL[k], created_by: U[k] },
    });
  }
});

beforeAll(async () => {
  for (const [k, owner, account] of [
    ["rep", U.rep, ACC.rep], ["repOnOther", U.rep, ACC.other], ["other", U.other, ACC.other],
  ] as const) {
    await prismadb.crm_Contracts.create({
      data: { id: CONTRACT[k], v: 0, title: `${k}-${tag}`, value: 1, account, assigned_to: owner, createdBy: owner },
    });
  }
  await prismadb.crm_Accounts.create({
    data: { id: PARTNER_ACC, v: 0, name: `partner-${tag}`, assigned_to: U.rep, createdBy: U.rep, partnerUserId: U.partner },
  });
  for (const [k, campaign, account] of [
    ["rep", CAMP.rep, ACC.rep], ["repOnOther", CAMP.other, ACC.rep], ["partner", CAMP.other, PARTNER_ACC],
  ] as const) {
    await prismadb.crm_Opportunities.create({
      data: { id: OPP[k], name: `${k}-${tag}`, campaign, account, assigned_to: U.rep, createdBy: U.rep },
    });
  }
});

afterAll(async () => {
  await prismadb.crm_Opportunities.deleteMany({ where: { name: { contains: tag } } });
  await prismadb.crm_Accounts.deleteMany({ where: { id: PARTNER_ACC } });
  await prismadb.crm_Contracts.deleteMany({ where: { id: { in: Object.values(CONTRACT) } } });
  await prismadb.crm_Accounts.deleteMany({ where: { id: { in: Object.values(ACC) } } });
  const campaigns = await prismadb.crm_campaigns.findMany({ where: { name: { contains: tag } }, select: { id: true } });
  const campaignIds = campaigns.map((c) => c.id);
  await prismadb.crm_campaign_steps.deleteMany({ where: { campaign_id: { in: campaignIds } } });
  await prismadb.crm_campaigns.deleteMany({ where: { id: { in: campaignIds } } });
  await prismadb.crm_campaign_templates.deleteMany({ where: { id: { in: Object.values(TPL) } } });
  await prismadb.users.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prismadb.$disconnect();
});

// A server action takes whatever the client posts, so the declared six fields
// must hold at runtime. Cast: these payloads are exactly what the type forbids.
describe("updateCampaign fields", () => {
  const row = (id: string) =>
    prismadb.crm_campaigns.findUnique({ where: { id }, include: { _count: { select: { steps: true, opportunities: true } } } });

  // So one regression fails one case, not every case after a soft delete.
  beforeEach(async () => {
    await prismadb.crm_campaigns.update({
      where: { id: CAMP.rep },
      data: { status: "draft", deletedAt: null, sent_at: null, created_by: U.rep, template_id: TPL.rep },
    });
  });

  it.each<[string, () => object]>([
    ["status", () => ({ status: "sent" })],
    ["deletedAt", () => ({ deletedAt: new Date("2026-01-01") })],
    ["created_by", () => ({ created_by: U.other })],
    ["sent_at", () => ({ sent_at: new Date("2026-01-01") })],
    ["an allowed field next to a forbidden one", () => ({ name: `x-${tag}`, status: "sending" })],
    ["relation write on template", () => ({ template: { connect: { id: TPL.other } } })],
    ["relation write on owner", () => ({ created_by_user: { connect: { id: U.other } } })],
    ["relation write on steps", () => ({ steps: { create: { order: 0, template_id: TPL.rep, subject: "x", delay_days: 0, send_to: "all" } } })],
    ["relation write on opportunities", () => ({ opportunities: { connect: { id: OPP.partner } } })],
  ])("refuses %s and changes nothing", async (_label, payload) => {
    as("rep");
    const before = await row(CAMP.rep);
    expect(await updateCampaign(CAMP.rep, payload() as never)).toEqual({ error: "Invalid input" });
    expect(await row(CAMP.rep)).toEqual(before);
  });

  it.each<[string, unknown]>([
    ["scheduled_at that is not a date", { scheduled_at: "not-a-date" }],
    ["scheduled_at that is a number", { scheduled_at: 12345 }],
    ["scheduled_at that is an invalid Date", { scheduled_at: new Date("nope") }],
    ["reply_to that is not an email", { reply_to: "not-an-email" }],
    ["empty name", { name: "" }],
    ["name that is not a string", { name: 123 }],
    ["template_id that is not a uuid", { template_id: "nope" }],
    ["data that is not an object", null],
  ])("returns an error for %s and changes nothing", async (_label, payload) => {
    as("rep");
    const before = await row(CAMP.rep);
    expect(await updateCampaign(CAMP.rep, payload as never)).toEqual({ error: "Invalid input" });
    expect(await row(CAMP.rep)).toEqual(before);
  });

  it("writes all six declared fields", async () => {
    as("rep");
    await updateCampaign(CAMP.rep, {
      name: `six-${tag}`,
      description: "d",
      from_name: "f",
      reply_to: "r@example.com",
      template_id: TPL.rep,
      scheduled_at: new Date("2027-01-01T00:00:00Z"),
    });
    expect(await row(CAMP.rep)).toMatchObject({
      name: `six-${tag}`,
      description: "d",
      from_name: "f",
      reply_to: "r@example.com",
      template_id: TPL.rep,
      scheduled_at: new Date("2027-01-01T00:00:00Z"),
    });
  });
});

describe("updateCampaign template_id", () => {
  const templateOf = async (id: string) =>
    (await prismadb.crm_campaigns.findUnique({ where: { id }, select: { template_id: true } }))!.template_id;

  it("user cannot switch his campaign to another user's template", async () => {
    as("rep");
    expect(await updateCampaign(CAMP.rep, { template_id: TPL.other })).toEqual({ error: "Forbidden" });
    expect(await templateOf(CAMP.rep)).toBe(TPL.rep);
  });

  it("own template as user, any template as manager", async () => {
    as("rep");
    await updateCampaign(CAMP.rep, { template_id: TPL.rep, name: `rep-${tag}-own` });
    expect(await templateOf(CAMP.rep)).toBe(TPL.rep);
    as("boss");
    await updateCampaign(CAMP.other, { template_id: TPL.rep });
    expect(await templateOf(CAMP.other)).toBe(TPL.rep);
  });
});

describe("createCampaign step templates", () => {
  const create = (name: string, stepTemplate: string) =>
    createCampaign({
      name,
      target_list_ids: [],
      steps: [
        { order: 1, template_id: TPL.rep, subject: "s1", delay_days: 0, send_to: "all" },
        { order: 2, template_id: stepTemplate, subject: "s2", delay_days: 1, send_to: "all" },
      ],
    });
  const count = (name: string) => prismadb.crm_campaigns.count({ where: { name } });

  it("user cannot use another user's template in a step", async () => {
    as("rep");
    expect(await create(`new-${tag}-x`, TPL.other)).toEqual({ error: "Forbidden" });
    expect(await count(`new-${tag}-x`)).toBe(0);
  });

  it("own templates as user, any template as manager", async () => {
    as("rep");
    await create(`new-${tag}-own`, TPL.rep);
    expect(await count(`new-${tag}-own`)).toBe(1);
    as("boss");
    await create(`new-${tag}-boss`, TPL.other);
    expect(await count(`new-${tag}-boss`)).toBe(1);
  });
});

describe("updateContract account", () => {
  const d = new Date("2026-01-01");
  const update = (id: string, account: string, assigned_to: string, title: string) =>
    updateContract({
      id, v: 0, title, value: "1", startDate: d, endDate: d, renewalReminderDate: d,
      customerSignedDate: d, companySignedDate: d, description: "", status: "NOTSTARTED" as any,
      account, assigned_to,
    });
  const row = async (id: string) =>
    (await prismadb.crm_Contracts.findUnique({ where: { id }, select: { account: true, title: true } }))!;

  it("user cannot move his contract to another user's account", async () => {
    as("rep");
    expect(await update(CONTRACT.rep, ACC.other, U.rep, `hijack-${tag}`)).toEqual({ error: "Forbidden" });
    expect(await row(CONTRACT.rep)).toEqual({ account: ACC.rep, title: `rep-${tag}` });
  });

  it("user can edit his contract that already sits on another user's account", async () => {
    as("rep");
    expect(await update(CONTRACT.repOnOther, ACC.other, U.rep, `repOnOther-${tag}-2`)).toEqual({ data: { title: `repOnOther-${tag}-2` } });
    expect(await row(CONTRACT.repOnOther)).toEqual({ account: ACC.other, title: `repOnOther-${tag}-2` });
  });

  it("own account as user, any account as manager", async () => {
    as("rep");
    await update(CONTRACT.repOnOther, ACC.rep, U.rep, `repOnOther-${tag}-3`);
    expect((await row(CONTRACT.repOnOther)).account).toBe(ACC.rep);
    as("boss");
    await update(CONTRACT.other, ACC.rep, U.other, `other-${tag}-2`);
    expect((await row(CONTRACT.other)).account).toBe(ACC.rep);
  });
});

describe("opportunity campaign", () => {
  const row = async (id: string) =>
    (await prismadb.crm_Opportunities.findUnique({ where: { id }, select: { campaign: true, name: true } }))!;
  const count = (name: string) => prismadb.crm_Opportunities.count({ where: { name } });

  it("user cannot create an opportunity on another user's campaign", async () => {
    as("rep");
    expect(await createOpportunity({ name: `opp-${tag}-x`, campaign: CAMP.other })).toEqual({ error: "Forbidden" });
    expect(await count(`opp-${tag}-x`)).toBe(0);
  });

  it("own campaign as user", async () => {
    as("rep");
    await createOpportunity({ name: `opp-${tag}-own`, campaign: CAMP.rep });
    expect(await count(`opp-${tag}-own`)).toBe(1);
  });

  it("user cannot move his opportunity to another user's campaign", async () => {
    as("rep");
    expect(await updateOpportunity({ id: OPP.rep, name: `hijack-${tag}`, campaign: CAMP.other })).toEqual({ error: "Forbidden" });
    expect(await row(OPP.rep)).toEqual({ campaign: CAMP.rep, name: `rep-${tag}` });
  });

  it("user can edit his opportunity that already sits on another user's campaign", async () => {
    as("rep");
    expect(await updateOpportunity({ id: OPP.repOnOther, name: `repOnOther-${tag}-2`, campaign: CAMP.other })).not.toHaveProperty("error");
    expect(await row(OPP.repOnOther)).toEqual({ campaign: CAMP.other, name: `repOnOther-${tag}-2` });
  });

  it("partner cannot link any new campaign, but can save the stored one", async () => {
    as("partner");
    expect(await updateOpportunity({ id: OPP.partner, name: `p-${tag}-x`, campaign: CAMP.rep })).toEqual({ error: "Forbidden" });
    expect(await row(OPP.partner)).toEqual({ campaign: CAMP.other, name: `partner-${tag}` });
    expect(await updateOpportunity({ id: OPP.partner, name: `partner-${tag}-2`, campaign: CAMP.other })).not.toHaveProperty("error");
    expect(await row(OPP.partner)).toEqual({ campaign: CAMP.other, name: `partner-${tag}-2` });
  });

  // The edit form sends "" for an empty campaign select; null comes from API callers.
  it("leaves the campaign alone when the field is not sent, clears it on \"\" or null", async () => {
    as("rep");
    expect(await updateOpportunity({ id: OPP.repOnOther, name: `keep-${tag}` })).not.toHaveProperty("error");
    expect(await row(OPP.repOnOther)).toEqual({ campaign: CAMP.other, name: `keep-${tag}` });
    expect(await updateOpportunity({ id: OPP.repOnOther, name: `clear-${tag}`, campaign: "" })).not.toHaveProperty("error");
    expect(await row(OPP.repOnOther)).toEqual({ campaign: null, name: `clear-${tag}` });
    expect(await updateOpportunity({ id: OPP.rep, name: `null-${tag}`, campaign: null })).not.toHaveProperty("error");
    expect(await row(OPP.rep)).toEqual({ campaign: null, name: `null-${tag}` });
  });
});
