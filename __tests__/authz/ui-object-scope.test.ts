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

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { updateCampaign } from "@/actions/campaigns/update-campaign";
import { createCampaign } from "@/actions/campaigns/create-campaign";
import { updateContract } from "@/actions/crm/contracts/update-contract";

const tag = randomUUID().slice(0, 8);
const U = { rep: randomUUID(), other: randomUUID(), boss: randomUUID() };
const TPL = { rep: randomUUID(), other: randomUUID() };
const CAMP = { rep: randomUUID(), other: randomUUID() };
const ACC = { rep: randomUUID(), other: randomUUID() };
// rep's contract on his own account; rep's contract that a manager put on other's account; other's contract
const CONTRACT = { rep: randomUUID(), repOnOther: randomUUID(), other: randomUUID() };

const as = (who: keyof typeof U) => (getSession as jest.Mock).mockResolvedValue({ user: { id: U[who] } });

beforeAll(async () => {
  await prismadb.users.createMany({
    data: (["rep", "other", "boss"] as const).map((k) => ({
      id: U[k], email: `${k}-${tag}@ui-scope.test`, name: `${k}-${tag}`,
      role: k === "boss" ? "manager" : "user", userStatus: "ACTIVE",
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
});

afterAll(async () => {
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
