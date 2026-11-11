/**
 * Campaigns have two delete markers: the campaigns UI sets status "deleted",
 * the MCP campaigns_delete tool sets deletedAt. campaignReadScopeWhere must hide
 * both, and keep campaigns whose status is NULL. DB-backed: CI runs it in the
 * integration job.
 *
 * Fixture: creator U (role user) owns four campaigns: normal ("sent"), NULL
 * status, UI-deleted (status "deleted") and MCP-deleted (status "sent",
 * deletedAt set). Manager M and partner P own nothing. Rep R (role user) owns
 * one target and no campaign.
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/audit-log", () => ({ ...jest.requireActual("@/lib/audit-log"), writeAuditLog: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getCampaigns } from "@/actions/campaigns/get-campaigns";
import { getCampaign } from "@/actions/campaigns/get-campaign";
import { getCampaignsCount } from "@/actions/dashboard/get-campaigns-count";
import { convertTargetToDeal } from "@/actions/crm/targets/convert-target-to-deal";
import { inngest } from "@/inngest/client";
import { createDataApi } from "@/lib/plugins/data-api";

const tag = randomUUID().slice(0, 8);
const U = { creator: randomUUID(), manager: randomUUID(), partner: randomUUID(), rep: randomUUID() };
const C = { normal: randomUUID(), nullStatus: randomUUID(), uiDeleted: randomUUID(), mcpDeleted: randomUUID() };
const as = (who: keyof typeof U) => (getSession as jest.Mock).mockResolvedValue({ user: { id: U[who] } });
const names = (rows: { name: string }[]) => rows.map((r) => r.name).sort();
const VISIBLE = [`normal-${tag}`, `null-${tag}`];

beforeAll(async () => {
  await prismadb.users.createMany({
    data: [
      { id: U.creator, email: `c-${tag}@cdm.test`, name: `c-${tag}`, role: "user", userStatus: "ACTIVE" },
      { id: U.manager, email: `m-${tag}@cdm.test`, name: `m-${tag}`, role: "manager", userStatus: "ACTIVE" },
      { id: U.partner, email: `p-${tag}@cdm.test`, name: `p-${tag}`, role: "partner", userStatus: "ACTIVE" },
      { id: U.rep, email: `r-${tag}@cdm.test`, name: `r-${tag}`, role: "user", userStatus: "ACTIVE" },
    ],
  });
  await prismadb.crm_campaigns.createMany({
    data: [
      { id: C.normal, name: `normal-${tag}`, status: "sent" },
      { id: C.nullStatus, name: `null-${tag}`, status: null },
      { id: C.uiDeleted, name: `ui-deleted-${tag}`, status: "deleted" },
      { id: C.mcpDeleted, name: `mcp-deleted-${tag}`, status: "sent", deletedAt: new Date() },
    ].map((c) => ({ ...c, v: 0, created_by: U.creator })),
  });
});

afterAll(async () => {
  await prismadb.crm_campaigns.deleteMany({ where: { id: { in: Object.values(C) } } });
  await prismadb.users.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prismadb.$disconnect();
});

describe("campaigns list (getCampaigns)", () => {
  it.each(["creator", "manager"] as const)("%s sees the normal and the NULL-status campaign only", async (who) => {
    as(who);
    expect(names(await getCampaigns({ search: tag }))).toEqual(VISIBLE);
  });

  it("the UI status filter still works and cannot bring a deleted campaign back", async () => {
    as("manager");
    expect(names(await getCampaigns({ search: tag, status: "sent" }))).toEqual([`normal-${tag}`]);
    expect(await getCampaigns({ search: tag, status: "deleted" })).toEqual([]);
  });
});

describe("dashboard campaign count (getCampaignsCount)", () => {
  // The manager's count is global, so check which fixture rows its where
  // matches (a bare count would hide one bug behind the other: 2 either way).
  it.each([
    ["manager", VISIBLE],
    ["creator", VISIBLE],
    ["partner", []],
  ] as const)("%s's count matches only the normal and the NULL-status campaign", async (who, expected) => {
    as(who);
    const spy = jest.spyOn(prismadb.crm_campaigns, "count");
    await getCampaignsCount();
    const where = (spy.mock.calls[0][0] as { where: object }).where;
    spy.mockRestore();
    const rows = await prismadb.crm_campaigns.findMany({ where: { AND: [where, { name: { contains: tag } }] } });
    expect(names(rows)).toEqual(expected);
  });
});

describe("campaign detail (getCampaign)", () => {
  it.each(["creator", "manager"] as const)("%s can open only the normal and the NULL-status campaign", async (who) => {
    as(who);
    expect((await getCampaign(C.normal))?.id).toBe(C.normal);
    expect((await getCampaign(C.nullStatus))?.id).toBe(C.nullStatus);
    expect(await getCampaign(C.uiDeleted)).toBeNull();
    expect(await getCampaign(C.mcpDeleted)).toBeNull();
  });
});

// Convert to deal credits the campaign that last emailed the target, skipping
// campaigns deleted by either marker. It credits the sender even when another
// user owns the campaign (Pavel 2026-11-03: a manager runs the campaigns, reps
// convert). Each target gets one send per campaign; a later send = newer.
describe("convert to deal campaign credit (convertTargetToDeal)", () => {
  const TEMPLATE = randomUUID();
  type K = keyof typeof C;
  // [name, caller who owns the target, sends oldest → newest, credited campaign]
  const CASES: [string, "creator" | "rep", K[], K | null][] = [
    ["the newest send is from a live campaign", "creator", ["uiDeleted", "normal"], "normal"],
    ["the newest send is from a UI-deleted campaign", "creator", ["normal", "uiDeleted"], "normal"],
    ["the newest send is from an MCP-deleted campaign", "creator", ["normal", "mcpDeleted"], "normal"],
    ["only deleted campaigns emailed the target", "creator", ["uiDeleted", "mcpDeleted"], null],
    ["the live campaign belongs to another user", "rep", ["normal", "mcpDeleted"], "normal"],
    ["the live campaign has a NULL status", "creator", ["normal", "nullStatus", "uiDeleted"], "nullStatus"],
  ];
  const targets = CASES.map(() => randomUUID());
  const steps: Partial<Record<K, string>> = {};

  beforeAll(async () => {
    await prismadb.crm_campaign_templates.create({
      data: { id: TEMPLATE, name: `cdm-tpl-${tag}`, content_html: "<p>x</p>", content_json: {} },
    });
    for (const k of Object.keys(C) as K[]) {
      const step = await prismadb.crm_campaign_steps.create({
        data: { campaign_id: C[k], order: 1, template_id: TEMPLATE, subject: "s" },
      });
      steps[k] = step.id;
    }
    for (let i = 0; i < CASES.length; i++) {
      const [, owner, sends] = CASES[i];
      await prismadb.crm_Targets.create({
        data: { id: targets[i], last_name: `cdm-t${i}-${tag}`, company: `cdm-co${i}-${tag}`, created_by: U[owner] },
      });
      for (let j = 0; j < sends.length; j++) {
        const k = sends[j];
        await prismadb.crm_campaign_sends.create({
          data: {
            campaign_id: C[k], step_id: steps[k]!, target_id: targets[i], email: `t${i}-${k}@cdm.test`,
            status: "sent", sent_at: new Date(Date.UTC(2002, 0, 1 + j)),
          },
        });
      }
    }
  });

  afterAll(async () => {
    const converted = await prismadb.crm_Targets.findMany({ where: { id: { in: targets } } });
    const accounts = converted.map((t) => t.converted_account_id).filter((id): id is string => !!id);
    await prismadb.crm_campaign_sends.deleteMany({ where: { target_id: { in: targets } } });
    await prismadb.crm_Targets.deleteMany({ where: { id: { in: targets } } });
    await prismadb.crm_Opportunities.deleteMany({ where: { account: { in: accounts } } });
    await prismadb.crm_Contacts.deleteMany({ where: { accountsIDs: { in: accounts } } });
    await prismadb.crm_Accounts.deleteMany({ where: { id: { in: accounts } } });
    await prismadb.crm_campaign_steps.deleteMany({ where: { template_id: TEMPLATE } });
    await prismadb.crm_campaign_templates.deleteMany({ where: { id: TEMPLATE } });
  });

  it.each(CASES.map((c, i) => [...c, i] as const))("%s", async (_name, owner, _sends, credited, i) => {
    as(owner);
    const res = await convertTargetToDeal(targets[i]);
    if (!("opportunityId" in res)) throw new Error(`convert failed: ${JSON.stringify(res)}`);
    const opp = await prismadb.crm_Opportunities.findUnique({ where: { id: res.opportunityId } });
    expect(opp?.campaign).toBe(credited ? C[credited] : null);
  });
});

// Plugins write opportunities through the data API (no user, admin-installed).
// Pavel 2026-11-03: they may not link a deleted campaign, by either marker;
// no user scope applies. Same rule as the UI actions since 0.37.12.
describe("plugin data API opportunity campaign (createDataApi)", () => {
  const api = createDataApi(`cdm-plugin-${tag}`, ["opportunities:read", "opportunities:write"]);
  const send = inngest.send as jest.Mock;
  const byName = async (name: string) => api.opportunities.find({ where: { name } });

  beforeEach(() => send.mockReset().mockResolvedValue(undefined));

  const laterDeleted = randomUUID();

  afterAll(async () => {
    await prismadb.crm_Opportunities.deleteMany({ where: { name: { contains: `cdm-opp-${tag}` } } });
    await prismadb.crm_campaigns.deleteMany({ where: { id: laterDeleted } });
  });

  it.each(["normal", "nullStatus"] as const)("create links a %s campaign", async (k) => {
    const row = await api.opportunities.create({ name: `cdm-opp-${tag}-create-${k}`, campaign: C[k] });
    expect((await api.opportunities.get(row.id as string))?.campaign).toBe(C[k]);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it.each(["uiDeleted", "mcpDeleted"] as const)("create with a %s campaign is refused, nothing written, no event", async (k) => {
    const name = `cdm-opp-${tag}-create-${k}`;
    await expect(api.opportunities.create({ name, campaign: C[k] })).rejects.toThrow(`Invalid campaign: ${C[k]}`);
    expect(await byName(name)).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it("update changing the campaign to a deleted one is refused and leaves the row unchanged", async () => {
    const row = await api.opportunities.create({ name: `cdm-opp-${tag}-move`, campaign: C.normal });
    send.mockClear();
    for (const k of ["uiDeleted", "mcpDeleted"] as const) {
      await expect(api.opportunities.update(row.id as string, { name: "renamed", campaign: C[k] })).rejects.toThrow(`Invalid campaign: ${C[k]}`);
    }
    expect(await api.opportunities.get(row.id as string)).toMatchObject({ name: `cdm-opp-${tag}-move`, campaign: C.normal });
    expect(send).not.toHaveBeenCalled();
  });

  it("update re-sending the stored campaign works after that campaign was deleted", async () => {
    await prismadb.crm_campaigns.create({ data: { id: laterDeleted, name: `later-${tag}`, status: "sent", v: 0, created_by: U.creator } });
    const row = await api.opportunities.create({ name: `cdm-opp-${tag}-resend`, campaign: laterDeleted });
    await prismadb.crm_campaigns.update({ where: { id: laterDeleted }, data: { status: "deleted" } });
    await api.opportunities.update(row.id as string, { name: `cdm-opp-${tag}-resend-2`, campaign: laterDeleted });
    expect(await api.opportunities.get(row.id as string)).toMatchObject({ name: `cdm-opp-${tag}-resend-2`, campaign: laterDeleted });
  });

  it("update without a campaign runs no campaign lookup", async () => {
    const row = await api.opportunities.create({ name: `cdm-opp-${tag}-plain` });
    const spy = jest.spyOn(prismadb.crm_campaigns, "findFirst");
    await api.opportunities.update(row.id as string, { name: `cdm-opp-${tag}-plain-2` });
    await api.opportunities.update(row.id as string, { campaign: null });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  // data goes to Prisma as is, so the relation and operator forms must not slip past the id check.
  it("create linking a deleted campaign through the relation is refused, nothing written, no event", async () => {
    const name = `cdm-opp-${tag}-connect`;
    await expect(
      api.opportunities.create({ name, assigned_campaings: { connect: { id: C.uiDeleted } } }),
    ).rejects.toThrow("Invalid campaign");
    expect(await byName(name)).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it("update setting a deleted campaign with { set } is refused and leaves the row unchanged", async () => {
    const row = await api.opportunities.create({ name: `cdm-opp-${tag}-set`, campaign: C.normal });
    send.mockClear();
    await expect(api.opportunities.update(row.id as string, { campaign: { set: C.mcpDeleted } })).rejects.toThrow("Invalid campaign");
    expect((await api.opportunities.get(row.id as string))?.campaign).toBe(C.normal);
    expect(send).not.toHaveBeenCalled();
  });
});
